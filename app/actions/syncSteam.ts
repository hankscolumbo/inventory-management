// app/actions/syncSteam.ts
'use server';

import { auth } from '@/app/api/auth/[...nextauth]/route';
import { prisma } from '@/lib/prisma';
import { revalidatePath } from 'next/cache';

// Helper: Fetch Twitch Access Token
async function getTwitchToken(clientId: string, clientSecret: string) {
    const tokenRes = await fetch(
        `https://id.twitch.tv/oauth2/token?client_id=${clientId}&client_secret=${clientSecret}&grant_type=client_credentials`,
        { method: 'POST', cache: 'no-store' }
    );
    const tokenData = await tokenRes.json();
    return tokenData.access_token || null;
}

// Helper: Batch lookup IGDB IDs for multiple steam app ids in one request
async function getIgdbIdsForSteamApps(
    steamAppIds: number[],
    clientId: string,
    accessToken: string
): Promise<Record<number, number>> {
    if (steamAppIds.length === 0) return {};

    try {
        // Format array into IGDB batch string: ("1091500", etc)
        const formattedUids = steamAppIds.map((id) => `"${id}"`).join(',');

        const res = await fetch('https://api.igdb.com/v4/external_games', {
            method: 'POST',
            headers: {
                'Client-ID': clientId,
                'Authorization': `Bearer ${accessToken}`,
                'Content-Type': 'text/plain',
            },
            cache: 'no-store',
            body: `fields uid, game.id; where uid = (${formattedUids}) & external_game_source = 1; limit 500;`,
        });

        const data = await res.json();
        const map: Record<number, number> = {};

        if (Array.isArray(data)) {
            data.forEach((item: any) => {
                if (item.uid && item.game?.id) {
                    map[Number(item.uid)] = Number(item.game.id);
                }
            });
        }
        return map;
    } catch (error) {
        console.error('Error batch fetching IGDB IDs:', error);
        return {};
    }
}

export async function syncSteamGames() {
    try {
        const session = await auth();
        const userEmail = session?.user?.email;

        if (!userEmail) {
            return { success: false, error: 'Unauthenticated. Please sign in.' };
        }

        const user = await prisma.user.findUnique({
            where: { email: userEmail },
        });

        if (!user || !user.steamId) {
            return { success: false, error: 'No linked Steam ID Found.' };
        }

        // Fetch games from Steam API
        const TWITCH_CLIENT_ID = process.env.TWITCH_CLIENT_ID?.trim();
        const TWITCH_CLIENT_SECRET = process.env.TWITCH_CLIENT_SECRET?.trim();

        const STEAM_API_KEY = process.env.STEAM_API_KEY;
        if (!STEAM_API_KEY || !TWITCH_CLIENT_ID || !TWITCH_CLIENT_SECRET) {
            return { success: false, error: 'STEAM or TWITCH environment variables are missing' };
        }

        const SteamRes = await fetch(
            `https://api.steampowered.com/IPlayerService/GetOwnedGames/v1/?key=${process.env.STEAM_API_KEY}&steamid=${user.steamId}&include_appinfo=true&format=json`
        );

        if (!SteamRes.ok) {
            console.error('Steam API Response Error:', await SteamRes.text());
            return { success: false, error: 'Failed to fetch games from Steam API.' };
        }

        const steamData = await SteamRes.json();
        const steamGames = steamData.response?.games || [];

        // TEMPORARY FILTER - ONLY SYNC GAMES WITH > 0 MINUTES PLAYED
        const playedGames = steamGames.filter(
            (game: { playtime_forever?: number }) => (game.playtime_forever || 0) > 0
        );

        if (playedGames.length === 0) {
            return { success: true, count: 0, message: 'No played games found in Steam account.' };
        }

        console.log('Syncing ${playedGames.length} Steam games for user ${user.id}...');

        const twitchToken = await getTwitchToken(TWITCH_CLIENT_ID, TWITCH_CLIENT_SECRET);

        // Execute in batch chunks of 30 to prevent database connection timeout
        const CHUNK_SIZE = 30;
        let savedCount = 0;

        for (let i = 0; i < playedGames.length; i += CHUNK_SIZE) {
            const chunk = playedGames.slice(i, i + CHUNK_SIZE);
            const chunkAppIds = chunk.map((g: any) => Number(g.appid));

            // Perform one batch request per chunk to resolve IGDB IDs
            let igdbMap: Record<number, number> = {};
            if (twitchToken) {
                igdbMap = await getIgdbIdsForSteamApps(chunkAppIds, TWITCH_CLIENT_ID, twitchToken);
            }

            // Map ONLY the active chunk into database upserts
            const upsertOperations = playedGames.map((game: any) => {
                const appId = Number(game.appid);
                const gameTitle = game.name || 'Steam App ${appId}';
                const coverUrl = `https://cdn.cloudflare.steamstatic.com/steam/apps/${appId}/library_600x900.jpg`;

                // Deremine status based on playtime
                const playtimeMinutes = game.playtime_forever || 0;
                const playtimeHours = Number((playtimeMinutes / 60).toFixed(1));
                const status = playtimeMinutes > 0 ? 'PLAYED' : 'BACKLOG';
                const resolvedIgdbId = igdbMap[appId] || null;

                return prisma.gameLog.upsert({
                    where: {
                        userId_externalGameId: {
                            userId: user.id,
                            externalGameId: appId,
                        },
                    },
                    update: {
                        gameTitle,
                        coverUrl,
                        steamAppId: appId,
                        playtimeHours,
                        ...(resolvedIgdbId ? { igdbId: resolvedIgdbId } : {}),
                    },
                    create: {
                        userId: user.id,
                        externalGameId: appId,
                        gameTitle: gameTitle,
                        coverUrl: coverUrl,
                        status: status,
                        steamAppId: appId,
                        playtimeHours: playtimeHours,
                        igdbId: resolvedIgdbId,
                    },
                });
            });

            // Execute current batch concurrently without connection pool overload
            await Promise.all(upsertOperations);
            savedCount += chunk.length;
        }

        console.log('Successfully stored ${saveCount} Steam games in the Neon DB');

        revalidatePath('/profile');
        return { success: true, count: savedCount };
    } catch (error) {
        console.error('Error saving Steam sync to database:', error);
        return { success: false, error: 'Database transaction failed during sync.' };
    }
}