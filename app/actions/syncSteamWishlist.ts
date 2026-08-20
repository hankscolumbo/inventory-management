// app/actions/syncSteamWishlist.ts
'use server';

import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { revalidatePath } from 'next/cache';

export async function syncSteamWishlist() {
  try {
    const session = await auth();
    const userEmail = session?.user?.email;

    if (!userEmail) return { success: false, error: 'Unauthenticated.' };

    const user = await prisma.user.findUnique({ where: { email: userEmail } });
    if (!user || !user.steamId) return { success: false, error: 'No linked Steam ID Found.' };

    const STEAM_API_KEY = process.env.STEAM_API_KEY;
    if (!STEAM_API_KEY) return { success: false, error: 'STEAM_API_KEY missing.' };

    // 1. Fetch Wishlist App IDs from Steam Web API
    const url = `https://api.steampowered.com/IWishlistService/GetWishlist/v1/?key=${STEAM_API_KEY}&steamid=${user.steamId}`;
    const res = await fetch(url, { cache: 'no-store' });

    if (!res.ok) return { success: false, error: 'Failed to reach Steam Wishlist API.' };

    const data = await res.json();
    const items = data?.response?.items || [];

    if (!Array.isArray(items) || items.length === 0) {
      return { success: true, count: 0, message: 'No wishlist items found or profile is private.' };
    }

    // 2. Fetch existing logs to avoid overwriting games already marked as PLAYED or PLAYING
    const existingLogs = await prisma.gameLog.findMany({
      where: { userId: user.id },
      select: { externalGameId: true, status: true },
    });

    const existingPlayedOrPlaying = new Set(
      existingLogs
        .filter((l) => l.status === 'PLAYED' || l.status === 'PLAYING')
        .map((l) => l.externalGameId)
    );

    // Filter out items user already owns/played
    const wishlistToSync = items.filter(
      (item: any) => !existingPlayedOrPlaying.has(Number(item.appid))
    );

    // 3. Batch Upsert in Chunks of 30
    const CHUNK_SIZE = 30;
    let savedCount = 0;

    for (let i = 0; i < wishlistToSync.length; i += CHUNK_SIZE) {
      const chunk = wishlistToSync.slice(i, i + CHUNK_SIZE);

      const upsertOperations = chunk.map((item: any) => {
        const appId = Number(item.appid);
        const coverUrl = `https://cdn.cloudflare.steamstatic.com/steam/apps/${appId}/library_600x900.jpg`;

        return prisma.gameLog.upsert({
          where: {
            userId_externalGameId: {
              userId: user.id,
              externalGameId: appId,
            },
          },
          update: {
            steamAppId: appId,
            coverUrl,
            // Only update status to WANT TO PLAY if it's currently a backlog item
            status: 'WANT TO PLAY',
          },
          create: {
            userId: user.id,
            externalGameId: appId,
            gameTitle: `Steam App ${appId}`, // Title resolves automatically on /game/[id] page
            coverUrl,
            status: 'WANT TO PLAY',
            steamAppId: appId,
          },
        });
      });

      await Promise.all(upsertOperations);
      savedCount += chunk.length;
    }

    revalidatePath('/u/' + user.username);
    return { success: true, count: savedCount };
  } catch (error) {
    console.error('Error syncing Steam wishlist:', error);
    return { success: false, error: 'Database transaction failed.' };
  }
}