// app/actions/getUserGameLogs.ts
'use server';

import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export interface SimpleGameLog {
  id: string;
  gameTitle: string;
  coverUrl: string | null;
  status: string;
  playtimeHours: number | null;
}

export async function getUserGameLogs(query?: string, excludeLogId?: string): Promise<SimpleGameLog[]> {
  const session = await auth();
  if (!session?.user?.email) return [];

  const user = await prisma.user.findUnique({
    where: { email: session.user.email },
    select: { id: true },
  });

  if (!user) return [];

  const logs = await prisma.gameLog.findMany({
    where: {
      userId: user.id,
      ...(excludeLogId ? { id: { not: excludeLogId } } : {}),
      ...(query && query.trim() !== ''
        ? { gameTitle: { contains: query.trim(), mode: 'insensitive' } }
        : {}),
    },
    select: {
      id: true,
      gameTitle: true,
      coverUrl: true,
      status: true,
      playtimeHours: true,
    },
    take: 15,
    orderBy: { updatedAt: 'desc' },
  });

  return logs;
}