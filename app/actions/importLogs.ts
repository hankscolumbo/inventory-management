// app/actions/importLogs.ts
'use server';

import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { revalidatePath } from 'next/cache';

export interface RawCsvLogRow {
  title: string;
  status?: string;
  rating?: string | number;
  playtime?: string | number;
  review?: string;
}

function normalizeStatus(rawStatus?: string): string {
  if (!rawStatus) return 'PLAYED';
  const clean = rawStatus.trim().toLowerCase();

  if (clean.includes('playing')) return 'PLAYING';
  if (clean.includes('backlog') || clean.includes('want') || clean.includes('plan')) return 'BACKLOG';
  if (clean.includes('drop') || clean.includes('abandon')) return 'DROPPED';
  if (clean.includes('wish')) return 'WISHLIST';

  return 'PLAYED';
}

export async function importGameLogs(rows: RawCsvLogRow[]) {
  const session = await auth();
  if (!session?.user?.id) {
    return { success: false, error: 'Unauthorized' };
  }

  if (!rows || rows.length === 0) {
    return { success: false, error: 'No valid data found in CSV.' };
  }

  try {
    const validRows = rows.filter((r) => r.title && r.title.trim().length > 0);

    if (validRows.length === 0) {
      return { success: false, error: 'No rows contain a valid game title.' };
    }

    const existingLogs = await prisma.gameLog.findMany({
      where: { userId: session.user.id },
      select: { gameTitle: true },
    });

    const existingTitlesSet = new Set(
      existingLogs.map((log) => log.gameTitle.trim().toLowerCase())
    );

    const seenInImportBatch = new Set<string>();
    const recordsToInsert = [];

    for (const row of validRows) {
      const normalizedTitle = row.title.trim().toLowerCase();

      if (existingTitlesSet.has(normalizedTitle) || seenInImportBatch.has(normalizedTitle)) {
        continue;
      }

      seenInImportBatch.add(normalizedTitle);

      const parsedRating = row.rating !== undefined && row.rating !== '' ? parseFloat(String(row.rating)) : null;
      const parsedPlaytime = row.playtime !== undefined && row.playtime !== '' ? parseFloat(String(row.playtime)) : 0;

      recordsToInsert.push({
        userId: session.user.id,
        gameTitle: row.title.trim(),
        status: normalizeStatus(row.status),
        rating: parsedRating !== null && !isNaN(parsedRating) ? Math.min(Math.max(parsedRating, 0), 10) : null,
        playtimeHours: !isNaN(parsedPlaytime) ? Math.max(parsedPlaytime, 0) : 0,
        review: row.review?.trim() || null,
        isOwned: false,
        platforms: [],
        psnTitleIds: [],
      });
    }

    if (recordsToInsert.length === 0) {
      return { success: false, error: 'All entries in this CSV already exist in your library.' };
    }

    await prisma.$transaction(
      recordsToInsert.map((data) => prisma.gameLog.create({ data }))
    );

    revalidatePath('/dashboard');
    return {
      success: true,
      count: recordsToInsert.length,
      skippedCount: validRows.length - recordsToInsert.length,
    };
  } catch (error) {
    console.error('Failed to import game logs:', error);
    return { success: false, error: 'Database import failed.' };
  }
}
