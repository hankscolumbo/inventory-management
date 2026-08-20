'use server';

import { auth } from '@/lib/auth';
//import { PrismaPg } from '@prisma/adapter-pg';
//import { PrismaClient } from '@prisma/client';
import { prisma } from '@/lib/prisma';
import { revalidatePath } from 'next/cache';

//const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL })
//const prisma = new PrismaClient({ adapter })

interface LogInput {
  externalGameId: number | string;
  gameTitle: string;
  coverUrl?: string | null;
  rating?: number | null;
  review: string;
  status: 'PLAYED' | 'PLAYING' | 'WANT TO PLAY' | 'BACKLOG';
  playtimeHours?: number | null;
}

export async function logGame(data: LogInput) {
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
    
    const numericGameId = Number(data.externalGameId);
    if (isNaN(numericGameId)) {
      return { success: false, error: 'Invalid Game ID.'};
    }

    const log = await prisma.gameLog.upsert({
      where: {
        userId_externalGameId: {
          userId: user.id,
          externalGameId: numericGameId,
        },
      },
    update: {
      gameTitle: data.gameTitle,
      coverUrl: data.coverUrl,
      rating: data.rating ?? null,
      review: data.review ?? null,
      status: data.status,
      playedOn: new Date(),
      playtimeHours: data.playtimeHours ?? null,
      igdbId: numericGameId,
    },
    create: {
      userId: user.id,
      externalGameId: numericGameId,
      igdbId: numericGameId,
      gameTitle: data.gameTitle,
      coverUrl: data.coverUrl ?? null,
      rating: data.rating ?? null,
      review: data.review ?? null,
      status: data.status,
      playtimeHours: data.playtimeHours ?? null,
    },
  });

  console.log('Log saved successfully:', log.id);

  // Purge Next.js server cache
  if (user.username) {
    revalidatePath('/u/' + user.username);
  }
  return { success: true, log };
  } catch (error) {
  console.error('Error saving log to database:', error);
  return { success: false, error: 'Failed to save log' };
}
}
