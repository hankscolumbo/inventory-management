// app/actions/searchGamesForList.ts
'use server';

async function getTwitchToken() {
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

function isBaseGameTitle(title: string): boolean {
  const lowercaseTitle = title.toLowerCase();
  const excludedKeywords = [
    'deluxe edition',
    'gold edition',
    'ultimate edition',
    'collector\'s edition',
    'collectors edition',
    'complete edition',
    'game of the year',
    'goty',
    'season pass',
    'dlc pack',
    'expansion pass',
    'character pass',
    'soundtrack',
    'bundle',
    'day one edition',
    'tactical edition',
    'premium edition',
    'definitive edition',
    'anniversary edition',
    'digital deluxe',
    'legendary edition',
    'special edition',
  ];

  return !excludedKeywords.some((keyword) => lowercaseTitle.includes(keyword));
}

export interface SearchGameResult {
  igdbId: number;
  gameTitle: string;
  coverUrl: string | null;
  releaseYear: number | null;
}

export async function searchGamesForList(query: string): Promise<SearchGameResult[]> {
  const trimmedQuery = query.trim();
  if (!trimmedQuery || trimmedQuery.length < 2) return [];

  const clientId = process.env.TWITCH_CLIENT_ID?.trim();
  const token = await getTwitchToken();

  if (!clientId || !token) return [];

  try {
    const cleanQuery = trimmedQuery.replace(/"/g, '\\"');

    // 1. Request popularity fields: `total_rating_count` and `follows`
    const res = await fetch('https://api.igdb.com/v4/games', {
      method: 'POST',
      headers: {
        'Client-ID': clientId,
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'text/plain',
      },
      cache: 'no-store',
      body: `fields name, cover.url, first_release_date, game_type, version_parent, parent_game, total_rating_count, follows; search "${cleanQuery}"; where game_type = (0, 3, 4, 8, 9, 10, 11) & version_parent = null & parent_game = null & cover != null; limit 50;`,
    });

    if (!res.ok) return [];
    const games = await res.json();

    if (!Array.isArray(games)) return [];

    // 2. Filter base games only
    const baseGames = games.filter((game: any) => isBaseGameTitle(game.name));

    // 3. Deduplicate results by title
    const seenTitles = new Set<string>();
    const uniqueGames: any[] = [];

    for (const game of baseGames) {
      const normalizedTitle = game.name.toLowerCase().trim();
      if (!seenTitles.has(normalizedTitle)) {
        seenTitles.add(normalizedTitle);
        uniqueGames.push(game);
      }
    }

    // 4. Hybrid Popularity Sort
    const lowerQuery = trimmedQuery.toLowerCase();
    uniqueGames.sort((a: any, b: any) => {
      const aName = a.name.toLowerCase();
      const bName = b.name.toLowerCase();

      // Rule A: Exact title match ALWAYS goes to top
      const aExact = aName === lowerQuery;
      const bExact = bName === lowerQuery;
      if (aExact && !bExact) return -1;
      if (!aExact && bExact) return 1;

      // Rule B: Calculate popularity score based on ratings and follows
      const aScore = (a.total_rating_count || 0) * 2 + (a.follows || 0);
      const bScore = (b.total_rating_count || 0) * 2 + (b.follows || 0);

      // Higher popularity score ranks first
      return bScore - aScore;
    });

    // 5. Return top 15 popular matching results
    return uniqueGames.slice(0, 15).map((game: any) => {
      const rawCover = game.cover?.url;
      const coverUrl = rawCover
        ? `https:${rawCover.replace('t_thumb', 't_1080p')}`
        : null;

      const releaseYear = game.first_release_date
        ? new Date(game.first_release_date * 1000).getFullYear()
        : null;

      return {
        igdbId: Number(game.id),
        gameTitle: game.name,
        coverUrl,
        releaseYear,
      };
    });
  } catch (error) {
    console.error('Error searching games for list:', error);
    return [];
  }
}