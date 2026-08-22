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
        return {
            user: null,
            logs: [],
            stats: { totalLogged: 0, playedCount: 0, avgRating: null },
        };
    }

        const user = await prisma.user.findUnique({
            where: { id: targetUserId },
            include: {
                gameLogs: {
                    orderBy: { updatedAt: 'desc' },
                },
            },
        });

        if (!user) {
            return {
                user: null,
                logs: [],
                stats: { totalLogged: 0, playedCount: 0, avgRating: null },
            };
        }

        const logs = user.gameLogs || [];

        // Calculate statistics
        const totalLogged = logs.length;
        const ratings = logs
            .map((log) => log.rating)
            .filter((r): r is number => r !== null && r > 0);
        const avgRating = ratings.length > 0
            ? (ratings.reduce((acc, curr) => acc + curr, 0) / ratings.length).toFixed(1)
            : null;

        return {
            user: {
                id: user.id,
                name: user.username || user.name || 'xXxGaMeRxXx',
                image: user.image ?? null,
                createdAt: user.createdAt,
                email: user.email ?? '',
            },
            stats: {
                totalLogged,
                avgRating,
                playingCount: logs.filter((l) => l.status === 'PLAYING').length,
                backlogCount: logs.filter((l) => l.status === 'BACKLOG').length,
                playedCount: logs.filter((l) => l.status === 'PLAYED').length,
            },
            logs,
        };
    }