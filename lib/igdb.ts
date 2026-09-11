// lib/igdb.ts
import { unstable_cache } from 'next/cache';

/**
 * 1. Cache Twitch OAuth Access Token (Valid for 30 days)
 */
export const getIgdbToken = unstable_cache(
  async (): Promise<string> => {
    const clientId = process.env.TWITCH_CLIENT_ID;
    const clientSecret = process.env.TWITCH_CLIENT_SECRET;

    if (!clientId || !clientSecret) {
      throw new Error('Twitch API credentials missing in environment variables.');
    }

    const res = await fetch(
      `https://id.twitch.tv/oauth2/token?client_id=${clientId}&client_secret=${clientSecret}&grant_type=client_credentials`,
      { method: 'POST' }
    );

    if (!res.ok) {
      throw new Error(`Failed to obtain Twitch OAuth token: ${res.statusText}`);
    }

    const data = await res.json();
    return data.access_token as string;
  },
  ['igdb-access-token'],
  { revalidate: 86400 * 30 }
);

/**
 * 2. Helper for executing raw IGDB queries
 */
export async function queryIgdb<T = any>(endpoint: string, body: string): Promise<T> {
  const token = await getIgdbToken();
  const clientId = process.env.TWITCH_CLIENT_ID!;

  const res = await fetch(`https://api.igdb.com/v4/${endpoint}`, {
    method: 'POST',
    headers: {
      'Client-ID': clientId,
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'text/plain',
    },
    body,
  });

  if (!res.ok) {
    throw new Error(`IGDB API (${endpoint}) Error: ${res.statusText}`);
  }

  return res.json();
}

/**
 * 3. Cached Browse Games Query (Revalidates every 1 hour)
 */
export async function fetchCachedBrowseGames(params: {
  sort: string;
  platform?: string | null;
  genre?: string | null;
  decade?: string | null;
  page: number;
  limit: number;
}) {
  const { sort, platform, genre, decade, page, limit } = params;

  const cacheKey = `browse-${sort}-${platform || 'all'}-${genre || 'all'}-${decade || 'all'}-p${page}-l${limit}`;

  return unstable_cache(
    async () => {
      const offset = (page - 1) * limit;
      const conditions: string[] = ['cover != null'];

      if (platform) conditions.push(`platforms = (${platform})`);
      if (genre) conditions.push(`genres = (${genre})`);
      if (decade) {
        const startYear = parseInt(decade, 10);
        const startTimestamp = Math.floor(new Date(`${startYear}-01-01`).getTime() / 1000);
        const endTimestamp = Math.floor(new Date(`${startYear + 9}-12-31`).getTime() / 1000);
        conditions.push(`first_release_date >= ${startTimestamp} & first_release_date <= ${endTimestamp}`);
      }

      const whereClause = conditions.length > 0 ? `where ${conditions.join(' & ')};` : '';

      const body = `
        fields name, cover.url, first_release_date, total_rating;
        ${whereClause}
        sort ${sort};
        limit ${limit};
        offset ${offset};
      `;

      const rawGames = await queryIgdb('games', body);

      return rawGames.map((g: any) => ({
        id: g.id,
        name: g.name,
        coverUrl: g.cover?.url ? `https:${g.cover.url.replace('t_thumb', 't_cover_big')}` : null,
        releaseYear: g.first_release_date
          ? new Date(g.first_release_date * 1000).getFullYear()
          : null,
        rating: g.total_rating ? Math.round(g.total_rating) : null,
      }));
    },
    [cacheKey],
    { revalidate: 3600 }
  )();
}