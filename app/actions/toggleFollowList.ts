// app/actions/toggleFollowList.ts
'use server';

import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { revalidatePath } from 'next/cache';

export async function toggleFollowList(customListId: string) {
  const session = await auth();

  if (!session?.user?.email) {
    return { success: false, error: 'You must be logged in to follow lists.' };
  }

  const user = await prisma.user.findUnique({
    where: { email: session.user.email },
    select: { id: true },
  });

  if (!user) return { success: false, error: 'User not found.' };

  const existingFollow = await prisma.listFollow.findFirst({
    where: {
        userId: user.id,
        customListId,
      },
  });

  if (existingFollow) {
    await prisma.listFollow.delete({
      where: { id: existingFollow.id },
    });
    revalidatePath(`/list/${customListId}`);
    return { success: true, isFollowing: false };
  } else {
    await prisma.listFollow.create({
      data: {
        userId: user.id,
        customListId,
      },
    });
    revalidatePath(`/list/${customListId}`);
    return { success: true, isFollowing: true };
  }
}