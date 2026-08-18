// lib/getPublicProfile.ts
import { prisma } from '@/lib/prisma';

export async function getPublicProfile(username: string) {
  try {
    const user = await prisma.user.findUnique({
      where: { username },
      select: {
        id: true,
        name: true,
        username: true,
        email: true,
        image: true,
        steamId: true,
        createdAt: true,
        logs: {
          orderBy: { playedOn: 'desc' },
        },
        lists: {
            where: { isPrivate: false },
            orderBy: { createdAt: 'desc' },
            include: {
                items: {
                    orderBy: { position: 'asc' },
                    take: 4, // fetch first 4 covers for list preview cards
                    },
                },
            },
        },
    });

    return user;
    } catch (error) {
    console.error('Failed to fetch public profile:', error);
    return null;
    }
}