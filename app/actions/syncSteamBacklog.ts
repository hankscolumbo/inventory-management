// app/actions/syncSteamBacklog.ts
'use server';

import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { revalidatePath } from 'next/cache';

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

function sanitizeTitle(title: string): string {
  return title
    .replace(/[™®©]/g, '')
    .replace(/['"']/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Fetches the official store header image directly from Steam's appdetails API.
 */
async function fetchSteamStoreHeader(appId: number): Promise<string | null> {
  try {
    const res = await fetch(
      `https://store.steampowered.com/api/appdetails?appids=${appId}`,
      { cache: 'no-store' }
    );
    if (!res.ok) return null;
    const data = await res.json();
    const appData = data[String(appId)];
    if (appData?.success && appData?.data?.header_image) {
      return appData.data.header_image;
    }
  } catch {
    // API request error fallback
  }
  return null;
}

/**
 * Resolves a verified cover URL via IGDB -> Steam Vertical Capsule -> Steam Store Details API -> HTTPS Community Icon.
 */
async function getVerifiedSteamCoverUrl(
  appId: number,
  igdbCoverUrl?: string | null,
  iconHash?: string | null
): Promise<string> {
  // 1. Prefer high-quality IGDB cover if available
  if (igdbCoverUrl && igdbCoverUrl.trim() !== '') {
    return igdbCoverUrl;
  }

  // 2. Test high-res vertical capsule
  const verticalCapsule = `https://shared.akamai.steamstatic.com/store_item_assets/steam/apps/${appId}/library_600x900_2x.jpg`;
  try {
    const res = await fetch(verticalCapsule, {
      method: 'GET',
      headers: { Range: 'bytes=0-100' },
      cache: 'no-store',
    });
    const contentType = res.headers.get('content-type') || '';
    if ((res.status === 200 || res.status === 206) && contentType.startsWith('image/')) {
      return verticalCapsule;
    }
  } catch {
    // Fall through if capsule doesn't exist
  }

  // 3. Query Official Steam Store API for the exact store header asset URL
  const officialHeader = await fetchSteamStoreHeader(appId);
  if (officialHeader) {
    return officialHeader;
  }

  // 4. Fail-safe: Steam Community App Icon (uses HTTPS to prevent browser mixed content blocks)
  if (iconHash && iconHash.trim() !== '') {
    return `https://media.steampowered.com/steamcommunity/public/assets/apps/${appId}/${iconHash}.jpg`;
  }

  return `https://shared.akamai.steamstatic.com/store_item_assets/steam/apps/${appId}/header.jpg`;
}

async function searchIgdbByTitle(
  title: string,
  clientId: string,
  accessToken: string
): Promise<{ igdbId: number; name: string; coverUrl: string } | null> {
  const cleanTitle = sanitizeTitle(title);
  if (!cleanTitle) return null;

  try {
    const res = await fetch('https://api.igdb.com/v4/games', {
      method: 'POST',
      headers: {
        'Client-ID': clientId,
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'text/plain',
      },
      cache: 'no-store',
      body: `fields id, name, cover.url; search "${cleanTitle}"; limit 1;`,
    });

    if (!res.ok) return null;
    const games = await res.json();
    if (!Array.isArray(games) || games.length === 0) return null;

    const game = games[0];
    const rawCover = game.cover?.url;
    const coverUrl = rawCover ? `https:${rawCover.replace('t_thumb', 't_1080p')}` : '';

    return {
      igdbId: Number(game.id),
      name: game.name,
      coverUrl,
    };
  } catch (error) {
    console.error(`IGDB title fallback search failed for ${title}:`, error);
    return null;
  }
}

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
        const coverUrl = rawCover ? `https:${rawCover.replace('t_thumb', 't_1080p')}` : '';
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
          coverUrl: details.coverUrl,
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

    const backlogGames = steamGames.filter(
      (game: { playtime_forever?: number }) => (game.playtime_forever || 0) < 1
    );

    if (backlogGames.length === 0) {
      return { success: true, count: 0, message: 'No backlog games found on Steam.' };
    }

    const twitchToken = await getTwitchToken(TWITCH_CLIENT_ID, TWITCH_CLIENT_SECRET);

    const existingLogs = await prisma.gameLog.findMany({
      where: { userId: user.id },
      select: { id: true, steamAppId: true, igdbId: true, coverUrl: true },
    });

    const steamToLogMap = new Map<number, string>();
    const igdbToLogMap = new Map<number, string>();

    for (const log of existingLogs) {
      if (log.steamAppId !== null) {
        steamToLogMap.set(Number(log.steamAppId), log.id);
      }
      if (log.igdbId !== null) {
        igdbToLogMap.set(Number(log.igdbId), log.id);
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
        const rawName = game.name ? String(game.name) : `Steam App ${appId}`;
        const iconHash = game.img_icon_url ? String(game.img_icon_url) : null;

        let igdbInfo = igdbDetailsMap[appId];

        if (!igdbInfo && twitchToken) {
          const fallback = await searchIgdbByTitle(rawName, TWITCH_CLIENT_ID, twitchToken);
          if (fallback) {
            igdbInfo = fallback;
          }
        }

        const gameTitle = igdbInfo?.name || rawName;
        const candidateIgdbId = igdbInfo?.igdbId ? Number(igdbInfo.igdbId) : null;

        let existingLogId = steamToLogMap.get(appId);
        if (!existingLogId && candidateIgdbId !== null) {
          existingLogId = igdbToLogMap.get(candidateIgdbId);
        }

        let safeIgdbId: number | null = null;
        if (candidateIgdbId !== null) {
          const currentOwnerId = igdbToLogMap.get(candidateIgdbId);
          if (!currentOwnerId || currentOwnerId === existingLogId) {
            safeIgdbId = candidateIgdbId;
          }
        }

        const verifiedCoverUrl = await getVerifiedSteamCoverUrl(
          appId,
          igdbInfo?.coverUrl,
          iconHash
        );

        if (existingLogId) {
          await prisma.gameLog.update({
            where: { id: existingLogId },
            data: {
              gameTitle,
              coverUrl: verifiedCoverUrl,
              steamAppId: appId,
              isOwned: true,
              status: 'WANT TO PLAY',
              substatus: 'BACKLOG',
              playedOn: null,
              ...(safeIgdbId !== null ? { igdbId: safeIgdbId } : {}),
            },
          });

          steamToLogMap.set(appId, existingLogId);
          if (safeIgdbId !== null) {
            igdbToLogMap.set(safeIgdbId, existingLogId);
          }
        } else {
          const newLog = await prisma.gameLog.create({
            data: {
              userId: user.id,
              steamAppId: appId,
              gameTitle,
              coverUrl: verifiedCoverUrl,
              playtimeHours: 0,
              status: 'WANT TO PLAY',
              substatus: 'BACKLOG',
              isOwned: true,
              igdbId: safeIgdbId,
              platforms: ['STEAM'],
              playedOn: null,
              psnTitleIds: [],
            },
          });

          steamToLogMap.set(appId, newLog.id);
          if (safeIgdbId !== null) {
            igdbToLogMap.set(safeIgdbId, newLog.id);
          }
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


