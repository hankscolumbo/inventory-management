'use server';

import { prisma } from '@/lib/prisma';
import { auth } from '@/lib/auth';
import { revalidatePath } from 'next/cache';

async function getTwitchToken(): Promise<string | null> {
  const clientId = process.env.TWITCH_CLIENT_ID?.trim();
  const clientSecret = process.env.TWITCH_CLIENT_SECRET?.trim();
  if (!clientId || !clientSecret) return null;

  try {
    const res = await fetch(
      `https://id.twitch.tv/oauth2/token?client_id=${clientId}&client_secret=${clientSecret}&grant_type=client_credentials`,
      { method: 'POST', cache: 'no-store' }
    );
    const data = await res.json();
    return data.access_token || null;
  } catch {
    return null;
  }
}

interface AddGameToListInput {
  customListId: string;
  gameTitle: string;
  coverUrl?: string | null;
  igdbId?: number | null;
  steamAppId?: number | null;
  note?: string;
  isDlc?: boolean;
  parentIgdbId?: number | null;
  parentGameTitle?: string | null;
}

export async function removeGameFromList(itemId: string, customListId: string) {
  const session = await auth();
  if (!session?.user) return { success: false, error: 'Unauthorized' };

  try {
    await prisma.customListItem.delete({
      where: { id: itemId },
    });

    revalidatePath('/lists');
    revalidatePath(`/list/${customListId}`);
    return { success: true };
  } catch (error: any) {
    console.error('Error removing item from list:', error);
    return { success: false, error: error?.message || 'Failed to remove item.' };
  }
}

export async function updateListItemNote(
  itemId: string,
  note: string,
  customListId: string
) {
  const session = await auth();
  if (!session?.user) return { success: false, error: 'Unauthorized' };

  try {
    const updatedItem = await prisma.customListItem.update({
      where: { id: itemId },
      data: { note },
    });

    revalidatePath(`/list/${customListId}`);
    return { success: true, item: updatedItem };
  } catch (error: any) {
    console.error('Error updating note:', error);
    return { success: false, error: error?.message || 'Failed to update note.' };
  }
}

export async function updateItemPositions(
  arg1: string | { id: string; position: number }[],
  arg2?: string | { id: string; position: number }[]
) {
  const session = await auth();
  if (!session?.user) return { success: false, error: 'Unauthorized' };

  // Support both (customListId, items) and (items, customListId)
  const items = Array.isArray(arg1) ? arg1 : Array.isArray(arg2) ? arg2 : [];
  const customListId = typeof arg1 === 'string' ? arg1 : typeof arg2 === 'string' ? arg2 : undefined;

  try {
    if (items.length > 0) {
      await prisma.$transaction(
        items.map((item) =>
          prisma.customListItem.update({
            where: { id: item.id },
            data: { position: item.position },
          })
        )
      );
    }

    if (customListId) {
      revalidatePath(`/list/${customListId}`);
    }
    revalidatePath('/lists');
    return { success: true };
  } catch (error: any) {
    console.error('Error updating positions:', error);
    return { success: false, error: error?.message || 'Failed to reorder items.' };
  }
}

