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

// Helper to filter out remaining special editions, bundles, and DLC passes
function isBaseGameTitle(title: string): boolean {
  const lowercaseTitle = title.toLowerCase();
  const excludedKeywords = [
    'deluxe edition',
    'gold edition',
    'ultimate edition',
    'collector\'s edition',
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
  ];

  return !excludedKeywords.some((keyword) => lowercaseTitle.includes(keyword));
}

export interface SearchGameResult {
  igdbId: number;
  gameTitle: string;
  coverUrl: string | null;
}

export async function searchGamesForList(query: string): Promise<SearchGameResult[]> {
  if (!query || query.trim().length < 2) return [];

  const clientId = process.env.TWITCH_CLIENT_ID?.trim();
  const token = await getTwitchToken();

  if (!clientId || !token) return [];

  try {
    const cleanQuery = query.replace(/"/g, '\\"');
    const res = await fetch('https://api.igdb.com/v4/games', {
      method: 'POST',
      headers: {
        'Client-ID': clientId,
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'text/plain',
      },
      cache: 'no-store',
      body: `fields name, cover.url; search "${cleanQuery}"; where game_type = (0, 4, 8, 9); limit 15;`,
    });

    if (!res.ok) return [];
    const games = await res.json();

    if (!Array.isArray(games)) return [];

    const baseGamesOnly = games.filter((game: any) => isBaseGameTitle(game.name));

    return baseGamesOnly.slice(0, 15).map((game: any) => {
      const rawCover = game.cover?.url;
      const coverUrl = rawCover
        ? `https:${rawCover.replace('t_thumb', 't_1080p')}`
        : null;

      return {
        igdbId: Number(game.id),
        gameTitle: game.name,
        coverUrl,
      };
    });
  } catch (error) {
    console.error('Error searching games for list:', error);
    return [];
  }
}
