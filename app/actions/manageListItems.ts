// app/actions/manageListItems.ts
'use server';

import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { revalidatePath } from 'next/cache';

interface AddGameInput {
  customListId: string;
  gameTitle: string;
  coverUrl?: string | null;
  igdbId?: number | null;
  steamAppId?: number | null;
}

export async function addGameToList(input: AddGameInput) {
  try {
    const session = await auth();
    if (!session?.user?.id && !session?.user?.email) {
      return { success: false, error: 'Unauthenticated.' };
    }

    // Verify list ownership
    const list = await prisma.customList.findUnique({
      where: { id: input.customListId },
      select: { userId: true, user: { select: { email: true } } },
    });

    if (
      !list ||
      (list.userId !== session.user.id && list.user?.email !== session.user.email)
    ) {
      return { success: false, error: 'Unauthorized to edit this list.' };
    }

    // Create item in list
    await prisma.customListItem.create({
      data: {
        customListId: input.customListId,
        gameTitle: input.gameTitle,
        coverUrl: input.coverUrl,
        igdbId: input.igdbId,
        steamAppId: input.steamAppId,
      },
    });

    revalidatePath(`/lists/${input.customListId}`);
    return { success: true };
  } catch (error) {
    console.error('Error adding game to list:', error);
    return { success: false, error: 'Failed to add game to list.' };
  }
}

export async function removeGameFromList(listId: string, itemId: string) {
  try {
    const session = await auth();
    if (!session?.user?.id && !session?.user?.email) {
      return { success: false, error: 'Unauthenticated.' };
    }

    const list = await prisma.customList.findUnique({
      where: { id: listId },
      select: { userId: true, user: { select: { email: true } } },
    });

    if (
      !list ||
      (list.userId !== session.user.id && list.user?.email !== session.user.email)
    ) {
      return { success: false, error: 'Unauthorized.' };
    }

    await prisma.customListItem.delete({
      where: { id: itemId },
    });

    revalidatePath(`/lists/${listId}`);
    return { success: true };
  } catch (error) {
    console.error('Error removing item:', error);
    return { success: false, error: 'Failed to remove game from list.' };
  }
}