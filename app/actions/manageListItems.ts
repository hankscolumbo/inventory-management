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
  note?: string;
}

export async function addGameToList(input: AddGameInput) {
  try {
    const session = await auth();
    if (!session?.user?.id && !session?.user?.email) {
      return { success: false, error: 'Unauthenticated.' };
    }

    const list = await prisma.customList.findUnique({
      where: { id: input.customListId },
      select: { userId: true, user: { select: { email: true } }, _count: { select: { items: true } } },
    });

    if (!list || (list.userId !== session.user.id && list.user?.email !== session.user.email)) {
      return { success: false, error: 'Unauthorized.' };
    }

    await prisma.customListItem.create({
      data: {
        customListId: input.customListId,
        gameTitle: input.gameTitle,
        coverUrl: input.coverUrl,
        igdbId: input.igdbId,
        steamAppId: input.steamAppId,
        note: input.note || null,
        position: list._count.items, // Append to bottom
      },
    });

    revalidatePath(`/lists/${input.customListId}`);
    return { success: true };
  } catch (error) {
    console.error('Error adding game to list:', error);
    return { success: false, error: 'Failed to add game to list.' };
  }
}

export async function updateListItemNote(customListId: string, itemId: string, note: string) {
  try {
    const session = await auth();
    if (!session?.user?.id && !session?.user?.email) return { success: false, error: 'Unauthenticated.' };

    await prisma.customListItem.update({
      where: { id: itemId },
      data: { note },
    });

    revalidatePath(`/lists/${customListId}`);
    return { success: true };
  } catch (error) {
    return { success: false, error: 'Failed to update note.' };
  }
}

export async function updateItemPositions(customListId: string, itemOrders: { id: string; position: number }[]) {
  try {
    const session = await auth();
    if (!session?.user?.id && !session?.user?.email) return { success: false, error: 'Unauthenticated.' };

    await prisma.$transaction(
      itemOrders.map((item) =>
        prisma.customListItem.update({
          where: { id: item.id },
          data: { position: item.position },
        })
      )
    );

    revalidatePath(`/lists/${customListId}`);
    return { success: true };
  } catch (error) {
    console.error('Error reordering items:', error);
    return { success: false, error: 'Failed to reorder items.' };
  }
}

export async function removeGameFromList(customListId: string, itemId: string) {
  try {
    const session = await auth();
    if (!session?.user?.id && !session?.user?.email) return { success: false, error: 'Unauthenticated.' };

    await prisma.customListItem.delete({ where: { id: itemId } });
    revalidatePath(`/lists/${customListId}`);
    return { success: true };
  } catch (error) {
    return { success: false, error: 'Failed to remove game.' };
  }
}