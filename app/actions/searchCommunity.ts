// app/actions/searchCommunity.ts
'use server';

import { prisma } from '@/lib/prisma';

export async function searchCommunity(query: string) {
  if (!query || query.trim().length < 2) {
    return { users: [], lists: [] };
  }

  const cleanQuery = query.trim();

  const [users, lists] = await Promise.all([
    // Search Users by username or display name
    prisma.user.findMany({
      where: {
        OR: [
          { username: { contains: cleanQuery, mode: 'insensitive' } },
          { name: { contains: cleanQuery, mode: 'insensitive' } },
        ],
      },
      select: {
        id: true,
        username: true,
        name: true,
        image: true,
      },
      take: 5,
    }),

    // Search Public Lists by title or description
    prisma.customList.findMany({
      where: {
        isPrivate: false,
        OR: [
          { title: { contains: cleanQuery, mode: 'insensitive' } },
          { description: { contains: cleanQuery, mode: 'insensitive' } },
        ],
      },
      select: {
        id: true,
        title: true,
        description: true,
        user: {
          select: {
            username: true,
            name: true,
          },
        },
      },
      take: 5,
    }),
  ]);

  return { users, lists };
}