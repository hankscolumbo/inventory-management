// app/api/browse/route.ts
import { NextResponse } from 'next/server';
import { fetchCachedBrowseGames } from '@/lib/igdb';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);

  const sort = searchParams.get('sort') || 'total_rating desc';
  const platform = searchParams.get('platform');
  const genre = searchParams.get('genre');
  const decade = searchParams.get('decade');
  const page = parseInt(searchParams.get('page') || '1', 10);
  const limit = parseInt(searchParams.get('limit') || '24', 10);

  try {
    const games = await fetchCachedBrowseGames({
      sort,
      platform,
      genre,
      decade,
      page,
      limit,
    });

    return NextResponse.json(games);
  } catch (error) {
    console.error('Error in /api/browse route:', error);
    return NextResponse.json(
      { error: 'Failed to fetch browse results.' },
      { status: 500 }
    );
  }
}