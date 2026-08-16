// app/actions/saveSteamId.ts
'use server';

import { auth } from '@/app/api/auth/[...nextauth]/route';
import { prisma } from '@/lib/prisma';
import { revalidatePath } from 'next/cache';

export async function saveSteamId(steamId: string) {
  try {
    const session = await auth();
    const userEmail = session?.user?.email;

    if (!userEmail) {
      return { success: false, error: 'Unauthenticated' };
    }

    const trimmedSteamId = steamId.trim();

    // Basic format check (Steam64 IDs are 17 digits long)
    if (trimmedSteamId && !/^\d{17}$/.test(trimmedSteamId)) {
      return { success: false, error: 'Invalid Steam ID format. Must be a 17-digit Steam64 ID.' };
    }

    const user = await prisma.user.update({
      where: { email: userEmail },
      data: {
        steamId: trimmedSteamId || null,
      },
    });

    revalidatePath('/settings');
    revalidatePath('/profile');

    return { success: true, steamId: user.steamId };
  } catch (error) {
    console.error('Error saving Steam ID:', error);
    return { success: false, error: 'Failed to update Steam ID.' };
  }
}