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
  parent_game?: number | object;
  version_parent?: number | object;
}

function isBaseGameTitle(title: string): boolean {
  const lowercaseTitle = title.toLowerCase();
  const excludedKeywords = [
    'deluxe edition', 'gold edition', 'ultimate edition', "collector's edition",
    'collectors edition', 'complete edition', 'game of the year', 'goty',
    'season pass', 'dlc pack', 'expansion pass', 'character pass', 'soundtrack',
    'bundle', 'day one edition', 'tactical edition', 'premium edition',
    'definitive edition', 'anniversary edition', 'digital deluxe',
    'legendary edition', 'special edition',
  ];
  return !excludedKeywords.some((keyword) => lowercaseTitle.includes(keyword));
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const query = searchParams.get('q');
    const pageParam = searchParams.get('page');
    const limitParam = searchParams.get('limit');

    if (!query || query.trim().length < 2) {
      return NextResponse.json({ results: [], hasMore: false, page: 1 });
    }

    const clientId = process.env.TWITCH_CLIENT_ID?.trim();
    const clientSecret = process.env.TWITCH_CLIENT_SECRET?.trim();

    if (!clientId || !clientSecret) {
      console.error('[Search API Error] Missing TWITCH_CLIENT_ID or TWITCH_CLIENT_SECRET');
      return NextResponse.json({ results: [], hasMore: false, page: 1 });
    }

    // 1. Fetch OAuth Access Token
    const tokenRes = await fetch(
      `https://id.twitch.tv/oauth2/token?client_id=${clientId}&client_secret=${clientSecret}&grant_type=client_credentials`,
      { method: 'POST', cache: 'no-store' }
    );

    if (!tokenRes.ok) {
      console.error('[Search API Error] Twitch OAuth failed:', await tokenRes.text());
      return NextResponse.json({ results: [], hasMore: false, page: 1 });
    }

    const tokenData = await tokenRes.json();
    const accessToken = tokenData.access_token;

    if (!accessToken) {
      return NextResponse.json({ results: [], hasMore: false, page: 1 });
    }

    const cleanQuery = query.trim().replace(/"/g, '\\"');
    const page = Math.max(1, pageParam ? parseInt(pageParam, 10) : 1);
    const targetLimit = limitParam ? parseInt(limitParam, 10) : 20;

    const fetchLimit = Math.min(Math.max(targetLimit * 3, 30), 100);
    const igdbOffset = (page - 1) * fetchLimit;

    // 2. APICalypse Payload: `fields` MUST come before `search`
    const bodyPayload = `fields name, cover.url, first_release_date, hypes, follows, rating_count, parent_game, version_parent; search "${cleanQuery}"; limit ${fetchLimit}; offset ${igdbOffset};`;

    const igdbRes = await fetch('https://api.igdb.com/v4/games', {
      method: 'POST',
      headers: {
        'Client-ID': clientId,
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'text/plain',
      },
      cache: 'no-store',
      body: bodyPayload,
    });

    if (!igdbRes.ok) {
      console.error('[Search API Error] IGDB query rejected:', await igdbRes.text());
      return NextResponse.json({ results: [], hasMore: false, page });
    }

    const rawGames: IGDBGame[] = await igdbRes.json();
    if (!Array.isArray(rawGames)) {
      return NextResponse.json({ results: [], hasMore: false, page });
    }

    console.log(`[Search API] Raw IGDB count: ${rawGames.length} for "${query}"`);

    // 3. Filter base games safely in JavaScript
    const baseGames = rawGames.filter((game) => {
      // Exclude child editions or DLC entries if they reference a parent game ID
      if (game.parent_game || game.version_parent) return false;

      // Exclude titles matching special edition keywords
      return isBaseGameTitle(game.name);
    });

    // 4. Deduplicate Titles
    const seenTitles = new Map<string, IGDBGame>();
    for (const game of baseGames) {
      const normalizedTitle = game.name.toLowerCase().replace(/[^a-z0-9]/g, '');
      const releaseYear = game.first_release_date
        ? new Date(game.first_release_date * 1000).getFullYear()
        : 'unknown';
      const dedupeKey = `${normalizedTitle}_{${releaseYear}`;
      const existing = seenTitles.get(dedupeKey);

      if (!existing) {
        seenTitles.set(dedupeKey, game);
      } else {
        const ratingA = game.rating_count || 0;
        const ratingB = existing.rating_count || 0;
        const currentScore = (game.follows || 0) + (game.hypes || 0) * 2 + ratingA;
        const existingScore = (existing.follows || 0) + (existing.hypes || 0) * 2 + ratingB;

        // Prefer entries with a cover image if one exists
        if ((!existing.cover && game.cover) || currentScore > existingScore) {
          seenTitles.set(dedupeKey, game);
        }
      }
    }

    const deduplicated = Array.from(seenTitles.values());

    // 5. Exact Match & Popularity Sorting
    const lowerQuery = query.trim().toLowerCase();
    deduplicated.sort((a, b) => {
      const aName = a.name.toLowerCase();
      const bName = b.name.toLowerCase();

      const aExact = aName === lowerQuery;
      const bExact = bName === lowerQuery;
      if (aExact && !bExact) return -1;
      if (!aExact && bExact) return 1;

      const ratingA = a.rating_count || 0;
      const ratingB = b.rating_count || 0;
      const scoreA = (a.follows || 0) + (a.hypes || 0) * 2 + ratingA * 2;
      const scoreB = (b.follows || 0) + (b.hypes || 0) * 2 + ratingB * 2;
      return scoreB - scoreA;
    });

    // 6. Format Output
    const formatted = deduplicated.slice(0, targetLimit).map((game) => ({
      id: game.id,
      name: game.name,
      coverUrl: game.cover?.url ? `https:${game.cover.url.replace('t_thumb', 't_1080p')}` : null,
      releaseYear: game.first_release_date
        ? new Date(game.first_release_date * 1000).getFullYear()
        : null,
    }));

    console.log(`[Search API] Final returned games: ${formatted.length}`);

    const hasMore = rawGames.length >= fetchLimit;

    return NextResponse.json({
      results: formatted,
      hasMore,
      page,
    });
  } catch (error) {
    console.error('[Search API Fatal Error]:', error);
    return NextResponse.json({ results: [], hasMore: false, page: 1 });
  }
}
