'use server';

import { prisma } from '@/lib/prisma';
import { auth } from '@/lib/auth';
import { revalidatePath } from 'next/cache';

interface ToggleDlcParams {
  gameLogId: string;
  parentIgdbId: number;
  parentGameTitle: string;
  parentCoverUrl?: string | null;
  dlc: {
    igdbId: number;
    name: string;
    coverUrl?: string | null;
    releaseYear?: number | null;
  };
}

export async function toggleDlcLog({
  gameLogId,
  parentIgdbId,
  parentGameTitle,
  parentCoverUrl,
  dlc,
}: ToggleDlcParams) {
  const session = await auth();
  if (!session?.user) return { success: false, error: 'Unauthorized' };

  try {
    // 1. Upsert parent Game
    const parentGame = await prisma.game.upsert({
      where: { igdbId: parentIgdbId },
      update: {},
      create: {
        igdbId: parentIgdbId,
        name: parentGameTitle,
        coverUrl: parentCoverUrl,
      },
    });

    // 2. Upsert DLC record
    const dlcRecord = await prisma.dLC.upsert({
      where: { igdbId: dlc.igdbId },
      update: {},
      create: {
        igdbId: dlc.igdbId,
        name: dlc.name,
        coverUrl: dlc.coverUrl,
        releaseYear: dlc.releaseYear,
        gameIgdbId: parentGame.igdbId,
      },
    });

    // 3. Toggle attachment on GameLog
    const existingLog = await prisma.gameLog.findFirst({
      where: {
        id: gameLogId,
        dlcs: { some: { id: dlcRecord.id } },
      },
    });

    if (existingLog) {
      await prisma.gameLog.update({
        where: { id: gameLogId },
        data: {
          dlcs: { disconnect: { id: dlcRecord.id } },
        },
      });
    } else {
      await prisma.gameLog.update({
        where: { id: gameLogId },
        data: {
          igdbId: parentIgdbId,
          dlcs: { connect: { id: dlcRecord.id } },
        },
      });
    }

    revalidatePath('/profile');
    return { success: true, isLogged: !existingLog };
  } catch (error: any) {
    console.error('Failed to toggle DLC:', error);
    return { success: false, error: error?.message || 'Database update failed.' };
  }
}


