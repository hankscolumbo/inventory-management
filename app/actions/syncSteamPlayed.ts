// app/actions/syncSteamPlayed.ts
'use server';

import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { revalidatePath } from 'next/cache';

// Helper: Safely parse Steam Unix timestamp (seconds) into a JS Date object
function parseSteamDate(rtime?: number): Date | null {
  if (!rtime || rtime <= 0) return null;
  const d = new Date(rtime * 1000);
  return isNaN(d.getTime()) ? null : d;
}

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
    const formattedUids = steamAppIds.map((id) => `"${id}"`).join(',');

    const extRes = await fetch('https://api.igdb.com/v4/external_games', {
      method: 'POST',
      headers: {
        'Client-ID': clientId,
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'text/plain',
      },
      cache: 'no-store',
      body: `fields uid, game; where uid = (${formattedUids}) & external_game_source = 1; limit 500;`,
    });

    const extData = await extRes.json();
    if (!Array.isArray(extData) || extData.length === 0) return {};

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
        const rawCover = game.cover?.url;
        const coverUrl = rawCover
          ? `https:${rawCover.replace('t_thumb', 't_1080p')}`
          : '';
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

export async function syncSteamPlayedGames() {
  try {
    const session = await auth();
    const userId = session?.user?.id;
    const userEmail = session?.user?.email;

    if (!session || (!userId && !userEmail)) {
      return { success: false, error: 'Unauthenticated. Please sign in.' };
    }

    const user = await prisma.user.findFirst({
      where: {
        OR: [
          ...(userId ? [{ id: userId }] : []),
          ...(userEmail ? [{ email: userEmail }] : []),
        ],
      },
    });

    if (!user || !user.steamId) {
      return { success: false, error: 'No linked Steam ID Found.' };
    }

    const STEAM_API_KEY = process.env.STEAM_API_KEY;
    const TWITCH_CLIENT_ID = process.env.TWITCH_CLIENT_ID?.trim();
    const TWITCH_CLIENT_SECRET = process.env.TWITCH_CLIENT_SECRET?.trim();

    if (!STEAM_API_KEY || !TWITCH_CLIENT_ID || !TWITCH_CLIENT_SECRET) {
      return { success: false, error: 'STEAM or TWITCH environment variables are missing' };
    }

    const SteamRes = await fetch(
      `https://api.steampowered.com/IPlayerService/GetOwnedGames/v1/?key=${STEAM_API_KEY}&steamid=${user.steamId}&include_appinfo=true&include_played_free_games=true&format=json`
    );

    if (!SteamRes.ok) {
      console.error('Steam API Response Error:', await SteamRes.text());
      return { success: false, error: 'Failed to fetch games from Steam API.' };
    }

    const steamData = await SteamRes.json();
    const steamGames = steamData.response?.games || [];

    const playedGames = steamGames.filter(
      (game: { playtime_forever?: number }) => (game.playtime_forever || 0) > 0
    );

    if (playedGames.length === 0) {
      return { success: true, count: 0, message: 'No games found on Steam.' };
    }

    const twitchToken = await getTwitchToken(TWITCH_CLIENT_ID, TWITCH_CLIENT_SECRET);

    const CHUNK_SIZE = 30;
    let savedCount = 0;

    for (let i = 0; i < playedGames.length; i += CHUNK_SIZE) {
      const chunk = playedGames.slice(i, i + CHUNK_SIZE);
      const chunkAppIds = chunk.map((g: any) => Number(g.appid));

      let igdbDetailsMap: Record<number, { igdbId: number; name: string; coverUrl: string | null }> = {};

      if (twitchToken) {
        igdbDetailsMap = await getIgdbIdsForSteamApps(chunkAppIds, TWITCH_CLIENT_ID, twitchToken);
      }

      const upsertOperations = chunk.map(async (game: any) => {
        const appId = Number(game.appid);
        const igdbInfo = igdbDetailsMap[appId];

        const gameTitle =
          igdbInfo?.name ||
          (game.name || !game.name?.startsWith('Steam App') ? game.name : null) ||
          `Steam App ${appId}`;

        const coverUrl =
          igdbInfo?.coverUrl ||
          `https://cdn.cloudflare.steamstatic.com/steam/apps/${appId}/library_600x900.jpg`;

        const rawMinutes = typeof game.playtime_forever === 'number' ? game.playtime_forever : 0;
        const playtimeHours = Number((rawMinutes / 60).toFixed(1));

        // Parse Steam's rtime_last_played (Unix timestamp in seconds)
        const steamPlayedOn = parseSteamDate(game.rtime_last_played);

        const resolvedIgdbId = igdbInfo?.igdbId ? Number(igdbInfo.igdbId) : null;

        const conditions: ({ steamAppId: number } | { igdbId: number })[] = [
          { steamAppId: appId },
        ];
        if (resolvedIgdbId) {
          conditions.push({ igdbId: resolvedIgdbId });
        }

        const existingLog = await prisma.gameLog.findFirst({
          where: {
            userId: user.id,
            OR: conditions,
          },
        });

        if (existingLog) {
          // Compare and keep whichever date is newest (or retain existing date if Steam date is null)
          let finalPlayedOn = existingLog.playedOn;

          if (steamPlayedOn) {
            if (!existingLog.playedOn || new Date(steamPlayedOn) > new Date(existingLog.playedOn)) {
              finalPlayedOn = steamPlayedOn;
            }
          }

          return prisma.gameLog.update({
            where: { id: existingLog.id },
            data: {
              gameTitle,
              coverUrl,
              playtimeHours: Math.max(existingLog.playtimeHours ?? 0, playtimeHours),
              steamAppId: appId,
              playedOn: finalPlayedOn,
              isOwned: true,
              ...(resolvedIgdbId ? { igdbId: resolvedIgdbId } : {}),
            },
          });
        } else {
          return prisma.gameLog.create({
            data: {
              userId: user.id,
              steamAppId: appId,
              gameTitle,
              coverUrl,
              status: 'PLAYED',
              isOwned: true,
              igdbId: resolvedIgdbId,
              playtimeHours,
              playedOn: steamPlayedOn,
            },
          });
        }
      });

      await Promise.all(upsertOperations);
      savedCount += chunk.length;
    }

    console.log(`Successfully stored ${savedCount} Steam games in the DB`);

    if (user.username) {
      revalidatePath('/u/' + user.username);
    }
    return { success: true, count: savedCount };
  } catch (error) {
    console.error('Error saving Steam sync to database:', error);
    return { success: false, error: 'Database transaction failed during sync.' };
  }
}

