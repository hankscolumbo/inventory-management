// app/actions/syncSteamBacklog.ts
'use server';

import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { revalidatePath } from 'next/cache';

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

async function fetchIgdbId(title: string): Promise<number | null> {
  const cleanTitle = title.replace(/['"']/g, '').trim();
  const token = await getIgdbToken();
  const clientId = process.env.TWITCH_CLIENT_ID;

  if (!token || !clientId) return null;

  try {
    const igdbRes = await fetch('https://api.igdb.com/v4/games', {
      method: 'POST',
      headers: {
        'Client-ID': clientId,
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'text/plain',
      },
      body: `fields id, name; search "${cleanTitle}"; limit 1;`,
    });

    if (igdbRes.ok) {
      const games = await igdbRes.json();
      if (games && games.length > 0 && games[0].id) {
        return Number(games[0].id);
      }
    }
  } catch (err) {
    console.error(`IGDB lookup failed for "${title}":`, err);
  }
  return null;
}

export async function syncSteamBacklog() {
  try {
    const session = await auth();
    const userEmail = session?.user?.email;

    if (!userEmail) return { success: false, error: 'Unauthenticated.' };

    const user = await prisma.user.findUnique({ where: { email: userEmail } });
    if (!user || !user.steamId) return { success: false, error: 'No linked Steam ID Found.' };

    const STEAM_API_KEY = process.env.STEAM_API_KEY;
    if (!STEAM_API_KEY) return { success: false, error: 'STEAM_API_KEY missing.' };

    // 1. Fetch full owned library from Steam with app info (&include_appinfo=1)
    const res = await fetch(
      `https://api.steampowered.com/IPlayerService/GetOwnedGames/v1/?key=${STEAM_API_KEY}&steamid=${user.steamId}&format=json&include_appinfo=1`,
      { cache: 'no-store' }
    );

    if (!res.ok) return { success: false, error: 'Failed to connect to Steam API.' };

    const data = await res.json();
    const steamGames = data?.response?.games || [];

    if (steamGames.length === 0) {
      return { success: true, count: 0, message: 'No games found in Steam library.' };
    }

    // 2. Filter for games with 0 playtime
    const backlogGames = steamGames.filter(
      (g: { playtime_forever?: number }) => !g.playtime_forever || g.playtime_forever === 0
    );

    // 3. Load user's existing logs to track active IGDB IDs and existing Steam logs
    const existingLogs = await prisma.gameLog.findMany({
      where: { userId: user.id },
      select: { id: true, steamAppId: true, igdbId: true },
    });

    const steamToLogMap = new Map<number, { id: string; igdbId: number | null }>();
    const takenIgdbIds = new Set<number>();

    for (const log of existingLogs) {
      if (log.steamAppId !== null) {
        steamToLogMap.set(Number(log.steamAppId), {
          id: log.id,
          igdbId: log.igdbId !== null ? Number(log.igdbId) : null,
        });
      }
      if (log.igdbId !== null) {
        takenIgdbIds.add(Number(log.igdbId));
      }
    }

    let syncedCount = 0;

    // 4. Upsert/Create backlog games into database
    for (const game of backlogGames) {
      const appId = Number(game.appid);
      const gameTitle = game.name || `Steam Game ${appId}`;
      const coverUrl = `https://cdn.akamai.steamstatic.com/steam/apps/${appId}/header.jpg`;

      const rawIgdbId = await fetchIgdbId(gameTitle);
      const existingLog = steamToLogMap.get(appId);

      let safeIgdbId: number | null = null;
      if (rawIgdbId !== null) {
        const candidateIgdb = Number(rawIgdbId);
        if (existingLog?.igdbId === candidateIgdb) {
          safeIgdbId = candidateIgdb;
        } else if (!takenIgdbIds.has(candidateIgdb)) {
          safeIgdbId = candidateIgdb;
          takenIgdbIds.add(candidateIgdb);
        }
      }

      if (existingLog) {
        await prisma.gameLog.update({
          where: { id: existingLog.id },
          data: {
            isOwned: true,
            status: 'BACKLOG',
            igdbId: safeIgdbId,
            coverUrl,
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

      syncedCount++;
    }

    revalidatePath('/u/' + user.username);
    return { success: true, count: syncedCount };
  } catch (error) {
    console.error('Error syncing Steam backlog:', error);
    return { success: false, error: 'Database update failed.' };
  }
}