'use server';

import { auth } from '@/lib/auth';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '@prisma/client';
import { revalidatePath } from 'next/cache';

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL })
const prisma = new PrismaClient({ adapter })

interface LogInput {
  externalGameId: number;
  gameTitle: string;
  coverUrl?: string;
  rating: number;
  review: string;
  status: 'PLAYED' | 'PLAYING' | 'BACKLOG';
}

export async function logGame(data: LogInput) {
  try {
    // Verify authenticated session
    const session = await auth();
    const userEmail = session?.user?.email;

    if (!userEmail) {
      console.error('Log Action Failed: User id is not authenticated.');
      return { success: false, error: 'Unauthenticated' };
    }

    // Locate user in Neon DB
    const user = await prisma.user.findUnique({
      where: { email : userEmail },
    });

    if (!user) {
      console.error('Log Action Failed: No database user found for email ${userEmail}');
      return { success: false, error: 'User not found in database' };
    }

    const log = await prisma.gameLog.upsert({
      where: {
        userId_externalGameId: {
          userId: user.id,
          externalGameId: data.externalGameId,
        },
      },
    update: {
      rating: data.rating ?? null,
      review: data.review ?? null,
      status: data.status,
      playedOn: new Date(),
    },
    create: {
      userId: user.id,
      externalGameId: data.externalGameId,
      gameTitle: data.gameTitle,
      coverUrl: data.coverUrl ?? null,
      rating: data.rating ?? null,
      review: data.review ?? null,
      status: data.status,
    },
  });

  console.log('Log saved successfully:', log.id);

  // Purge Next.js server cache
  revalidatePath('/profile');
  revalidatePath('/game/${data.externalGameId}');

  return { success: true, log };
  } catch (error) {
  console.error('Error saving log to database:', error);
  return { success: false, error: 'Failed to save log' };
}
}
