//app/actions/syncOfflineLogs.ts

'use server';

import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { revalidatePath } from 'next/cache';
import { QueuedLog } from '@/lib/offlineQueue';

export async function syncOfflineLogs(queuedLogs: QueuedLog[]) {
  const session = await auth();
  if (!session?.user?.id) {
    return { success: false, error: 'Unauthorized' };
  }

  if (!queuedLogs || queuedLogs.length === 0) {
    return { success: true, count: 0 };
  }

  try {
    const recordsToInsert = queuedLogs.map((log) => ({
      userId: session.user.id,
      gameTitle: log.gameTitle,
      igdbId: log.igdbId ?? null,
      status: log.status || 'PLAYED',
      rating: log.rating ?? null,
      playtimeHours: log.playtimeHours ?? 0,
      review: log.review ?? null,
      createdAt: log.createdAt ? new Date(log.createdAt) : new Date(),
    }));

    await prisma.gameLog.createMany({
      data: recordsToInsert,
    });

    revalidatePath('/dashboard');
    return { success: true, count: recordsToInsert.length };
  } catch (error) {
    console.error('Failed to sync offline logs:', error);
    return { success: false, error: 'Database batch insert failed.' };
  }
}
