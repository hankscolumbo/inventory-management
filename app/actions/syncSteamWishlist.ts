// app/actions/syncSteamWishlist.ts
'use server';

import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { revalidatePath } from 'next/cache';

async function getTwitchToken(clientId: string, clientSecret: string) {
  try {
    const tokenRes = await fetch(
      `https://id.twitch.tv/oauth2/token?client_id=${clientId}&client_secret=${clientSecret}&grant_type=client_credentials`,
      { method: 'POST', cache: 'no-store' }
    );
    const tokenData = await tokenRes.json();
    return tokenData.access_token || null;
  } catch (e) {
    console.error('[Wishlist Sync] Twitch token error:', e);
    return null;
  }
}

// Chunked query to IGDB for matching Steam App IDs in batches of 40
async function getIgdbDetailsForSteamApps(
  steamAppIds: number[],
  clientId: string,
  accessToken: string
): Promise<Record<number, { igdbId: number; name: string; coverUrl: string | null }>> {
  if (steamAppIds.length === 0) return {};

  const finalMap: Record<number, { igdbId: number; name: string; coverUrl: string | null }> = {};
  const chunkSize = 40; // Avoid payload size limits in IGDB

  for (let i = 0; i < steamAppIds.length; i += chunkSize) {
    const chunk = steamAppIds.slice(i, i + chunkSize);
    const formattedUids = chunk.map((id) => `"${id}"`).join(',');

    try {
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

      if (!extRes.ok) continue;
      const extData = await extRes.json();
      if (!Array.isArray(extData) || extData.length === 0) continue;

      const appIdToIgdbIdMap: Record<number, number> = {};
      const igdbIdsToFetch: number[] = [];

      extData.forEach((item: any) => {
        const appId = Number(item.uid);
        const rawGame = item.game;
        const igdbId = typeof rawGame === 'object' ? Number(rawGame?.id) : Number(rawGame);

        if (appId && !isNaN(igdbId) && igdbId > 0) {
          appIdToIgdbIdMap[appId] = igdbId;
          igdbIdsToFetch.push(igdbId);
        }
      });

      if (igdbIdsToFetch.length === 0) continue;

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

      if (!gamesRes.ok) continue;
      const gamesData = await gamesRes.json();

      if (Array.isArray(gamesData)) {
        const igdbGameDetailsMap: Record<number, { name: string; coverUrl: string | null }> = {};
        gamesData.forEach((game: any) => {
          const rawCover = game.cover?.url;
          const coverUrl = rawCover
            ? `https:${rawCover.replace('t_thumb', 't_1080p')}`
            : null;

          igdbGameDetailsMap[Number(game.id)] = {
            name: game.name,
            coverUrl,
          };
        });

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
      }
    } catch (error) {
      console.error('[Wishlist Sync] IGDB chunk error:', error);
    }
  }

  return finalMap;
}

// Batch Steam Store API lookup
async function batchFetchSteamStoreTitles(missingAppIds: number[]): Promise<Record<number, string>> {
  const titlesMap: Record<number, string> = {};
  if (missingAppIds.length === 0) return titlesMap;

  const chunkSize = 5;
  for (let i = 0; i < missingAppIds.length; i += chunkSize) {
    const chunk = missingAppIds.slice(i, i + chunkSize);

    await Promise.all(
      chunk.map(async (appId) => {
        try {
          const res = await fetch(`https://store.steampowered.com/api/appdetails?appids=${appId}&cc=us&l=en`, {
            cache: 'no-store',
            headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)' },
          });

          if (res.ok) {
            const data = await res.json();
            if (data?.[appId]?.success && data[appId]?.data?.name) {
              titlesMap[appId] = data[appId].data.name;
              return;
            }
          }

          // XML Fallback
          const xmlRes = await fetch(`https://steamcommunity.com/app/${appId}?xml=1`, {
            cache: 'no-store',
            headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)' },
          });

          if (xmlRes.ok) {
            const text = await xmlRes.text();
            const match = text.match(/<appTitle><!\[CDATA\[(.*?)\]\]><\/appTitle>/) || text.match(/<appTitle>(.*?)<\/appTitle>/);
            if (match && match[1]) {
              titlesMap[appId] = match[1].trim();
            }
          }
        } catch {
          // ignore timeouts
        }
      })
    );

    if (i + chunkSize < missingAppIds.length) {
      await new Promise((res) => setTimeout(res, 150));
    }
  }

  return titlesMap;
}

