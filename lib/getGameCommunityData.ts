// app/actions/getGameCommunityData.ts
'use server';

import { prisma } from '@/lib/prisma';

interface GameCommunityDataInput {
  igdbId?: number | null;
  steamAppId?: number | null;
}

export async function getGameCommunityData(input: GameCommunityDataInput | number) {
  const igdbId = typeof input === 'number' ? input : input.igdbId;
  const steamAppId = typeof input === 'number' ? input : input.steamAppId;
  
  const conditions: ({ igdbId: number } | { steamAppId: number })[] = [];
  if (igdbId) conditions.push({ igdbId });
  if (steamAppId) conditions.push({ steamAppId });

  if (conditions.length === 0) {
    return {
      avgRating: null,
      totalLogs: 0,
      playedCount: 0,
      playingCount: 0,
      //backlogCount: 0,
    };
  }

    const logs = await prisma.gameLog.findMany({
      where: {
        OR: conditions,
      },
        select: {
            status: true,
            rating: true,
          },
    });

    const totalLogs = logs.length;
    const playedCount = logs.filter((l) => l.status === 'PLAYED').length;
    const playingCount = logs.filter((l) => l.status === 'PLAYING').length;
    //const backlogCount = logs.filter((l) => l.status === 'BACKLOG').length;

    // Calculate average rating ignoring null values
    const ratedLogs = logs.filter((l) => l.rating !== null && l.rating !== undefined);
    const avgRating = ratedLogs.length > 0
      ? (ratedLogs.reduce((acc, curr) => acc + (curr.rating || 0), 0) / ratedLogs.length).toFixed(1)
      : null;

    return {
      totalLogs,
      playedCount,
      playingCount,
      //backlogCount,
      avgRating,
    };
  }