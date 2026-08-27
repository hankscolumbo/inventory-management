// app/actions/syncPsn.ts
'use server';

import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { revalidatePath } from 'next/cache';
import {
  exchangeNpssoForAccessCode,
  exchangeCodeForAccessToken,
  getUserPlayedGames,
} from 'psn-api';

let cachedIgdbToken: { token: string; expiresAt: number } | null = null;

async function getIgdbToken(): Promise<string | null> {
  if (cachedIgdbToken && Date.now() < cachedIgdbToken.expiresAt) {
    return cachedIgdbToken.token;
  }

  const clientId = process.env.TWITCH_CLIENT_ID;
  const clientSecret = process.env.TWITCH_CLIENT_SECRET;
  if (!clientId || !clientSecret) return null;

  try {
    const res = await fetch(
      `https://id.twitch.tv/oauth2/token?client_id=${clientId}&client_secret=${clientSecret}&grant_type=client_credentials`,
      { method: 'POST' }
    );
    const data = await res.json();
    if (data.access_token) {
      cachedIgdbToken = {
        token: data.access_token,
        expiresAt: Date.now() + (data.expires_in - 300) * 1000,
      };
      return data.access_token;
    }
  } catch (err) {
    console.error('Failed to acquire IGDB token:', err);
  }
  return null;
}

async function fetchExternalGameIds(title: string): Promise<{ igdbId?: number; steamAppId?: number }> {
  const result: { igdbId?: number; steamAppId?: number } = {};
  const cleanTitle = title.replace(/['"']/g, '').trim();

  const token = await getIgdbToken();
  const clientId = process.env.TWITCH_CLIENT_ID;

  if (token && clientId) {
    try {
      const igdbRes = await fetch('https://api.igdb.com/v4/games', {
        method: 'POST',
        headers: {
          'Client-ID': clientId,
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'text/plain',
        },
        body: `fields id, name, external_games.category, external_games.uid; search "${cleanTitle}"; limit 1;`,
      });

      if (igdbRes.ok) {
        const games = await igdbRes.json();
        if (games && games.length > 0) {
          const game = games[0];
          if (game.id) {
            result.igdbId = Number(game.id);
          }
          if (Array.isArray(game.external_games)) {
            const steamEntry = game.external_games.find((ext: any) => ext.category === 1);
            if (steamEntry?.uid) {
              const parsedSteam = parseInt(steamEntry.uid, 10);
              if (!isNaN(parsedSteam)) {
                result.steamAppId = parsedSteam;
              }
            }
          }
        }
      }
    } catch (err) {
      console.error(`IGDB lookup failed for "${title}":`, err);
    }
  }

  if (!result.steamAppId) {
    try {
      const steamRes = await fetch(
        `https://store.steampowered.com/api/storesearch/?term=${encodeURIComponent(cleanTitle)}&l=english&cc=US`
      );
      if (steamRes.ok) {
        const steamData = await steamRes.json();
        if (steamData?.items && steamData.items.length > 0) {
          const parsedSteam = parseInt(steamData.items[0].id, 10);
          if (!isNaN(parsedSteam)) {
            result.steamAppId = parsedSteam;
          }
        }
      }
    } catch (err) {
      console.error(`Steam search failed for "${title}":`, err);
    }
  }

  return result;
}

function parseIsoDurationToHours(duration?: string): number {
  if (!duration) return 0;
  const hoursMatch = duration.match(/(\d+)H/);
  const minutesMatch = duration.match(/(\d+)M/);

  const hours = hoursMatch && hoursMatch[1] ? parseInt(hoursMatch[1], 10) : 0;
  const minutes = minutesMatch && minutesMatch[1] ? parseInt(minutesMatch[1], 10) : 0;

  return Number((hours + minutes / 60).toFixed(1));
}

