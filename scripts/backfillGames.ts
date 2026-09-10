import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

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

async function runBackfill() {
  console.log('🔍 Checking for Game records needing IGDB metadata...');

  // Find all Games missing cover art or summary details
  const incompleteGames = await prisma.game.findMany({
    where: {
      OR: [
        { coverUrl: null },
        { summary: null },
      ],
      igdbId: { gt: 0 },
    },
    select: { igdbId: true },
  });

  const missingIds = incompleteGames.map((g) => g.igdbId);

  if (missingIds.length === 0) {
    console.log('✅ All Game records already have full IGDB metadata.');
    await prisma.$disconnect();
    return;
  }

  console.log(`📦 Found ${missingIds.length} games to enrich. Fetching from IGDB...`);

  const clientId = process.env.TWITCH_CLIENT_ID?.trim();
  const token = await getTwitchToken();

  if (!clientId || !token) {
    console.error('❌ Twitch authentication failed. Check TWITCH_CLIENT_ID and TWITCH_CLIENT_SECRET.');
    await prisma.$disconnect();
    return;
  }

  const BATCH_SIZE = 10;
  let successCount = 0;

  for (let i = 0; i < missingIds.length; i += BATCH_SIZE) {
    const batch = missingIds.slice(i, i + BATCH_SIZE);
    const queryIds = batch.join(',');

    try {
      const igdbRes = await fetch('https://api.igdb.com/v4/games', {
        method: 'POST',
        headers: {
          'Client-ID': clientId,
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'text/plain',
        },
        body: `fields name, summary, cover.url, first_release_date, genres.name, platforms.name, involved_companies.developer, involved_companies.company.name; where id = (${queryIds}); limit ${BATCH_SIZE};`,
      });

      if (!igdbRes.ok) {
        console.error(`⚠️ IGDB fetch failed for batch: ${queryIds}`);
        continue;
      }

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

        // Also ensure coverUrl cascades to existing GameLogs for this IGDB ID
        if (coverUrl) {
          await prisma.gameLog.updateMany({
            where: { igdbId: game.id, coverUrl: null },
            data: { coverUrl },
          });
        }

        successCount++;
      }

      console.log(`Progress: ${Math.min(i + BATCH_SIZE, missingIds.length)} / ${missingIds.length}`);
      await new Promise((resolve) => setTimeout(resolve, 300));
    } catch (err) {
      console.error('Batch error:', err);
    }
  }

  console.log(`🎉 Backfill complete! Successfully enriched ${successCount} games.`);
  await prisma.$disconnect();
}

runBackfill();