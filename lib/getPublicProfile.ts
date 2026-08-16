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
        image: true,
        createdAt: true,
        logs: {
          orderBy: { playedOn: 'desc' },
          select: {
            id: true,
            externalGameId: true,
            gameTitle: true,
            coverUrl: true,
            status: true,
            rating: true,
            review: true,
            playedOn: true,
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