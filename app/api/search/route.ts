// app/api/search/route.ts
import { NextResponse } from 'next/server';

interface IGDBGame {
    id: number;
    name: string;
    cover?: { url: string };
    first_release_date?: number;
    hypes?: number;
    follows?: number;
    rating_count?: number;
    version_parent?: number;
    parent_game?: number;
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const query = searchParams.get('q');
  const limit = searchParams.get('limit'); // default to 50 results for full grid

  if (!query || !query.trim()) {
    return NextResponse.json([]);
  }

  try {
    // 1. Fetch OAuth Access Token
    const tokenRes = await fetch(
      `https://id.twitch.tv/oauth2/token?client_id=${process.env.TWITCH_CLIENT_ID}&client_secret=${process.env.TWITCH_CLIENT_SECRET}&grant_type=client_credentials`,
      { method: 'POST' }
    );

    if (!tokenRes.ok) return NextResponse.json([], { status: 500 });
    const tokenData = await tokenRes.json();

    const sanitizedQuery = query.replace(/"/g, '\\"');
    const numericLimit: number = limit ? parseInt(limit, 10) : 50;
    const fetchLimit = Math.min(numericLimit * 2, 100);

    // 2. Query IGDB for games matching query
    const igdbRes = await fetch('https://api.igdb.com/v4/games', {
      method: 'POST',
      headers: {
        'Client-ID': process.env.TWITCH_CLIENT_ID!,
        Authorization: `Bearer ${tokenData.access_token}`,
        'Content-Type': 'text/plain',
      },
      body: `search "${sanitizedQuery}"; fields name, cover.url, first_release_date, hypes, follows, rating_count, version_parent, parent_game; limit ${fetchLimit};`,
    });

    if (!igdbRes.ok) {
        console.error('IGDB API Rejected Payload:', await igdbRes.text());
        return NextResponse.json([]);
    }

    const rawGames : IGDBGame[] = await igdbRes.json();

    const seenTitles = new Map<string, IGDBGame>();

    for (const game of rawGames) {
        const normalizedTitle = game.name
            .toLowerCase()
            .replace(/[^a-z0-9]/g, '');

        const existing = seenTitles.get(normalizedTitle);

        if (!existing) {
            seenTitles.set(normalizedTitle, game);
        } else {
            // caclulate popularity scores for existing vs current
            const currentScore = (game.follows || 0) + (game.hypes || 0) * 2 + (game.rating_count || 0);
            const existingScore = (existing.follows || 0) + (existing.hypes || 0) * 2 + (existing.rating_count || 0);

            // prefer entries with cover image
            if ((!existing.cover && game.cover) || currentScore > existingScore) {
                seenTitles.set(normalizedTitle, game);
            }
        }
    }

    const deduplicated = Array.from(seenTitles.values());

    // Sort deduplicated entries by popularity score
    deduplicated.sort((a, b) => {
        const scoreA = (a.follows ?? 0) + (a.hypes ?? 0) * 2 + (a.rating_count ?? 0);
        const scoreB = (b.follows ?? 0) + (b.hypes ?? 0) * 2 + (b.rating_count ?? 0);
        return Number(scoreB) - Number(scoreA);
    });

    // Slice back down to requested limit and format output

    const formatted = deduplicated.slice(0, numericLimit).map((game: any) => ({
      id: game.id,
      name: game.name,
      coverUrl: game.cover?.url ? `https:${game.cover.url.replace('t_thumb', 't_1080p')}` : null,
      releaseYear: game.first_release_date
        ? new Date(game.first_release_date * 1000).getFullYear()
        : null,
    }));

    return NextResponse.json(formatted);
  } catch (error) {
    console.error('Search API Error:', error);
    return NextResponse.json([], { status: 500 });
  }
}
