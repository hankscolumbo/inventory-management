// app/actions/syncSteam.ts
'use server';

import { auth } from '@/app/api/auth/[...nextauth]/route';
import { prisma } from '@/lib/prisma';
import { revalidatePath } from 'next/cache';

export async function syncSteamGames() {
  const session = await auth();
  if (!session?.user?.email) return { success: false, error: 'Unauthenticated' };

  const user = await prisma.user.findUnique({
    where: { email: session.user.email },
  });

  if (!user?.steamId) {
    return { success: false, error: 'No Steam account linked.' };
  }

  // Fetch games from Steam API
  const res = await fetch(
    `https://api.steampowered.com/IPlayerService/GetOwnedGames/v1/?key=${process.env.STEAM_API_KEY}&steamid=${user.steamId}&include_appinfo=true&format=json`
  );

  const data = await res.json();
  const steamGames = data.response?.games || [];

  // Loop & Sync into DB
  for (const game of steamGames) {
    const playtimeHours = Math.round((game.playtime_forever / 60) * 10) / 10;
    
    // Auto-categorize: Played > 2 hrs -> PLAYED, > 0 -> PLAYING, 0 -> BACKLOG
    let status = 'BACKLOG';
    if (playtimeHours > 2) status = 'PLAYED';
    else if (playtimeHours > 0) status = 'PLAYING';

    // Map to GameLog table
    // (Note: Optional IGDB matching can be performed here using title search)
  }

  revalidatePath('/profile');
  return { success: true, count: steamGames.length };
}