// app/actions/getUserLists.ts
'use server';

import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export async function getActiveUserLists() {
  try {
    const session = await auth();
    if (!session?.user?.email && !session?.user?.id) return [];

    const user = await prisma.user.findFirst({
      where: {
        OR: [
          ...(session.user.id ? [{ id: session.user.id }] : []),
          ...(session.user.email ? [{ email: session.user.email }] : []),
        ],
      },
      include: {
        customLists: {
          select: { id: true, title: true },
          orderBy: { updatedAt: 'desc' },
        },
      },
    });

    return user?.customLists || [];
  } catch (error) {
    console.error('Failed to fetch user lists:', error);
    return [];
  }
}