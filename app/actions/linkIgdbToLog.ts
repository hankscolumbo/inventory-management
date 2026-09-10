// app/actions/linkIgdbToLog.ts
'use server';

import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { revalidatePath } from 'next/cache';

export async function linkIgdbToLog(logId: string, igdbId: number, gameTitle: string) {
  const session = await auth();
  if (!session?.user?.id) {
    return { success: false, error: 'Unauthorized' };
  }

  try {
    const existingLog = await prisma.gameLog.findUnique({
      where: { id: logId },
      select: { userId: true },
    });

    if (!existingLog || existingLog.userId !== session.user.id) {
      return { success: false, error: 'Log not found or unauthorized' };
    }

    await prisma.gameLog.update({
      where: { id: logId },
      data: {
        igdbId: Number(igdbId),
        gameTitle: gameTitle.trim(),
      },
    });

    revalidatePath('/dashboard');
    revalidatePath(`/log/${logId}`);
    return { success: true };
  } catch (error) {
    console.error('Failed to link IGDB game:', error);
    return { success: false, error: 'Failed to update game log.' };
  }
}
