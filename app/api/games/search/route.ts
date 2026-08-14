// app/api/games/search/route.ts
import { NextResponse } from 'next/server';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const query = searchParams.get('q');

  if (!query) {
    return NextResponse.json({ error: 'Query parameter "q" is required' }, { status: 400 });
  }

  const clientId = process.env.TWITCH_CLIENT_ID;
  const clientSecret = process.env.TWITCH_CLIENT_SECRET;

  if (!clientId || !clientSecret) {
    console.error('Missing Twitch Environment Variables.');
    return NextResponse.json(
        { error: 'Twitch API Keys are not configured in environment variables.' },
        { status: 500 }
    );
  }

  try {
      // Fetch Access Token from Twitch
    const authRes = await fetch(
    `https://id.twitch.tv/oauth2/token?client_id=${clientId}&client_secret=${clientSecret}&grant_type=client_credentials`,
    { method: 'POST' }
  );

  if (!authRes.ok) {
    const authError = await authRes.json();
    console.error('Twitch Auth Error:', authError);
    return NextResponse.json({ error: 'Failed to authenticate with Twitch API', details: authError }, { status: 500 });
  }
  
  const authData = await authRes.json();

  // Search IGDB for games
  const igdbRes = await fetch('https://api.igdb.com/v4/games', {
    method: 'POST',
    headers: {
      'Client-ID': clientId,
      'Authorization': `Bearer ${authData.access_token}`,
      'Accept': 'application/json',
    },
    body: `search "${query}"; fields name, cover.url, first_release_date; limit 10;`,
  });

    if (!igdbRes.ok) {
    const igdbError = await igdbRes.text();
    console.error('IGDB Auth Error:', igdbError);
    return NextResponse.json({ error: 'Failed to fetch data from IGDB', details: igdbError }, { status: 500 });
  }

  const games = await igdbRes.json();
  return NextResponse.json(games);
} catch (error) {
    console.error('Server error', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
}
}