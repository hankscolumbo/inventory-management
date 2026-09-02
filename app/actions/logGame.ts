  'use server';

import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { revalidatePath } from 'next/cache';

interface LogInput {
  logId?: string;
  gameId: number;
  gameTitle: string;
  coverUrl?: string | null;
  rating?: number | null;
  review?: string | null;
  status: string;
  substatus?: string | null;
  playtimeHours?: number | null;
  isOwned?: boolean;
  isSteamApp?: boolean;
  platforms?: string[];
  playedOn: Date | string | null;
}

export async function deleteGameLog(gameId: number) {
  const session = await auth();
  if (!session?.user?.email) return { success: false, error: 'Unauthorized' };

  try {
    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
    });

    if (!user) return { success: false, error: 'User not found' };

    await prisma.gameLog.deleteMany({
      where: {
        userId: user.id,
        igdbId: gameId,
      },
    });

    revalidatePath(`/game/${gameId}`);
    revalidatePath('/profile');
    return { success: true };
  } catch (error) {
    console.error('Error deleting game log:', error);
    return { success: false, error: 'Failed to delete game log' };
  }
}

export async function logGame(input: LogInput) {
  try {
    const session = await auth();

    console.log('[logGame DEBUG] Session payload:', session);

    const userId = session?.user?.id;
    const userEmail = session?.user?.email;

    if (!session || (!userId && !userEmail)) {
      console.error('Log Action Failed: User is not authenticated.');
      return { success: false, error: 'Unauthenticated. Please Log In.' };
    }

    // 1. Locate user record in Database
    const user = await prisma.user.findFirst({
      where: {
        OR: [
          ...(userId ? [{ id: userId }] : []),
          ...(userEmail ? [{ email: userEmail }] : []),
        ],
      },
    });

    if (!user) {
      console.error(`Log Action Failed: No database user found for email ${userEmail}`);
      return { success: false, error: 'User not found in database' };
    }

    const { logId } = input;
    const numericGameId = Number(input.gameId);
    if (isNaN(numericGameId)) {
      return { success: false, error: 'Invalid Game ID.' };
    }

    const igdbId = input.isSteamApp ? null : numericGameId;
    const steamAppId = input.isSteamApp ? numericGameId : null;
    const platforms = input.platforms || [];

    // 2. Sequential Lookup Priority (Uses user.id instead of session.user.id)
    let existingLog = null;

    if (logId) {
      existingLog = await prisma.gameLog.findFirst({
        where: { id: logId, userId: user.id },
      });
    }

    if (!existingLog && igdbId !== null) {
      existingLog = await prisma.gameLog.findFirst({
        where: { userId: user.id, igdbId },
      });
    }

    if (!existingLog && steamAppId !== null) {
      existingLog = await prisma.gameLog.findFirst({
        where: { userId: user.id, steamAppId },
      });
    }

    if (!existingLog && input.gameTitle) {
      existingLog = await prisma.gameLog.findFirst({
        where: {
          userId: user.id,
          gameTitle: { equals: input.gameTitle, mode: 'insensitive' },
        },
      });
    }

    // 3. Update Existing or Create New
    if (existingLog) {
      await prisma.gameLog.update({
        where: { id: existingLog.id },
        data: {
          gameTitle: input.gameTitle,
          coverUrl: input.coverUrl,
          rating: input.rating ?? null,
          review: input.review ?? null,
          status: input.status,
          substatus: input.substatus !== undefined ? input.substatus : existingLog.substatus,
          playedOn: new Date(),
          platforms,
          playtimeHours: input.playtimeHours ?? null,
          ...(igdbId && { igdbId }),
          ...(steamAppId && { steamAppId }),
          isOwned: input.isOwned ?? existingLog.isOwned,
        },
      });
    } else {
      await prisma.gameLog.create({
        data: {
          userId: user.id,
          igdbId,
          steamAppId,
          gameTitle: input.gameTitle,
          coverUrl: input.coverUrl,
          rating: input.rating ?? null,
          review: input.review ?? null,
          status: input.status,
          substatus: input.substatus ?? null,
          platforms,
          playtimeHours: input.playtimeHours ?? null,
          isOwned: input.isOwned ?? false,
          psnTitleIds: [],
        },
      });
    }

    if (user.username) {
      revalidatePath('/u/' + user.username);
    }
    revalidatePath('/profile');
    return { success: true };
  } catch (error: any) {
    console.error('Error saving log to database:', error);
    return { success: false, error: error?.message || 'Failed to save log' };
  }
}