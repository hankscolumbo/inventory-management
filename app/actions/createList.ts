// app/actions/createList.ts
'use server';

import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { revalidatePath } from 'next/cache';

interface CreateListInput {
  title: string;
  description?: string;
  isPrivate?: boolean;
  games?: {
    externalGameId: number;
    gameTitle: string;
    coverUrl?: string | null;
  }[];
}

export async function createList(data: CreateListInput) {
  try {
    const session = await auth();
    const userEmail = session?.user?.email;

    if (!userEmail) {
      return { success: false, error: 'You must be signed in to create a list.' };
    }

    const user = await prisma.user.findUnique({
      where: { email: userEmail },
    });

    if (!user) {
      return { success: false, error: 'User not found.' };
    }

    const newList = await prisma.customList.create({
      data: {
        title: data.title,
        description: data.description ?? null,
        isPrivate: data.isPrivate ?? false,
        userId: user.id,
        items: {
          create: (data.games || []).map((game, index) => ({
            externalGameId: Number(game.externalGameId),
            gameTitle: game.gameTitle,
            coverUrl: game.coverUrl ?? null,
            position: index,
          })),
        },
      },
    });

    return { success: true, listId: newList.id };
  } catch (error) {
    console.error('Error creating list:', error);
    return { success: false, error: 'Failed to create list.' };
  }
}