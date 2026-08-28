// app/actions/mergeGameLogs.ts
'use server';

import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { revalidatePath } from 'next/cache';

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

    // 3. Resolve status
    const mergedStatus =
      primaryLog.status === 'PLAYED' || secondaryLog.status === 'PLAYED'
        ? 'PLAYED'
        : primaryLog.status;

    // 4. Resolve playedOn date
    let mergedPlayedOn = primaryLog.playedOn;
    if (secondaryLog.playedOn) {
      if (!mergedPlayedOn || new Date(secondaryLog.playedOn) > new Date(mergedPlayedOn)) {
        mergedPlayedOn = secondaryLog.playedOn;
      }
    }

    // 5. DELETE SECONDARY FIRST to release unique constraints (steamAppId, igdbId, psnTitleId)
    await prisma.$transaction([
      prisma.gameLog.delete({
        where: { id: secondaryLog.id },
      }),
      prisma.gameLog.update({
        where: { id: primaryLog.id },
        data: {
          playtimeHours: mergedPlaytimeHours,
          platforms: mergedPlatforms,
          status: mergedStatus,
          playedOn: mergedPlayedOn,
          isOwned: primaryLog.isOwned || secondaryLog.isOwned,
          psnTitleId: primaryLog.psnTitleId || secondaryLog.psnTitleId,
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
