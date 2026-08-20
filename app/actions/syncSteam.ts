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
): Promise<Record<number, { igdbId: number; name: string; coverUrl: string }>> {
    if (steamAppIds.length === 0) return {};

    try {
        // Format array into IGDB batch string: ("1091500", etc)
        const formattedUids = steamAppIds.map((id) => `"${id}"`).join(',');

        const extRes = await fetch('https://api.igdb.com/v4/external_games', {
            method: 'POST',
            headers: {
                'Client-ID': clientId,
                'Authorization': `Bearer ${accessToken}`,
                'Content-Type': 'text/plain',
            },
            cache: 'no-store',
            body: `fields uid, game; where uid = (${formattedUids}) & category = 1; limit 500;`,
        });

        const extData = await extRes.json();
        if (!Array.isArray(extData) || extData.length === 0) return {};

        // Map Steam App Id -> IGDB Game Id
        const appIdToIgdbIdMap: Record<number, number> = {};
        const igdbIdsToFetch: number[] = [];

        extData.forEach((item: any) => {
            const appId = Number(item.uid);
            const rawGame = item.game;
            const igdbId = typeof rawGame === 'object' ? rawGame?.id : Number(rawGame);

            if (appId && igdbId) {
                appIdToIgdbIdMap[appId] = igdbId;
                igdbIdsToFetch.push(igdbId);
            }
        });

        if (igdbIdsToFetch.length === 0) return {};

        // Fetch Titles and cover urls directly from IGDB / games endpoint
        const gamesRes = await fetch('https://api.igdb.com/v4/games', {
            method: 'POST',
            headers: {
                'Client-ID': clientId,
                'Authorization': `Bearer ${accessToken}`,
                'Content-Type': 'text/plain',
            },
            cache: 'no-store',
            body: `fields name, cover.url; where id = (${igdbIdsToFetch.join(',')}); limit 500;`,
        });

        const gamesData = await gamesRes.json();
        const igdbGameDetailsMap: Record<number, { name: string; coverUrl: string }> = {};

        if (Array.isArray(gamesData)) {
            gamesData.forEach((game: any) => {
                //if (game.uid && game.game) {
                //const appId = Number(game.uid);
                const rawCover = game.cover?.url;
                const coverUrl = rawCover
                    ? `https:${rawCover.replace('t_thumb', 't_1080p')}`
                    : '';
                //: `https://cdn.cloudflare.steamstatic.com/steam/apps/${appId}/library_600x900.jpg`;
                igdbGameDetailsMap[Number(game.id)] = {
                    name: game.name,
                    coverUrl,
                };
            });
        }

        const finalMap: Record<number, { igdbId: number; name: string; coverUrl: string }> = {};

        Object.entries(appIdToIgdbIdMap).forEach(([appIdStr, igdbId]) => {
            const appId = Number(appIdStr);
            const details = igdbGameDetailsMap[igdbId];

            if (details) {
                finalMap[appId] = {
                    igdbId: Number(igdbId),
                    name: details.name,
                    coverUrl:
                        details.coverUrl ||
                        `https://cdn.cloudflare.steamstatic.com/steam/apps/${appId}/library_600x900.jpg`,
                };
            }
        });

        return finalMap;
    } catch (error) {
        console.error('Error batch fetching IGDB details:', error);
        return {};
    }
}

