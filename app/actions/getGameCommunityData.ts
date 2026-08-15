// app/actions/getGameCommunityData.ts
'use server';

import { prisma } from '@/lib/prisma';

export async function getGameCommunityData(gameId: number) {
  try {
    const logs = await prisma.gameLog.findMany({
      where: { externalGameId: gameId },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            image: true,
          },
        },
      },
      orderBy: { playedOn: 'desc' },
    });

    const ratings = logs.map((l) => l.rating).filter((r): r is number => r !== null && r > 0);
    const avgRating = ratings.length > 0
      ? (ratings.reduce((acc, curr) => acc + curr, 0) / ratings.length).toFixed(1)
      : null;

    return {
      logs,
      totalLogs: logs.length,
      avgRating,
    };
  } catch (error) {
    console.error('Failed to fetch community data for game:', error);
    return { logs: [], totalLogs: 0, avgRating: null };
  }
}