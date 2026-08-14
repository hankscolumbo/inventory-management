'use server';

import { auth } from '@/lib/auth';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '@prisma/client';
import { revalidatePath } from 'next/cache';

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL })
const prisma = new PrismaClient({ adapter })

export async function logGame(data: {
  externalGameId: number;
  gameTitle: string;
  coverUrl?: string;
  rating: number;
  review: string;
  status: string;
}) {

  const session = await auth();

  if(!session?.user?.id) {
    throw new Error('You must be signed in to log a game.');
  }

  const log = await prisma.gameLog.create({
    data: {
      userId: session.user.id,
      externalGameId: data.externalGameId,
      gameTitle: data.gameTitle,
      coverUrl: data.coverUrl,
      rating: data.rating,
      review: data.review,
      status: data.status,
    },
  });

  revalidatePath('/profile');
  return { success: true, log };
}
