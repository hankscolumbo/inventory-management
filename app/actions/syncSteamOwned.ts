// app/actions/syncSteamOwned.ts
'use server';

import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { revalidatePath } from 'next/cache';

export async function syncSteamOwned() {
  try {
    const session = await auth();
    const userEmail = session?.user?.email;

    if (!userEmail) return { success: false, error: 'Unauthenticated.' };

    const user = await prisma.user.findUnique({ where: { email: userEmail } });
    if (!user || !user.steamId) return { success: false, error: 'No linked Steam ID Found.' };

    const STEAM_API_KEY = process.env.STEAM_API_KEY;
    if (!STEAM_API_KEY) return { success: false, error: 'STEAM_API_KEY missing.' };

    // 1. Fetch full owned library from Steam
    const res = await fetch(
      `https://api.steampowered.com/IPlayerService/GetOwnedGames/v1/?key=${STEAM_API_KEY}&steamid=${user.steamId}&format=json`,
      { cache: 'no-store' }
    );

    if (!res.ok) return { success: false, error: 'Failed to connect to Steam API.' };

    const data = await res.json();
    const steamGames = data?.response?.games || [];

    if (steamGames.length === 0) {
      return { success: true, count: 0, message: 'No games found in Steam library.' };
    }

    const ownedAppIds = steamGames.map((g: { appid: number }) => Number(g.appid));

    // 2. Update ONLY existing game logs for this user matching owned Steam App IDs
    const updateResult = await prisma.gameLog.updateMany({
      where: {
        userId: user.id,
        steamAppId: { in: ownedAppIds },
      },
      data: {
        isOwned: true,
      },
    });

    revalidatePath('/u/' + user.username);
    return { success: true, count: updateResult.count };
  } catch (error) {
    console.error('Error syncing owned flag:', error);
    return { success: false, error: 'Database update failed.' };
  }
}