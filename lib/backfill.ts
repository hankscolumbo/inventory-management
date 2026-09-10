// lib/backfill.ts
import { prisma } from '@/lib/prisma';

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

export async function processBackfillBatch(batchLimit = 30) {
  const incompleteGames = await prisma.game.findMany({
    where: {
      OR: [{ coverUrl: null }, { summary: null }],
      igdbId: { gt: 0 },
    },
    select: { igdbId: true },
    take: batchLimit,
  });

  const missingIds = incompleteGames.map((g) => g.igdbId);
  if (missingIds.length === 0) return { processed: 0, remaining: 0 };

  const clientId = process.env.TWITCH_CLIENT_ID?.trim();
  const token = await getTwitchToken();
  if (!clientId || !token) throw new Error('Twitch authentication failed');

  let successCount = 0;
  const BATCH_SIZE = 10;

  for (let i = 0; i < missingIds.length; i += BATCH_SIZE) {
    const batch = missingIds.slice(i, i + BATCH_SIZE);
    const queryIds = batch.join(',');

    const igdbRes = await fetch('https://api.igdb.com/v4/games', {
      method: 'POST',
      headers: {
        'Client-ID': clientId,
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'text/plain',
      },
      body: `fields name, summary, cover.url, first_release_date, genres.name, platforms.name, involved_companies.developer, involved_companies.company.name; where id = (${queryIds}); limit ${BATCH_SIZE};`,
    });

    if (!igdbRes.ok) continue;

    const freshGames = await igdbRes.json();

    for (const game of freshGames) {
      const developers: string[] = (game.involved_companies || [])
        .filter((ic: any) => ic.developer && ic.company?.name)
        .map((ic: any) => ic.company.name);

      const coverUrl = game.cover?.url
        ? `https:${game.cover.url.replace('t_thumb', 't_1080p')}`
        : null;

      await prisma.game.upsert({
        where: { igdbId: game.id },
        update: {
          name: game.name,
          summary: game.summary || null,
          coverUrl,
          releaseYear: game.first_release_date
            ? new Date(game.first_release_date * 1000).getFullYear()
            : null,
          genres: (game.genres || []).map((g: any) => g.name),
          developers,
          platforms: (game.platforms || []).map((p: any) => p.name),
        },
        create: {
          igdbId: game.id,
          name: game.name,
          summary: game.summary || null,
          coverUrl,
          releaseYear: game.first_release_date
            ? new Date(game.first_release_date * 1000).getFullYear()
            : null,
          genres: (game.genres || []).map((g: any) => g.name),
          developers,
          platforms: (game.platforms || []).map((p: any) => p.name),
        },
      });

      if (coverUrl) {
        await prisma.gameLog.updateMany({
          where: { igdbId: game.id, coverUrl: null },
          data: { coverUrl },
        });
      }

      successCount++;
    }

    await new Promise((resolve) => setTimeout(resolve, 300));
  }

  const remaining = await prisma.game.count({
    where: {
      OR: [{ coverUrl: null }, { summary: null }],
      igdbId: { gt: 0 },
    },
  });

  return { processed: successCount, remaining };
}