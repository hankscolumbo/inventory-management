import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { sendErrorAlert } from '@/lib/email';

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

export async function GET(request: Request) {
  const authHeader = request.headers.get('authorization');
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return new NextResponse('Unauthorized', { status: 401 });
  }

  try {
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const staleGames = await prisma.game.findMany({
      where: { updatedAt: { lte: thirtyDaysAgo } },
      take: 20,
      select: { igdbId: true },
    });

    if (staleGames.length === 0) {
      return NextResponse.json({ revalidated: 0, message: 'All cached games up to date.' });
    }

    const clientId = process.env.TWITCH_CLIENT_ID?.trim();
    const token = await getTwitchToken();

    if (!clientId || !token) {
      return new NextResponse('Twitch Auth Failed', { status: 500 });
    }

    const ids = staleGames.map((g) => g.igdbId).join(',');

    const igdbRes = await fetch('https://api.igdb.com/v4/games', {
      method: 'POST',
      headers: {
        'Client-ID': clientId,
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'text/plain',
      },
      cache: 'no-store',
      body: `fields name, summary, cover.url, first_release_date, genres.name, platforms.name, involved_companies.developer, involved_companies.company.name; where id = (${ids}); limit 20;`,
    });

    if (!igdbRes.ok) return new NextResponse('IGDB Fetch Error', { status: 500 });

    const freshGames = await igdbRes.json();
    if (!Array.isArray(freshGames)) return NextResponse.json({ revalidated: 0 });

    let updatedCount = 0;

    for (const game of freshGames) {
      const developers: string[] = (game.involved_companies || [])
        .filter((ic: any) => ic.developer && ic.company?.name)
        .map((ic: any) => ic.company.name);

      await prisma.game.update({
        where: { igdbId: game.id },
        data: {
          name: game.name,
          summary: game.summary || null,
          coverUrl: game.cover?.url ? `https:${game.cover.url.replace('t_thumb', 't_1080p')}` : null,
          releaseYear: game.first_release_date
            ? new Date(game.first_release_date * 1000).getFullYear()
            : null,
          genres: (game.genres || []).map((g: any) => g.name),
          developers,
          platforms: (game.platforms || []).map((p: any) => p.name),
          updatedAt: new Date(),
        },
      });
      updatedCount++;
    }

    return NextResponse.json({ revalidated: updatedCount });
  } catch (error: any) {
    console.error('Failed revalidation cron:', error);
    await sendErrorAlert('Revalidate Games Cron Job', error?.stack || String(error));
    return new NextResponse('Internal Server Error', { status: 500 });
  }
}