/* Fetch Wishlist App IDs from Steam

async function getSteamWishlist(steamId: string, apiKey: string) {
    try {
        // 1. Fetch wishlist from Steam's Web API
        const url = `https://api.steampowered.com/IWishlistService/GetWishlist/v1/?key=${apiKey}&steamid=${steamId}`;

        const res = await fetch(url, { cache: 'no-store' });

        if (!res.ok) {
            console.warn(`[Steam Wishlist API] HTTP ${res.status} returned from Steam API.`);
            return [];
        }

        // 2. Guard: Verify response is JSON before parsing to prevent HTML crash
        const contentType = res.headers.get('content-type');
        if (!contentType || !contentType.includes('application/json')) {
            console.warn(
                '[Steam Wishlist API] Steam returned HTML instead of JSON. Wishlist may be restricted or private.'
            );
            return [];
        }

        const data = await res.json();
        const items = data?.response?.items || [];

        if (!Array.isArray(items) || items.length === 0) {
            console.log('[Steam Wishlist API] No wishlist items found or user wishlist is private.');
            return [];
        }

        // 3. Extract items
        const wishlistItems = items.map((item: any) => ({
            appid: Number(item.appid),
            name: '',
        }));

        console.log(`[Steam Wishlist API] Successfully fetched ${wishlistItems.length} items.`);
        return wishlistItems;
    } catch (error) {
        console.error('[Steam Wishlist API] Error:', error);
        return [];
    }
}

// Helper: Batch resolve missing game titles from Steam Store API
 async function fetchSteamStoreTitles(appIds: number[]): Promise<Record<number, string>> {
    if (appIds.length === 0) return {};
    const titlesMap: Record<number, string> = {};

    // Fetch concurrently in small batches to avoid rate limits
    await Promise.all(
        appIds.map(async (appId) => {
            try {
                const res = await fetch(
                    `https://store.steampowered.com/api/appdetails?appids=${appId}&filters=basic`,
                    { cache: 'no-store' }
                );
                if (res.ok) {
                    const data = await res.json();
                    if (data?.[appId]?.success && data[appId].data?.name) {
                        titlesMap[appId] = data[appId].data.name;
                    }
                }
            } catch (e) {
                // Fallback silently if Steam API limits
            }
        })
    );

    return titlesMap;
}
*/
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
        const STEAM_API_KEY = process.env.STEAM_API_KEY;
        const TWITCH_CLIENT_ID = process.env.TWITCH_CLIENT_ID?.trim();
        const TWITCH_CLIENT_SECRET = process.env.TWITCH_CLIENT_SECRET?.trim();

        if (!STEAM_API_KEY || !TWITCH_CLIENT_ID || !TWITCH_CLIENT_SECRET) {
            return { success: false, error: 'STEAM or TWITCH environment variables are missing' };
        }

        const SteamRes = await fetch(
            `https://api.steampowered.com/IPlayerService/GetOwnedGames/v1/?key=${STEAM_API_KEY}&steamid=${user.steamId}&include_appinfo=true&format=json`
        );

        if (!SteamRes.ok) {
            console.error('Steam API Response Error:', await SteamRes.text());
            return { success: false, error: 'Failed to fetch games from Steam API.' };
        }

        const steamData = SteamRes.ok ? await SteamRes.json() : {};
        const steamGames = steamData.response?.games || [];

        // FILTER - ONLY SYNC GAMES WITH > 0 MINUTES PLAYED
        const playedGames = steamGames.filter(
            (game: { playtime_forever?: number }) => (game.playtime_forever || 0) > 0
        );

        /* Fetch Wishlist games from Steam Store API
        const wishlistGames = await getSteamWishlist(user.steamId, STEAM_API_KEY);
        console.log(`[Steam Sync] Found ${playedGames.length} played games and ${wishlistGames.length} wishlist items.`);

        // Filter out games that the user already owns/has played
        const playedAppIds = new Set(playedGames.map((g: any) => Number(g.appid)));
        const uniqueWishlistGames = wishlistGames.filter(
            (g) => !playedAppIds.has(g.appid)
        );
        // Combine both lists
        const allGamesToSync = [
            ...playedGames.map((g: any) => ({
                appid: Number(g.appid),
                name: g.name || '',
                playtimeMinutes: g.playtime_forever || 0,
                isWishlist: false,
            })),
            ...uniqueWishlistGames.map((g) => ({
                appid: g.appid,
                name: '',
                playtimeMinutes: 0,
                isWishlist: true,
            })),
        ];
        */
        const allGamesToSync = playedGames;
        if (allGamesToSync.length === 0) {
            return { success: true, count: 0, message: 'No games found.' };
        }
        
        const twitchToken = await getTwitchToken(TWITCH_CLIENT_ID, TWITCH_CLIENT_SECRET);

        // Execute in batch chunks of 30 to prevent database connection timeout
        const CHUNK_SIZE = 30;
        let savedCount = 0;

        for (let i = 0; i < allGamesToSync.length; i += CHUNK_SIZE) {
            const chunk = allGamesToSync.slice(i, i + CHUNK_SIZE);
            const chunkAppIds = chunk.map((g: any) => Number(g.appid));

            // Perform one batch request per chunk to resolve IGDB IDs
            let igdbDetailsMap: Record<number, { igdbId: number; name: string; coverUrl: string | null }> = {};
            
            if (twitchToken) {
                igdbDetailsMap = await getIgdbIdsForSteamApps(chunkAppIds, TWITCH_CLIENT_ID, twitchToken);
            }

            // Map ONLY the active chunk into database upserts
            const upsertOperations = chunk.map((game: any) => {
                const appId = game.appid;
                const igdbInfo = igdbDetailsMap[appId];

                // If IGDB resolved the title, use it. otherwise use steam api name or fallback
                const gameTitle = igdbInfo?.name || (game.name || !game.name.startsWith('Steam App') ? game.name : null) || `Steam App ${appId}`;
                const coverUrl =
                    igdbInfo?.coverUrl ||
                    `https://cdn.cloudflare.steamstatic.com/steam/apps/${appId}/library_600x900.jpg`;

                // Deremine status based on playtime
                const playtimeHours = Number((game.playtimeMinutes / 60).toFixed(1));
                const targetStatus = game.isWishlist ? 'WANT TO PLAY' : 'PLAYED';
                const resolvedIgdbId = igdbInfo?.igdbId || null;

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
                        status: targetStatus,
                        ...(!game.isWishlist ? { status: 'PLAYED' } : {}),
                        ...(resolvedIgdbId ? { igdbId: resolvedIgdbId } : {}),
                    },
                    create: {
                        userId: user.id,
                        externalGameId: appId,
                        gameTitle,
                        coverUrl,
                        status: targetStatus,
                        steamAppId: appId,
                        playtimeHours,
                        igdbId: resolvedIgdbId,
                    },
                });
            });

            // Execute current batch concurrently without connection pool overload
            await Promise.all(upsertOperations);
            savedCount += chunk.length;
        }

        console.log(`Successfully stored ${savedCount} Steam games in the Neon DB`);

        revalidatePath('/u/' + user.username);
        return { success: true, count: savedCount };
    } catch (error) {
        console.error('Error saving Steam sync to database:', error);
        return { success: false, error: 'Database transaction failed during sync.' };
    }
}