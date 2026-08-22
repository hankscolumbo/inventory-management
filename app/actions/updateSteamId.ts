// app/actions/updateSteamId.ts
'use server';

import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { revalidatePath } from 'next/cache';

export async function updateSteamId(steamId: string) {
  try {
    const session = await auth();
    const email = session?.user?.email;

    if (!email) {
      return { success: false, error: 'Unauthenticated.' };
    }

    const trimmedId = steamId.trim();

    // Basic SteamID64 numeric format validation (17 digits starting with 7656)
    if (!/^\d{17}$/.test(trimmedId)) {
      return {
        success: false,
        error: 'Invalid Steam ID. Must be a 17-digit SteamID64 (e.g., 76561198000000000).',
      };
    }

    const updatedUser = await prisma.user.update({
      where: { email },
      data: { steamId: trimmedId },
    });

    if (updatedUser.username) {
      revalidatePath(`/u/${updatedUser.username}`);
    }
    revalidatePath('/profile');

    return { success: true, steamId: trimmedId };
  } catch (error) {
    console.error('Error updating Steam ID:', error);
    return { success: false, error: 'Failed to update Steam ID.' };
  }
}