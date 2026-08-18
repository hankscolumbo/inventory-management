// app/actions/getGameCommunityData.ts
'use server';

import { prisma } from '@/lib/prisma';

export async function getGameCommunityData(gameId: number) {
  try {
    const logs = await prisma.gameLog.findMany({
      where: { externalGameId: gameId },
        select: {
            status: true,
            rating: true,
          },
    });

    const totalLogs = logs.length;
    const playedCount = logs.filter((l) => l.status === 'PLAYED').length;
    const playingCount = logs.filter((l) => l.status === 'PLAYING').length;
    const backlogCount = logs.filter((l) => l.status === 'BACKLOG').length;

    // Calculate average rating ignoring null values
    const ratedLogs = logs.filter((l) => l.rating !== null && l.rating !== undefined);
    const avgRating = ratedLogs.length > 0
      ? (ratedLogs.reduce((acc, curr) => acc + (curr.rating || 0), 0) / ratedLogs.length).toFixed(1)
      : null;

    return {
      totalLogs,
      playedCount,
      playingCount,
      backlogCount,
      avgRating,
    };
  } catch (error) {
    console.error('Error fetching game stats:', error);
    return {
      totalLogs: 0,
      playedCount: 0,
      playingCount: 0,
      backlogCount: 0,
      avgRating: null,
    };
  }
}