export async function syncPsnAccount(npssoToken: string) {
  const session = await auth();

  if (!session?.user?.email) {
    return { success: false, error: 'Unauthorized' };
  }

  const cleanToken = npssoToken.trim();

  if (!cleanToken || cleanToken.length < 50) {
    return {
      success: false,
      error: 'Invalid NPSSO token format. It should be 64 characters long.',
    };
  }

  try {
    const accessCode = await exchangeNpssoForAccessCode(cleanToken);
    const authorization = await exchangeCodeForAccessToken(accessCode);

    let allGames: any[] = [];
    let offset = 0;
    const limit = 200;
    let hasMore = true;

    while (hasMore) {
      const gamesResponse = await getUserPlayedGames(authorization, 'me', {
        limit,
        offset,
      });

      const titles = gamesResponse.titles || [];
      allGames = [...allGames, ...titles];

      if (titles.length < limit) {
        hasMore = false;
      } else {
        offset += limit;
      }
    }

    const dbUser = await prisma.user.findUnique({
      where: { email: session.user.email },
      select: { id: true },
    });

    if (!dbUser) return { success: false, error: 'User not found.' };

    await prisma.user.update({
      where: { id: dbUser.id },
      data: { psnNpsso: cleanToken },
    });

    // 1. Load all existing games into memory
    const existingLogs = await prisma.gameLog.findMany({
      where: { userId: dbUser.id },
      select: { id: true, psnTitleId: true, steamAppId: true, igdbId: true },
    });

    const psnToLogMap = new Map<string, { id: string; steamAppId: number | null; igdbId: number | null }>();
    const takenSteamAppIds = new Set<number>();
    const takenIgdbIds = new Set<number>();

    // 2. Populate tracking sets with explicit Number casting
    for (const log of existingLogs) {
      const formattedLog = {
        id: log.id,
        steamAppId: log.steamAppId !== null ? Number(log.steamAppId) : null,
        igdbId: log.igdbId !== null ? Number(log.igdbId) : null,
      };

      if (log.psnTitleId) {
        psnToLogMap.set(log.psnTitleId, formattedLog);
      }
      if (formattedLog.steamAppId !== null) {
        takenSteamAppIds.add(formattedLog.steamAppId);
      }
      if (formattedLog.igdbId !== null) {
        takenIgdbIds.add(formattedLog.igdbId);
      }
    }

    let syncedCount = 0;

    for (const game of allGames) {
      const category = (game.category || game.platform || '').toLowerCase();

      if (category.includes('_app')) {
        continue;
      }

      const psnTitleId = game.titleId;
      if (!psnTitleId) continue;

      const gameTitle = game.name;
      const coverUrl = game.imageUrl;
      const playtimeHours = parseIsoDurationToHours(game.playDuration);
      const status = playtimeHours > 0 ? 'PLAYED' : 'BACKLOG';
      const service = (game.service || game.titleService || '').toLowerCase();
      const isOwned = service !== 'ps_plus';

      const externalIds = await fetchExternalGameIds(gameTitle);
      const existingLog = psnToLogMap.get(psnTitleId);

      let safeSteamAppId: number | null = null;
      let safeIgdbId: number | null = null;

      // 3. Resolve Steam App ID safely
      if (externalIds.steamAppId !== undefined && externalIds.steamAppId !== null) {
        const candidateSteam = Number(externalIds.steamAppId);
        if (existingLog?.steamAppId === candidateSteam) {
          safeSteamAppId = candidateSteam;
        } else if (!takenSteamAppIds.has(candidateSteam)) {
          safeSteamAppId = candidateSteam;
          takenSteamAppIds.add(candidateSteam);
        }
      }

      // 4. Resolve IGDB ID safely
      if (externalIds.igdbId !== undefined && externalIds.igdbId !== null) {
        const candidateIgdb = Number(externalIds.igdbId);
        if (existingLog?.igdbId === candidateIgdb) {
          safeIgdbId = candidateIgdb;
        } else if (!takenIgdbIds.has(candidateIgdb)) {
          safeIgdbId = candidateIgdb;
          takenIgdbIds.add(candidateIgdb);
        }
      }

      const upsertedLog = await prisma.gameLog.upsert({
        where: {
          userId_psnTitleId: {
            userId: dbUser.id,
            psnTitleId,
          },
        },
        update: {
          gameTitle,
          coverUrl: coverUrl || undefined,
          playtimeHours,
          status,
          isOwned,
          igdbId: safeIgdbId,
          steamAppId: safeSteamAppId,
        },
        create: {
          userId: dbUser.id,
          psnTitleId,
          gameTitle,
          coverUrl,
          playtimeHours,
          status,
          isOwned,
          igdbId: safeIgdbId,
          steamAppId: safeSteamAppId,
          platforms: [category.replace('_game', '').toUpperCase() || 'PLAYSTATION'],
        },
      });

      // 5. Update local map for sub-sequent loop iterations
      psnToLogMap.set(psnTitleId, {
        id: upsertedLog.id,
        steamAppId: safeSteamAppId,
        igdbId: safeIgdbId,
      });

      syncedCount++;
    }

    revalidatePath('/profile');
    return { success: true, count: syncedCount };
  } catch (error: any) {
    console.error('PSN Sync Error:', error);
    return {
      success: false,
      error:
        error?.message ||
        'Failed to authenticate with PSN. Verify your NPSSO token is active.',
    };
  }
}

