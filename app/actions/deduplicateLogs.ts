//app/actions/deduplicateLogs.ts

'use server';

import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { revalidatePath } from 'next/cache';

export async function cleanupDuplicateLogs() {
  const session = await auth();
  if (!session?.user?.id) {
    return { success: false, error: 'Unauthorized' };
  }

  try {
    const logs = await prisma.gameLog.findMany({
      where: { userId: session.user.id },
      orderBy: { createdAt: 'desc' },
    });

    const seenGroup = new Map<string, typeof logs[0]>();
    const duplicateIdsToDelete: string[] = [];

    for (const log of logs) {
      const key = log.igdbId && log.igdbId > 0
        ? `igdb_${log.igdbId}`
        : `title_${log.gameTitle.trim().toLowerCase()}`;

      const existing = seenGroup.get(key);

      if (!existing) {
        seenGroup.set(key, log);
      } else {
        const existingScore = (existing.review ? 2 : 0) + (existing.rating ? 1 : 0);
        const currentScore = (log.review ? 2 : 0) + (log.rating ? 1 : 0);

        if (currentScore > existingScore) {
          duplicateIdsToDelete.push(existing.id);
          seenGroup.set(key, log);
        } else {
          duplicateIdsToDelete.push(log.id);
        }
      }
    }

    if (duplicateIdsToDelete.length > 0) {
      await prisma.gameLog.deleteMany({
        where: {
          id: { in: duplicateIdsToDelete },
        },
      });
    }

    revalidatePath('/dashboard');
    return {
      success: true,
      removedCount: duplicateIdsToDelete.length,
    };
  } catch (error) {
    console.error('Failed to deduplicate logs:', error);
    return { success: false, error: 'Failed to purge duplicates.' };
  }
}
