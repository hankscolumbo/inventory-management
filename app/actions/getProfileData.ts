// app/actions/getProfileData.ts
'use server';

import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export async function getProfileData(userId?: string) {
    const session = await auth();

    const userEmail = session?.user?.email;

    if (!userEmail) {
        return {
            user: null,
            logs: [],
            stats: { totalLogged: 0, playedCount: 0, avgRating: null },
        };
    }

    // Use provided userId or fallback to logged-in user
    const targetUserId = userId || session?.user?.id;

    if (!targetUserId) {
        return { error: 'User not found' };
    }

    const user = await prisma.user.findUnique({
        where: { id: targetUserId },
        include: {
            logs: {
                orderBy: { playedOn: 'desc' },
            },
        },
    });

    if (!user) {
        return { error: 'User not found' };
    }

    // Calculate statistics
    const totalLogged = user.logs.length;
    const ratings = user.logs.map((log) => log.rating).filter((r): r is number => r !== null && r > 0);
    const avgRating = ratings.length > 0 
    ? (ratings.reduce((acc, curr) => acc + curr, 0) / ratings.length).toFixed(1) 
    : null;

    //const playingCount = user.logs.filter((l) => l.status === 'PLAYING').length;
    //const backlogCount = user.logs.filter((l) => l.status === 'BACKLOG').length;

    return {
        user: {
        id: user.id,
        name: user.name || 'Gamer',
        image: user.image ?? null,
        createdAt: user.createdAt,
        email: user.email ?? '',
        },
        stats: {
        totalLogged: user.logs.length,
        avgRating,
        playingCount: user.logs.filter((l) => l.status === 'PLAYING').length,
        backlogCount: user.logs.filter((l) => l.status === 'BACKLOG').length,
        playedCount: user.logs.filter((l) => l.status === 'PLAYED').length,
        },
        logs: user.logs,
    };
}