export async function addGameToList(input: AddGameToListInput) {
  const session = await auth();
  if (!session?.user) return { success: false, error: 'Unauthorized' };

  try {
    const numericIgdbId = input.igdbId ? Number(input.igdbId) : null;
    let isDlc = Boolean(input.isDlc);
    let parentGameId: number | null = input.parentIgdbId ? Number(input.parentIgdbId) : null;
    let parentGameTitle = input.parentGameTitle || '';

    const currentItemCount = await prisma.customListItem.count({
      where: { customListId: input.customListId },
    });

    if (numericIgdbId) {
      const clientId = process.env.TWITCH_CLIENT_ID?.trim();
      const token = await getTwitchToken();

      // 1. Fetch metadata from IGDB
      if (clientId && token) {
        try {
          const igdbRes = await fetch('https://api.igdb.com/v4/games', {
            method: 'POST',
            headers: {
              'Client-ID': clientId,
              'Authorization': `Bearer ${token}`,
              'Content-Type': 'text/plain',
            },
            cache: 'no-store',
            body: `fields name, game_type, category, parent_game.id, parent_game.name, parent_game; where id = ${numericIgdbId}; limit 1;`,
          });

          if (igdbRes.ok) {
            const igdbData = await igdbRes.json();
            if (Array.isArray(igdbData) && igdbData.length > 0) {
              const item = igdbData[0];
              const categoryValue = item.category ?? item.game_type;

              // IGDB categories: 1 (DLC), 2 (Expansion), 4 (Standalone Expansion)
              const isDlcCategory = [1, 2, 4].includes(categoryValue);
              const hasParent = Boolean(item.parent_game);

              if (isDlcCategory || hasParent) {
                isDlc = true;

                // Handle both raw scalar integer and expanded object for parent_game
                if (typeof item.parent_game === 'number') {
                  parentGameId = item.parent_game;
                } else if (item.parent_game && typeof item.parent_game === 'object') {
                  parentGameId = item.parent_game.id ? Number(item.parent_game.id) : null;
                  if (item.parent_game.name) parentGameTitle = item.parent_game.name;
                }
              }
            }
          }
        } catch (err) {
          console.error('Error fetching IGDB metadata:', err);
        }
      }

      // 2. Database Record Creation
      if (isDlc) {
        const cleanTitle = (input.gameTitle.split(':')[0]?.trim() || input.gameTitle.trim());


        // Fallback A: Search local DB for parent base game by title
        if (!parentGameId) {
          const existingParent = await prisma.game.findFirst({
            where: {
              OR: [
                { name: { equals: cleanTitle, mode: 'insensitive' } },
                { name: { equals: parentGameTitle, mode: 'insensitive' } },
              ],
            },
          });
          if (existingParent) {
            parentGameId = existingParent.igdbId;
            parentGameTitle = existingParent.name;
          }
        }

        // Fallback B: Search IGDB for base game by title if still missing
        if (!parentGameId && clientId && token) {
          try {
            const searchRes = await fetch('https://api.igdb.com/v4/games', {
              method: 'POST',
              headers: {
                'Client-ID': clientId,
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'text/plain',
              },
              cache: 'no-store',
              body: `search "${cleanTitle.replace(/"/g, '\\"')}"; fields id, name; where category = (0, 8, 9, 10, 11); limit 1;`,
            });

            if (searchRes.ok) {
              const searchData = await searchRes.json();
              if (Array.isArray(searchData) && searchData[0]?.id) {
                parentGameId = Number(searchData[0].id);
                parentGameTitle = searchData[0].name || cleanTitle;
              }
            }
          } catch (err) {
            console.error('Error searching parent game on IGDB:', err);
          }
        }

        if (!parentGameId || parentGameId === numericIgdbId) {
          return {
            success: false,
            error: 'Cannot identify base game for this DLC expansion.',
          };
        }

        // Upsert Parent Base Game first
        const parentGame = await prisma.game.upsert({
          where: { igdbId: parentGameId },
          update: {
            ...(parentGameTitle && { name: parentGameTitle }),
          },
          create: {
            igdbId: parentGameId,
            name: parentGameTitle || cleanTitle,
          },
        });

        // Clean up any erroneous Game record created under the DLC's ID
        await prisma.game.deleteMany({
          where: { igdbId: numericIgdbId },
        });

        // Upsert DLC record attached to Parent Game
        await prisma.dLC.upsert({
          where: { igdbId: numericIgdbId },
          update: {
            name: input.gameTitle,
            coverUrl: input.coverUrl,
            gameIgdbId: parentGame.igdbId,
          },
          create: {
            igdbId: numericIgdbId,
            name: input.gameTitle,
            coverUrl: input.coverUrl,
            gameIgdbId: parentGame.igdbId,
          },
        });
      } else {
        // Standard Base Game creation
        await prisma.game.upsert({
          where: { igdbId: numericIgdbId },
          update: {
            name: input.gameTitle,
            coverUrl: input.coverUrl,
          },
          create: {
            igdbId: numericIgdbId,
            name: input.gameTitle,
            coverUrl: input.coverUrl,
          },
        });
      }
    }

    // 3. Create CustomListItem record
    const newItem = await prisma.customListItem.create({
      data: {
        customListId: input.customListId,
        gameTitle: input.gameTitle,
        coverUrl: input.coverUrl,
        igdbId: numericIgdbId,
        isDlc: isDlc,
        note: input.note,
        position: currentItemCount + 1,
      },
    });

    revalidatePath('/lists');
    revalidatePath(`/list/${input.customListId}`);
    return { success: true, item: newItem };
  } catch (error: any) {
    console.error('Error adding item to list:', error);
    return { success: false, error: error?.message || 'Failed to add item to list.' };
  }
}