// Single-item fallback lookup for rate-limited or age-gated apps
async function fetchSingleSteamTitle(appId: number): Promise<string | null> {
  try {
    const res = await fetch(`https://store.steampowered.com/api/appdetails?appids=${appId}&cc=us&l=en`, {
      cache: 'no-store',
      headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)' },
    });
    if (res.ok) {
      const data = await res.json();
      if (data?.[appId]?.success && data[appId]?.data?.name) {
        return data[appId].data.name;
      }
    }
  } catch {}

  try {
    const xmlRes = await fetch(`https://steamcommunity.com/app/${appId}?xml=1`, {
      cache: 'no-store',
      headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)' },
    });
    if (xmlRes.ok) {
      const text = await xmlRes.text();
      const match = text.match(/<appTitle><!\[CDATA\[(.*?)\]\]><\/appTitle>/) || text.match(/<appTitle>(.*?)<\/appTitle>/);
      if (match && match[1]) {
        return match[1].trim();
      }
    }
  } catch {}

  return null;
}

export async function syncSteamWishlist() {
  try {
    const session = await auth();
    const userId = session?.user?.id;
    const userEmail = session?.user?.email;

    if (!session || (!userId && !userEmail)) {
      return { success: false, error: 'Unauthenticated.' };
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
      return { success: false, error: 'No linked Steam ID found.' };
    }

    const STEAM_API_KEY = process.env.STEAM_API_KEY;
    const TWITCH_CLIENT_ID = process.env.TWITCH_CLIENT_ID?.trim();
    const TWITCH_CLIENT_SECRET = process.env.TWITCH_CLIENT_SECRET?.trim();

    if (!STEAM_API_KEY) {
      return { success: false, error: 'Missing STEAM_API_KEY in environment variables.' };
    }

    const wishlistRes = await fetch(
      `https://api.steampowered.com/IWishlistService/GetWishlist/v1/?key=${STEAM_API_KEY}&steamid=${user.steamId}`,
      { cache: 'no-store' }
    );

    if (!wishlistRes.ok) {
      return { success: false, error: 'Failed to communicate with Steam Wishlist API.' };
    }

    const wishlistData = await wishlistRes.json();
    const items = wishlistData.response?.items || [];

    if (items.length === 0) {
      return { success: true, count: 0, message: 'Wishlist is empty or private.' };
    }

    const twitchToken =
      TWITCH_CLIENT_ID && TWITCH_CLIENT_SECRET
        ? await getTwitchToken(TWITCH_CLIENT_ID, TWITCH_CLIENT_SECRET)
        : null;

    const allAppIds: number[] = items
      .map((item: any) => Number(item.appid))
      .filter((id: number) => !isNaN(id));

    let igdbDetailsMap: Record<
      number,
      { igdbId: number; name: string; coverUrl: string | null }
    > = {};

    if (twitchToken) {
      igdbDetailsMap = await getIgdbDetailsForSteamApps(allAppIds, TWITCH_CLIENT_ID!, twitchToken);
    }

    const missingTitleAppIds = allAppIds.filter((appId: number) => !igdbDetailsMap[appId]?.name);
    const steamStoreTitlesMap = await batchFetchSteamStoreTitles(missingTitleAppIds);

    let savedCount = 0;

    for (const item of items) {
      const appId = Number(item.appid);
      if (isNaN(appId)) continue;

      const igdbInfo = igdbDetailsMap[appId];
      let gameTitle = igdbInfo?.name || steamStoreTitlesMap[appId];

      // Direct fallback retry if title is still missing
      if (!gameTitle) {
        const directTitle = await fetchSingleSteamTitle(appId);
        gameTitle = directTitle || `Steam App ${appId}`;
      }

      // Standard Steam vertical library poster CDN fallback
      const coverUrl =
        igdbInfo?.coverUrl ||
        `https://cdn.cloudflare.steamstatic.com/steam/apps/${appId}/library_600x900.jpg`;

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
        await prisma.gameLog.update({
          where: { id: existingLog.id },
          data: {
            gameTitle,
            coverUrl,
            steamAppId: appId,
            status: 'WANT TO PLAY',
            isOwned: false,
            ...(resolvedIgdbId ? { igdbId: resolvedIgdbId } : {}),
          },
        });
      } else {
        await prisma.gameLog.create({
          data: {
            userId: user.id,
            steamAppId: appId,
            gameTitle,
            coverUrl,
            status: 'WANT TO PLAY',
            isOwned: false,
            igdbId: resolvedIgdbId,
          },
        });
      }

      savedCount++;
    }

    if (user.username) {
      revalidatePath('/u/' + user.username);
    }

    return { success: true, count: savedCount };
  } catch (error) {
    console.error('Error during Steam wishlist sync:', error);
    return { success: false, error: 'Failed to sync wishlist.' };
  }
}