// app/actions/updateProfile.ts
'use server';

import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { revalidatePath } from 'next/cache';

export async function updateProfileName(name: string) {
  const session = await auth();

  if (!session?.user?.id && !session?.user?.email) {
    return { success: false, error: 'Unauthorized' };
  }

  try {
    const updatedUser = await prisma.user.update({
      where: session.user.id
        ? { id: session.user.id }
        : { email: session.user.email! },
      data: { name: name.trim() },
      select: { username: true },
    });

    revalidatePath('/profile');
    if (updatedUser.username) {
      revalidatePath(`/u/${updatedUser.username}`);
    }

    return { success: true };
  } catch (error: any) {
    console.error('Failed to update display name:', error);
    return { success: false, error: error?.message || 'Failed to update name.' };
  }
}