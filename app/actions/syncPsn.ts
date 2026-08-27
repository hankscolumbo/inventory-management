// app/actions/syncPsn.ts
'use server';

import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { revalidatePath } from 'next/cache';
import {
  exchangeNpssoForAccessCode,
  exchangeCodeForAccessToken,
  getUserPlayedGames, // 👈 Import getUserPlayedGames instead of getUserTitles
} from 'psn-api';

// Helper to convert ISO 8601 duration (e.g., "PT42H15M") into numeric hours (42.25)
function parseIsoDurationToHours(duration?: string): number {
  if (!duration) return 0;
  const hoursMatch = duration.match(/(\d+)H/);
  const minutesMatch = duration.match(/(\d+)M/);

  const hours = hoursMatch && hoursMatch[1] ? parseInt(hoursMatch[1], 10) : 0;
  const minutes = minutesMatch && minutesMatch[1] ? parseInt(minutesMatch[1], 10) : 0;

  return Number((hours + minutes / 60).toFixed(1));
}

export async function syncPsnAccount(npssoToken: string) {
  const session = await auth();

  if (!session?.user?.email) {
    return { success: false, error: 'Unauthorized' };
  }

  const cleanToken = npssoToken.trim();

  if (!cleanToken || cleanToken.length < 50) {
    return {
      success: false,
      error: 'Invalid NPSSO token format. It should be 64 characters long.',
    };
  }

  try {
    // 1. Authenticate with Sony
    const accessCode = await exchangeNpssoForAccessCode(cleanToken);
    const authorization = await exchangeCodeForAccessToken(accessCode);

    // 2. Fetch User Played Games (includes playtime & recency)
    const gamesResponse = await getUserPlayedGames(authorization, 'me');
    const psnGames = gamesResponse.titles || [];

    const dbUser = await prisma.user.findUnique({
      where: { email: session.user.email },
      select: { id: true },
    });

    if (!dbUser) return { success: false, error: 'User not found.' };

    // 3. Save NPSSO token on User record
    await prisma.user.update({
      where: { id: dbUser.id },
      data: { psnNpsso: cleanToken },
    });

    // 4. Upsert PSN titles into GameLog with playtime
    for (const game of psnGames) {
      const psnTitleId = game.titleId;
      const gameTitle = game.name;
      const coverUrl = game.imageUrl;
      const playtimeHours = parseIsoDurationToHours(game.playDuration);

      await prisma.gameLog.upsert({
        where: {
          userId_psnTitleId: {
            userId: dbUser.id,
            psnTitleId,
          },
        },
        update: {
          gameTitle,
          coverUrl: coverUrl || undefined,
          playtimeHours, // 👈 Saves calculated playtime hours
          status: 'PLAYED',
        },
        create: {
          userId: dbUser.id,
          psnTitleId,
          gameTitle,
          coverUrl,
          playtimeHours,
          status: 'PLAYED',
          platforms: [game.category?.toUpperCase() || 'PLAYSTATION'],
        },
      });
    }

    revalidatePath('/profile');
    return { success: true, count: psnGames.length };
  } catch (error: any) {
    console.error('PSN Sync Error:', error);
    return {
      success: false,
      error:
        error?.message ||
        'Failed to authenticate with PSN. Verify your NPSSO token is active.',
    };
  }
}
