// app/actions/mergeGameLogs.ts
'use server';

import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { revalidatePath } from 'next/cache';

// Status hierarchy ranking (higher number = higher priority)
const STATUS_PRIORITY: Record<string, number> = {
  COMPLETED: 6,
  PLAYED: 5,
  PLAYING: 4,
  'ON HOLD': 3,
  ON_HOLD: 3,
  DROPPED: 2,
  BACKLOG: 1,
  'WANT TO PLAY': 0,
  WANT_TO_PLAY: 0,
};

const getStatusScore = (status?: string | null): number => {
  if (!status) return -1;
  return STATUS_PRIORITY[status] ?? 0;
};

export async function mergeGameLogs(primaryLogId: string, secondaryLogId: string) {
  const session = await auth();
  if (!session?.user?.email) {
    return { success: false, error: 'Unauthorized' };
  }

  if (primaryLogId === secondaryLogId) {
    return { success: false, error: 'Cannot merge a game log with itself.' };
  }

  try {
    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
      select: { id: true, username: true },
    });

    if (!user) return { success: false, error: 'User not found.' };

    const [primaryLog, secondaryLog] = await Promise.all([
      prisma.gameLog.findFirst({ where: { id: primaryLogId, userId: user.id } }),
      prisma.gameLog.findFirst({ where: { id: secondaryLogId, userId: user.id } }),
    ]);

    if (!primaryLog || !secondaryLog) {
      return { success: false, error: 'One or both game logs could not be found.' };
    }

    // 1. Combine total playtime safely
    const primaryHours = primaryLog.playtimeHours ?? 0;
    const secondaryHours = secondaryLog.playtimeHours ?? 0;
    const mergedPlaytimeHours = Number((primaryHours + secondaryHours).toFixed(1));

    // 2. Merge platform arrays (deduplicated)
    const mergedPlatforms = Array.from(
      new Set([...primaryLog.platforms, ...secondaryLog.platforms])
    );

    // 3. Merge PSN Title IDs array (deduplicated)
    const mergedPsnTitleIds = Array.from(
      new Set([...primaryLog.psnTitleIds, ...secondaryLog.psnTitleIds])
    );

    // 4. Resolve status by priority (PLAYED > PLAYING > BACKLOG > WANT TO PLAY)
    const primaryScore = getStatusScore(primaryLog.status);
    const secondaryScore = getStatusScore(secondaryLog.status);
    const mergedStatus = primaryScore >= secondaryScore ? primaryLog.status : secondaryLog.status;

    // 5. Resolve playedOn date
    let mergedPlayedOn = primaryLog.playedOn;
    if (secondaryLog.playedOn) {
      if (!mergedPlayedOn || new Date(secondaryLog.playedOn) > new Date(mergedPlayedOn)) {
        mergedPlayedOn = secondaryLog.playedOn;
      }
    }

    // 6. Delete secondary log first, then update primary log with merged data
    await prisma.$transaction([
      prisma.gameLog.delete({
        where: { id: secondaryLog.id },
      }),
      prisma.gameLog.update({
        where: { id: primaryLog.id },
        data: {
          playtimeHours: mergedPlaytimeHours,
          platforms: mergedPlatforms,
          psnTitleIds: mergedPsnTitleIds,
          status: mergedStatus,
          playedOn: mergedPlayedOn,
          isOwned: primaryLog.isOwned || secondaryLog.isOwned,
          steamAppId: primaryLog.steamAppId ?? secondaryLog.steamAppId,
          igdbId: primaryLog.igdbId ?? secondaryLog.igdbId,
          coverUrl: primaryLog.coverUrl || secondaryLog.coverUrl,
        },
      }),
    ]);

    if (user.username) {
      revalidatePath(`/u/${user.username}`);
    }
    revalidatePath('/profile');

    return { success: true };
  } catch (error: any) {
    console.error('Error merging game logs:', error);
    return { success: false, error: 'Database error occurred during merge.' };
  }
}


