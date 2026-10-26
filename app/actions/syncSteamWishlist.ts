// app/actions/syncSteamWishlist.ts
'use server';

import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { revalidatePath } from 'next/cache';

interface SteamAppDetails {
  name: string;
  type?: string;
  description?: string | null;
  coverUrl?: string | null;
}

async function getTwitchToken(clientId: string, clientSecret: string) {
  try {
    const tokenRes = await fetch(
      `https://id.twitch.tv/oauth2/token?client_id=clientId&clientsecret={clientSecret}&grant_type=client_credentials`,
      { method: 'POST', cache: 'no-store' }
    );
    const tokenData = await tokenRes.json();
    return tokenData.access_token || null;
  } catch (e) {
    console.error('[Wishlist Sync] Twitch token error:', e);
    return null;
  }
}

// Search IGDB by title if external ID mapping is missing
async function searchIgdbByTitle(
  title: string,
  clientId: string,
  accessToken: string
): Promise<{ igdbId: number; name: string; coverUrl: string | null; summary: string | null } | null> {
  try {
    const cleanTitle = title.replace(/"/g, '\\"');
    const res = await fetch('https://api.igdb.com/v4/games', {
      method: 'POST',
      headers: {
        'Client-ID': clientId,
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'text/plain',
      },
      cache: 'no-store',
      body: `search "${cleanTitle}"; fields id, name, summary, cover.url; where category = (0, 8, 9, 10, 11); limit 1;`,
    });

    if (!res.ok) return null;
    const data = await res.json();
    if (Array.isArray(data) && data.length > 0 && data[0]?.id) {
      const item = data[0];
      const rawCover = item.cover?.url;
      const coverUrl = rawCover
        ? `https:${rawCover.replace('t_thumb', 't_1080p')}`
        : null;
      return {
        igdbId: Number(item.id),
        name: item.name,
        coverUrl,
        summary: item.summary || null,
      };
    }
  } catch (err) {
    console.error('[Wishlist Sync] Error searching IGDB by title:', err);
  }
  return null;
}

// Batch query IGDB for matching Steam App IDs
async function getIgdbDetailsForSteamApps(
  steamAppIds: number[],
  clientId: string,
  accessToken: string
): Promise<Record<number, { igdbId: number; name: string; coverUrl: string | null; summary: string | null }>> {
  if (steamAppIds.length === 0) return {};

  const finalMap: Record<number, { igdbId: number; name: string; coverUrl: string | null; summary: string | null }> = {};
  const chunkSize = 40;

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
        body: `fields name, summary, cover.url; where id = (${igdbIdsToFetch.join(',')}); limit 500;`,
      });

      if (!gamesRes.ok) continue;
      const gamesData = await gamesRes.json();

      if (Array.isArray(gamesData)) {
        const igdbGameDetailsMap: Record<number, { name: string; coverUrl: string | null; summary: string | null }> = {};
        gamesData.forEach((game: any) => {
          const rawCover = game.cover?.url;
          const coverUrl = rawCover
            ? `https:${rawCover.replace('t_thumb', 't_1080p')}`
            : null;

          igdbGameDetailsMap[Number(game.id)] = {
            name: game.name,
            coverUrl,
            summary: game.summary || null,
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
              summary: details.summary,
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

// Multi-tier Steam details & cover scraper
async function fetchSteamAppDetailsWithFallback(appId: number): Promise<SteamAppDetails | null> {
  // Tier 1: Steam Store JSON API
  try {
    const res = await fetch(`https://store.steampowered.com/api/appdetails?appids=${appId}&cc=us&l=en`, {
      cache: 'no-store',
      headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)' },
    });
    if (res.ok) {
      const data = await res.json();
      const appData = data?.[appId]?.data;
      if (data?.[appId]?.success && appData?.name) {
        return {
          name: appData.name,
          type: appData.type || 'game',
          description: appData.short_description || appData.about_the_game || null,
          coverUrl: appData.header_image || `https://cdn.cloudflare.steamstatic.com/steam/apps/${appId}/header.jpg`,
        };
      }
    }
  } catch {}

  // Tier 2: Steam Store HTML Scrape (CDN cached)
  try {
    const htmlRes = await fetch(`https://store.steampowered.com/app/${appId}/`, {
      cache: 'no-store',
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)',
        'Cookie': 'birthtime=0; mat_age=1',
      },
    });
    if (htmlRes.ok) {
      const html = await htmlRes.text();
      let name: string | null = null;
      let description: string | null = null;
      let coverUrl: string | null = null;

      const hubMatch = html.match(/<div[^>]*class="[^"]*apphub_AppName[^"]*"[^>]*>(.*?)<\/div>/s);
      if (hubMatch && hubMatch[1]) {
        name = hubMatch[1].replace(/<[^>]+>/g, '').trim();
      }

      const descMatch = html.match(/<meta[^>]*name="Description"[^>]*content="(.*?)"/i) ||
                        html.match(/<div[^>]*class="[^"]*game_description_snippet[^"]*"[^>]*>(.*?)<\/div>/s);
      if (descMatch && descMatch[1]) {
        description = descMatch[1].replace(/<[^>]+>/g, '').trim();
      }

      const ogImageMatch = html.match(/<meta[^>]*property="og:image"[^>]*content="(.*?)"/i);
      if (ogImageMatch && ogImageMatch[1]) {
        coverUrl = ogImageMatch[1].trim();
      }

      if (name) {
        return {
          name,
          type: 'game',
          description,
          coverUrl: coverUrl || `https://cdn.cloudflare.steamstatic.com/steam/apps/${appId}/header.jpg`,
        };
      }
    }
  } catch {}

  // Tier 3: Steam CDN Default Image Fallbacks
  return {
    name: `Steam App ${appId}`,
    type: 'game',
    description: null,
    coverUrl: `https://cdn.cloudflare.steamstatic.com/steam/apps/${appId}/header.jpg`,
  };
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

    const STEAM_API_KEY = process.env.STEAM_API_KEY?.replace(/["']/g, '').trim();
    const TWITCH_CLIENT_ID = process.env.TWITCH_CLIENT_ID?.replace(/["']/g, '').trim();
    const TWITCH_CLIENT_SECRET = process.env.TWITCH_CLIENT_SECRET?.replace(/["']/g, '').trim();

    if (!STEAM_API_KEY) {
      return { success: false, error: 'Missing STEAM_API_KEY in environment variables.' };
    }

    const steamUrl = new URL('https://api.steampowered.com/IWishlistService/GetWishlist/v1/');
    steamUrl.searchParams.append('key', STEAM_API_KEY);
    steamUrl.searchParams.append('steamid', user.steamId.trim());

    const wishlistRes = await fetch(steamUrl.toString(), { cache: 'no-store' });

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
      { igdbId: number; name: string; coverUrl: string | null; summary: string | null }
    > = {};

    if (twitchToken && TWITCH_CLIENT_ID) {
      igdbDetailsMap = await getIgdbDetailsForSteamApps(allAppIds, TWITCH_CLIENT_ID, twitchToken);
    }

    let savedCount = 0;

    for (const item of items) {
      const appId = Number(item.appid);
      if (isNaN(appId)) continue;

      let igdbInfo = igdbDetailsMap[appId];
      let steamDetails: SteamAppDetails | null = null;

      if (!igdbInfo?.name) {
        steamDetails = await fetchSteamAppDetailsWithFallback(appId);

        await new Promise((resolve) => setTimeout(resolve, 150));

        // Skip non-games (DLC, hardware, soundtracks, etc.)
        if (steamDetails?.type && steamDetails.type !== 'game') {
          continue;
        }

        // Secondary Fallback: Title Search on IGDB if missing external ID mapping
        if (steamDetails?.name && twitchToken && TWITCH_CLIENT_ID) {
          const titleMatch = await searchIgdbByTitle(steamDetails.name, TWITCH_CLIENT_ID, twitchToken);
          if (titleMatch) {
            igdbInfo = titleMatch;
          }
        }
      }

      const gameTitle = igdbInfo?.name || steamDetails?.name || `Steam App ${appId}`;
      const description = igdbInfo?.summary || steamDetails?.description || null;

      // Cover Art Resolution Cascade: IGDB 1080p -> Steam API Cover -> Steam Header -> Steam Library Capsule
      const coverUrl =
        igdbInfo?.coverUrl ||
        steamDetails?.coverUrl ||
        `https://cdn.cloudflare.steamstatic.com/steam/apps/${appId}/header.jpg`;

      const resolvedIgdbId = igdbInfo?.igdbId ? Number(igdbInfo.igdbId) : null;

      // Upsert parent Game record
      if (resolvedIgdbId) {
        await prisma.game.upsert({
          where: { igdbId: resolvedIgdbId },
          update: {
            name: gameTitle,
            ...(coverUrl && { coverUrl }),
            ...(description && { summary: description }),
          },
          create: {
            igdbId: resolvedIgdbId,
            name: gameTitle,
            coverUrl: coverUrl || null,
            summary: description || null,
          },
        });
      }

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

      let targetIgdbId: number | null = resolvedIgdbId;

      if (!targetIgdbId && existingLog?.igdbId) {
        const validGame = await prisma.game.findUnique({
          where: { igdbId: existingLog.igdbId },
          select: { igdbId: true },
        });
        targetIgdbId = validGame ? existingLog.igdbId : null;
      }

      if (existingLog) {
        await prisma.gameLog.update({
          where: { id: existingLog.id },
          data: {
            gameTitle,
            coverUrl,
            steamAppId: appId,
            status: 'WANT TO PLAY',
            substatus: 'WISHLIST',
            isOwned: false,
            playedOn: null,
            igdbId: targetIgdbId,
            ...(description && { review: description }), // Stores short description if review/summary field is used
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
            substatus: 'WISHLIST',
            isOwned: false,
            igdbId: targetIgdbId,
            playedOn: null,
            psnTitleIds: [],
            ...(description && { review: description }),
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


