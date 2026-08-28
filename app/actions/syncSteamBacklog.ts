// app/actions/syncSteamBacklog.ts
'use server';

import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { revalidatePath } from 'next/cache';

// Helper: Fetch Twitch Access Token
async function getTwitchToken(clientId: string, clientSecret: string): Promise<string | null> {
  try {
    const tokenRes = await fetch(
      `https://id.twitch.tv/oauth2/token?client_id=${clientId}&client_secret=${clientSecret}&grant_type=client_credentials`,
      { method: 'POST', cache: 'no-store' }
    );
    if (!tokenRes.ok) return null;
    const tokenData = await tokenRes.json();
    return tokenData.access_token || null;
  } catch (error) {
    console.error('Failed to fetch Twitch token:', error);
    return null;
  }
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

    // category = 1 corresponds to Steam in IGDB external_games
    const extRes = await fetch('https://api.igdb.com/v4/external_games', {
      method: 'POST',
      headers: {
        'Client-ID': clientId,
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'text/plain',
      },
      cache: 'no-store',
      body: `fields uid, game, category; where uid = (${formattedUids}) & category = 1; limit 500;`,
    });

    if (!extRes.ok) return {};
    const extData = await extRes.json();
    if (!Array.isArray(extData) || extData.length === 0) return {};

    const appIdToIgdbIdMap: Record<number, number> = {};
    const igdbIdsToFetch = new Set<number>();

    extData.forEach((item: any) => {
      const appId = Number(item.uid);
      const rawGame = item.game;
      const igdbId = typeof rawGame === 'object' ? Number(rawGame?.id) : Number(rawGame);

      if (appId && igdbId) {
        appIdToIgdbIdMap[appId] = igdbId;
        igdbIdsToFetch.add(igdbId);
      }
    });

    if (igdbIdsToFetch.size === 0) return {};

    // Fetch Titles and cover urls directly from IGDB /games endpoint
    const gamesRes = await fetch('https://api.igdb.com/v4/games', {
      method: 'POST',
      headers: {
        'Client-ID': clientId,
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'text/plain',
      },
      cache: 'no-store',
      body: `fields name, cover.url; where id = (${Array.from(igdbIdsToFetch).join(',')}); limit 500;`,
    });

    if (!gamesRes.ok) return {};
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

export async function syncSteamBacklog() {
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
      `https://api.steampowered.com/IPlayerService/GetOwnedGames/v1/?key=${STEAM_API_KEY}&steamid=${user.steamId}&include_appinfo=true&include_played_free_games=true&format=json`,
      { cache: 'no-store' }
    );

    if (!SteamRes.ok) {
      console.error('Steam API Response Error:', await SteamRes.text());
      return { success: false, error: 'Failed to fetch games from Steam API.' };
    }

    const steamData = await SteamRes.json();
    const steamGames = steamData.response?.games || [];

    // Filter games with 0 playtime
    const backlogGames = steamGames.filter(
      (game: { playtime_forever?: number }) => (game.playtime_forever || 0) < 1
    );

    if (backlogGames.length === 0) {
      return { success: true, count: 0, message: 'No backlog games found on Steam.' };
    }

    const twitchToken = await getTwitchToken(TWITCH_CLIENT_ID, TWITCH_CLIENT_SECRET);

    // Load existing user logs into memory once to prevent unique constraint collisions
    const existingLogs = await prisma.gameLog.findMany({
      where: { userId: user.id },
      select: { id: true, steamAppId: true, igdbId: true },
    });

    const steamToLogMap = new Map<number, { id: string; igdbId: number | null }>();
    const takenSteamAppIds = new Set<number>();
    const takenIgdbIds = new Set<number>();

    for (const log of existingLogs) {
      if (log.steamAppId !== null) {
        const appIdNum = Number(log.steamAppId);
        steamToLogMap.set(appIdNum, {
          id: log.id,
          igdbId: log.igdbId !== null ? Number(log.igdbId) : null,
        });
        takenSteamAppIds.add(appIdNum);
      }
      if (log.igdbId !== null) {
        takenIgdbIds.add(Number(log.igdbId));
      }
    }

    const CHUNK_SIZE = 30;
    let savedCount = 0;

    for (let i = 0; i < backlogGames.length; i += CHUNK_SIZE) {
      const chunk = backlogGames.slice(i, i + CHUNK_SIZE);
      const chunkAppIds = chunk.map((g: any) => Number(g.appid));

      let igdbDetailsMap: Record<number, { igdbId: number; name: string; coverUrl: string }> = {};

      if (twitchToken) {
        igdbDetailsMap = await getIgdbIdsForSteamApps(chunkAppIds, TWITCH_CLIENT_ID, twitchToken);
      }

      for (const game of chunk) {
        const appId = Number(game.appid);
        const igdbInfo = igdbDetailsMap[appId];

        // Safe title parsing to avoid runtime TypeError if game.name is undefined
        const rawName = game.name ? String(game.name) : null;
        const fallbackTitle = rawName && !rawName.startsWith('Steam App') ? rawName : `Steam App ${appId}`;
        const gameTitle = igdbInfo?.name || fallbackTitle;

        const coverUrl =
          igdbInfo?.coverUrl ||
          `https://cdn.cloudflare.steamstatic.com/steam/apps/${appId}/library_600x900.jpg`;

        const candidateIgdbId = igdbInfo?.igdbId ? Number(igdbInfo.igdbId) : null;
        const existingLog = steamToLogMap.get(appId);

        let safeIgdbId: number | null = null;

        // Resolve IGDB ID safely to prevent unique constraint crash across multiple games
        if (candidateIgdbId !== null) {
          if (existingLog?.igdbId === candidateIgdbId) {
            safeIgdbId = candidateIgdbId;
          } else if (!takenIgdbIds.has(candidateIgdbId)) {
            safeIgdbId = candidateIgdbId;
            takenIgdbIds.add(candidateIgdbId);
          }
        }

        if (existingLog) {
          await prisma.gameLog.update({
            where: { id: existingLog.id },
            data: {
              gameTitle,
              coverUrl,
              steamAppId: appId,
              isOwned: true,
              status: 'BACKLOG',
              igdbId: safeIgdbId,
            },
          });
        } else {
          const newLog = await prisma.gameLog.create({
            data: {
              userId: user.id,
              steamAppId: appId,
              gameTitle,
              coverUrl,
              playtimeHours: 0,
              status: 'BACKLOG',
              isOwned: true,
              igdbId: safeIgdbId,
              platforms: ['STEAM'],
            },
          });

          steamToLogMap.set(appId, {
            id: newLog.id,
            igdbId: safeIgdbId,
          });
        }

        savedCount++;
      }
    }

    if (user.username) {
      revalidatePath('/u/' + user.username);
    }
    return { success: true, count: savedCount };
  } catch (error) {
    console.error('Error saving Steam backlog sync to database:', error);
    return { success: false, error: 'Database transaction failed during sync.' };
  }
}