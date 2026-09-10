// app/api/browse/route.ts
import { NextResponse } from 'next/server';

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
  const { searchParams } = new URL(request.url);
  const platform = searchParams.get('platform');
  const genre = searchParams.get('genre');
  const decade = searchParams.get('decade');
  const sort = searchParams.get('sort') || 'total_rating_count desc'; // Default to Popularity
  const limit = parseInt(searchParams.get('limit') || '24', 10);
  const page = parseInt(searchParams.get('page') || '1', 10);
  const offset = (page - 1) * limit;

  const clientId = process.env.TWITCH_CLIENT_ID?.trim();
  const token = await getTwitchToken();

  if (!clientId || !token) {
    return new NextResponse('Twitch Auth Failed', { status: 500 });
  }

  // Base condition: Main games, Remasters, Remakes, etc.
  let whereClause = 'game_type = (0, 3, 4, 8, 9, 10, 11) & cover != null';

  // Append dynamic filters
  if (platform) whereClause += ` & platforms = [${platform}]`;
  if (genre) whereClause += ` & genres = [${genre}]`;
  
  if (decade) {
    const startYear = parseInt(decade, 10);
    const endYear = startYear + 9;
    const startUnix = Math.floor(new Date(`${startYear}-01-01`).getTime() / 1000);
    const endUnix = Math.floor(new Date(`${endYear}-12-31`).getTime() / 1000);
    whereClause += ` & first_release_date >= ${startUnix} & first_release_date <= ${endUnix}`;
  } else {
    // Only fetch games with a release date if sorting by newest/oldest to prevent 1970 defaults
    if (sort.includes('first_release_date')) {
      whereClause += ` & first_release_date != null`;
    }
  }

  // To prevent highly-rated but obscure games with 1 review from dominating the "Highest Rated" sort
  if (sort === 'total_rating desc') {
    whereClause += ` & total_rating_count > 50`;
  }

  const queryBody = `fields name, cover.url, first_release_date, total_rating, total_rating_count; where ${whereClause}; sort ${sort}; limit ${limit}; offset ${offset};`;

  try {
    const igdbRes = await fetch('https://api.igdb.com/v4/games', {
      method: 'POST',
      headers: {
        'Client-ID': clientId,
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'text/plain',
      },
      cache: 'no-store',
      body: queryBody,
    });

    if (!igdbRes.ok) throw new Error('IGDB request failed');

    const games = await igdbRes.json();

    // Map responses to frontend interface
    const results = games.map((game: any) => ({
      id: game.id,
      name: game.name,
      coverUrl: game.cover?.url ? `https:${game.cover.url.replace('t_thumb', 't_1080p')}` : null,
      releaseYear: game.first_release_date ? new Date(game.first_release_date * 1000).getFullYear() : null,
      rating: game.total_rating ? Math.round(game.total_rating) : null,
    }));

    return NextResponse.json(results);
  } catch (error) {
    console.error('Browse API Error:', error);
    return new NextResponse('Internal Server Error', { status: 500 });
  }
}
