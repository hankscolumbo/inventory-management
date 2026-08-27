'use server';

import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { revalidatePath } from 'next/cache';

interface LogInput {
  gameId: number;
  gameTitle: string;
  coverUrl?: string | null;
  rating?: number | null;
  review: string;
  status: string;
  playtimeHours?: number | null;
  isOwned?: boolean;
  isSteamApp?: boolean; // Flag if input is comes from STEAM
  platforms?: string[];
}

export async function logGame(input: LogInput) {
  try {
    // Verify authenticated session
    const session = await auth();

    console.log('[logGame DEBUG] Session payload:', session);

    const userId = session?.user?.id;
    const userEmail = session?.user?.email;

    if (!session || (!userId && !userEmail)) {
      console.error('Log Action Failed: User id is not authenticated.');
      return { success: false, error: 'Unauthenticated. Please Log In.' };
    }

    // Locate user in Neon DB
    const userConditions: ({ id: string } | { email: string })[] = [];
    if (userId) userConditions.push({ id: userId });
    if (userEmail) userConditions.push({ email: userEmail });

    const user = await prisma.user.findFirst({
      where: {
        OR: [
          ...(userId ? [{ id: userId }] : []),
          ...(userEmail ? [{ email : userEmail }] : []),
        ],
    },
  });

    if (!user) {
      console.error(`Log Action Failed: No database user found for email ${userEmail}`);
      return { success: false, error: 'User not found in database' };
    }
    
    const numericGameId = Number(input.gameId);
    if (isNaN(numericGameId)) {
      return { success: false, error: 'Invalid Game ID.'};
    }
    
    const igdbId = input.isSteamApp ? null : numericGameId;
    const steamAppId = input.isSteamApp ? numericGameId : null;

    const platforms = input.platforms || [];

    const existingLog = await prisma.gameLog.findFirst({
      where: {
        userId: session.user.id,
        OR: [
          ...(igdbId ? [{ igdbId }] : []),
          ...(steamAppId ? [{ steamAppId }] : []),
        ],
        },
      });

      if (existingLog) {
        await prisma.gameLog.update({
          where: { id: existingLog.id },
          data: {
            gameTitle: input.gameTitle,
            coverUrl: input.coverUrl,
            rating: input.rating ?? null,
            review: input.review ?? null,
            status: input.status,
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
            platforms,
            playtimeHours: input.playtimeHours ?? null,
            isOwned: input.isOwned ?? false,
        },
      });
    }

  // Purge Next.js server cache
  if (user.username) {
    revalidatePath('/u/' + user.username);
  }
  return { success: true };
  } catch (error) {
  console.error('Error saving log to database:', error);
  return { success: false, error: 'Failed to save log' };
}
}
