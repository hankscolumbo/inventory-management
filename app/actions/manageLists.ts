// app/actions/manageLists.ts
'use server';

import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { revalidatePath } from 'next/cache';

export async function updateList(listId: string, data: { title: string; description?: string }) {
  const session = await auth();
  if (!session?.user?.id) return { success: false, error: 'Unauthenticated' };

  if (!data.title?.trim()) {
    return { success: false, error: 'Title is required' };
  }

  try {
    const list = await prisma.customList.findFirst({
      where: { id: listId, userId: session.user.id },
    });

    if (!list) return { success: false, error: 'List not found or unauthorized' };

    await prisma.customList.update({
      where: { id: listId },
      data: {
        title: data.title.trim(),
        description: data.description?.trim() || null,
      },
    });

    //revalidatePath(`/lists/${listId}`);
    revalidatePath(`/list/${listId}`);
    //revalidatePath('/lists');
    return { success: true };
  } catch (error) {
    console.error('Error updating list:', error);
    return { success: false, error: 'Failed to update list.' };
  }
}

export async function deleteList(listId: string) {
  const session = await auth();
  if (!session?.user?.id) return { success: false, error: 'Unauthenticated' };

  try {
    const list = await prisma.customList.findFirst({
      where: { id: listId, userId: session.user.id },
    });

    if (!list) return { success: false, error: 'List not found or unauthorized' };

    await prisma.customList.delete({
      where: { id: listId },
    });

    revalidatePath('/lists');
    return { success: true };
  } catch (error) {
    console.error('Error deleting list:', error);
    return { success: false, error: 'Failed to delete list.' };
  }
}