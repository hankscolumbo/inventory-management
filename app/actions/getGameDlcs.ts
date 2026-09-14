'use server';

import { prisma } from '@/lib/prisma';

async function getTwitchToken(): Promise<string | null> {
  const clientId = process.env.TWITCH_CLIENT_ID?.trim();
  const clientSecret = process.env.TWITCH_CLIENT_SECRET?.trim();
  if (!clientId || !clientSecret) return null;

  try {
    const res = await fetch(
      `https://id.twitch.tv/oauth2/token?client_id=${clientId}&client_secret=${clientSecret}&grant_type=client_credentials`,
      { method: 'POST', cache: 'no-store' }
    );
    const data = await res.json();
    return data.access_token || null;
  } catch {
    return null;
  }
}

export interface DlcItem {
  igdbId: number;
  name: string;
  coverUrl: string | null;
  releaseYear: number | null;
  isLogged?: boolean;
}

export async function getGameDlcs(
  parentIgdbId?: number | null,
  logId?: string,
  gameTitle?: string
): Promise<DlcItem[]> {
  const clientId = process.env.TWITCH_CLIENT_ID?.trim();
  const token = await getTwitchToken();
  if (!clientId || !token) return [];

  try {
    let resolvedIgdbId =
      parentIgdbId !== null && parentIgdbId !== undefined && !isNaN(Number(parentIgdbId))
        ? Number(parentIgdbId)
        : null;

    // Fallback 1: Resolve igdbId from database if missing on log prop
    if (!resolvedIgdbId && logId) {
      const dbLog = await prisma.gameLog.findUnique({
        where: { id: logId },
        select: {
          igdbId: true,
          gameTitle: true,
          game: { select: { igdbId: true } },
        },
      });

      resolvedIgdbId = dbLog?.igdbId || dbLog?.game?.igdbId || null;
      if (!gameTitle && dbLog?.gameTitle) {
        gameTitle = dbLog.gameTitle;
      }
    }

    // Fallback 2: Direct IGDB search by title if igdbId is still missing
    if (!resolvedIgdbId && gameTitle) {
      const cleanTitle = gameTitle.replace(/"/g, '\\"');
      const searchRes = await fetch('https://api.igdb.com/v4/games', {
        method: 'POST',
        headers: {
          'Client-ID': clientId,
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'text/plain',
        },
        cache: 'no-store',
        body: `search "${cleanTitle}"; fields id, name, dlcs, expansions; limit 5;`,
      });

      if (searchRes.ok) {
        const searchData = await searchRes.json();
        if (Array.isArray(searchData) && searchData.length > 0) {
          resolvedIgdbId = Number(searchData[0].id);
        }
      }
    }

    if (!resolvedIgdbId) return [];

    // 1. Fetch DLC / Expansion array IDs directly from parent IGDB entry
    const parentRes = await fetch('https://api.igdb.com/v4/games', {
      method: 'POST',
      headers: {
        'Client-ID': clientId,
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'text/plain',
      },
      cache: 'no-store',
      body: `fields dlcs, expansions, standalone_expansions; where id = ${resolvedIgdbId};`,
    });

    let linkedDlcIds: number[] = [];
    if (parentRes.ok) {
      const parentData = await parentRes.json();
      if (parentData?.[0]) {
        const p = parentData[0];
        linkedDlcIds = [
          ...(p.dlcs || []),
          ...(p.expansions || []),
          ...(p.standalone_expansions || []),
        ];
      }
    }

    // 2. Build IGDB query without invalid outer parentheses
    const whereConditions: string[] = [
      `parent_game = ${resolvedIgdbId}`,
      `version_parent = ${resolvedIgdbId}`,
    ];

    if (linkedDlcIds.length > 0) {
      whereConditions.push(`id = (${linkedDlcIds.join(',')})`);
    }

    const queryBody = `fields name, cover.url, first_release_date; where ${whereConditions.join(
      ' | '
    )}; limit 50;`;

    const res = await fetch('https://api.igdb.com/v4/games', {
      method: 'POST',
      headers: {
        'Client-ID': clientId,
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'text/plain',
      },
      cache: 'no-store',
      body: queryBody,
    });

    if (!res.ok) return [];
    const rawDlcs = await res.json();
    if (!Array.isArray(rawDlcs)) return [];

    // 3. Fetch user's logged DLC IDs for this specific log entry
    let loggedDlcIgdbIds = new Set<number>();
    if (logId) {
      const activeLog = await prisma.gameLog.findUnique({
        where: { id: logId },
        select: { dlcs: { select: { igdbId: true } } },
      });

      if (activeLog?.dlcs) {
        loggedDlcIgdbIds = new Set(activeLog.dlcs.map((d) => Number(d.igdbId)));
      }
    }

    // 4. Format output
    return rawDlcs.map((dlc: any) => {
      const rawCover = dlc.cover?.url;
      const coverUrl = rawCover ? `https:${rawCover.replace('t_thumb', 't_1080p')}` : null;
      const releaseYear = dlc.first_release_date
        ? new Date(dlc.first_release_date * 1000).getFullYear()
        : null;

      return {
        igdbId: Number(dlc.id),
        name: dlc.name,
        coverUrl,
        releaseYear,
        isLogged: loggedDlcIgdbIds.has(Number(dlc.id)),
      };
    });
  } catch (err) {
    console.error('Error fetching DLCs:', err);
    return [];
  }
}


