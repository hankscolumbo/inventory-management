// app/actions/listActions.ts
'use server';


import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { revalidatePath } from 'next/cache';

export async function updateListDetails(listId: string, title: string, description: string) {
  const session = await auth();
  if (!session?.user?.email) return { success: false, error: 'Unauthorized' };

  if (!title.trim()) return { success: false, error: 'Title cannot be empty.' };

  try {
    const list = await prisma.customList.findUnique({
      where: { id: listId },
      include: { user: true },
    });

    if (!list || list.user.email !== session.user.email) {
      return { success: false, error: 'Forbidden' };
    }

    await prisma.customList.update({
      where: { id: listId },
      data: {
        title: title.trim(),
        description: description.trim() || null,
      },
    });

    revalidatePath(`/list/${listId}`);
    return { success: true };
  } catch (error) {
    console.error('Error updating list details:', error);
    return { success: false, error: 'Failed to update list details.' };
  }
}

export async function reorderListItems(listId: string, orderedItemIds: string[]) {
  const session = await auth();
  if (!session?.user?.email) return { success: false, error: 'Unauthorized' };


  try {
    const list = await prisma.customList.findUnique({
      where: { id: listId },
      include: { user: true },
    });


    if (!list || list.user.email !== session.user.email) {
      return { success: false, error: 'Forbidden' };
    }


    // Update positions sequentially
    const updates = orderedItemIds.map((itemId, index) =>
      prisma.customListItem.update({
        where: { id: itemId },
        data: { position: index + 1 },
      })
    );


    await prisma.$transaction(updates);
    revalidatePath(`/list/${listId}`);
    return { success: true };
  } catch (error) {
    console.error('Error reordering list items:', error);
    return { success: false, error: 'Failed to save new order.' };
  }
}

export async function updateListItemNote(itemId: string, listId: string, note: string) {
  const session = await auth();
  if (!session?.user?.email) return { success: false, error: 'Unauthorized' };


  try {
    const item = await prisma.customListItem.findUnique({
      where: { id: itemId },
      include: { customList: { include: { user: true } } },
    });


    if (!item || item.customList.user.email !== session.user.email) {
      return { success: false, error: 'Forbidden' };
    }


    await prisma.customListItem.update({
      where: { id: itemId },
      data: { note: note.trim() },
    });


    revalidatePath(`/list/${listId}`);
    return { success: true };
  } catch (error) {
    console.error('Error updating list note:', error);
    return { success: false, error: 'Failed to update note.' };
  }
}