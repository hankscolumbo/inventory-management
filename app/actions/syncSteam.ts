// app/actions/syncSteam.ts
'use server';

import { auth } from '@/app/api/auth/[...nextauth]/route';
import { prisma } from '@/lib/prisma';
import { revalidatePath } from 'next/cache';

export async function syncSteamGames() {
    try {
        const session = await auth();
        const userEmail = session?.user?.email;

        if (!userEmail) {
            return { success: false, error: 'Unauthenticated. Please sign in.' };
    }

    const user = await prisma.user.findUnique({
        where: { email: userEmail },
  });

  if (!user || !user.steamId) {
    return { success: false, error: 'No linked Steam ID Found.' };
  }

  // Fetch games from Steam API
  const STEAM_API_KEY = process.env.STEAM_API_KEY;
  if (!STEAM_API_KEY) {
    return { success: false, error: 'STEAM_API_KEY environment variable is missing' };
  }

  const SteamRes = await fetch(
    `https://api.steampowered.com/IPlayerService/GetOwnedGames/v1/?key=${process.env.STEAM_API_KEY}&steamid=${user.steamId}&include_appinfo=true&format=json`
  );

  if (!SteamRes.ok) {
    console.error('Steam API Response Error:', await SteamRes.text());
    return { success: false, error: 'Failed to fetch games from Steam API.'};
  }

  const steamData = await SteamRes.json();
  const steamGames = steamData.response?.games || [];

  // TEMPORARY FILTER - ONLY SYNC GAMES WITH > 0 MINUTES PLAYED
  const playedGames = steamGames.filter(
    (game: { playtime_forever?: number }) => (game.playtime_forever || 0) > 0
    );

  if (playedGames.length === 0) {
    return { success: true , count: 0, message: 'No played games found in Steam account.'};
  }

  console.log('Syncing ${games.length} Steam games for user ${user.id}...');

  // Prepare database upsert operations
  const upsertOperations = playedGames.map((game: any) => {
    const appId = Number(game.appid);
    const gameTitle = game.name || 'Steam App ${appId}';
    const coverUrl = `https://cdn.cloudflare.steamstatic.com/steam/apps/${appId}/library_600x900.jpg`;

    // Deremine status based on playtime
    const playtimeMinutes = game.playtime_forever || 0;
    const playtimeHours = Number((playtimeMinutes / 60).toFixed(1));
    const status = playtimeMinutes > 0 ? 'PLAYED' : 'BACKLOG';

    return prisma.gameLog.upsert({
        where: {
            userId_externalGameId: {
                userId: user.id,
                externalGameId: appId,
            },
        },
        update: {
            gameTitle: gameTitle,
            coverUrl: coverUrl,
            // only update status if it was in BACKLOG and now has playtime
            status: status,
            steamAppId: appId,
            playtimeHours: playtimeHours,
        },
        create: {
            userId: user.id,
            externalGameId: appId,
            gameTitle: gameTitle,
            coverUrl: coverUrl,
            status: status,
            steamAppId: appId,
            playtimeHours: playtimeHours,
        },
    });
  });

  // Execute in batch chunks of 50 to prevent database connection timeout
  const CHUNK_SIZE = 50;
  let savedCount = 0;

  for (let i = 0; i < upsertOperations.length; i += CHUNK_SIZE) {
    const chunk = upsertOperations.slice(i, i + CHUNK_SIZE);
    await prisma.$transaction(chunk);
    savedCount += chunk.length;
  }

  console.log('Successfully stored ${saveCount} Steam games in the Neon DB');

  revalidatePath('/profile');
  return { success: true, count: savedCount };
} catch (error) {
    console.error('Error saving Steam sync to database:', error);
    return { success: false, error: 'Database transaction failed during sync.'};
}
}