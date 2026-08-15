// app/api/games/search/route.ts
import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  const { query } = await request.json();

  if (!query) {
    return NextResponse.json([]);
  }

  // 1. Get Twitch OAuth Token
  const tokenRes = await fetch(
    `https://id.twitch.tv/oauth2/token?client_id=${process.env.TWITCH_CLIENT_ID}&client_secret=${process.env.TWITCH_CLIENT_SECRET}&grant_type=client_credentials`,
    { method: 'POST' }
  );
  const tokenData = await tokenRes.json();

  // 2. Query IGDB API
  const igdbRes = await fetch('https://api.igdb.com/v4/games', {
    method: 'POST',
    headers: {
      'Client-ID': process.env.TWITCH_CLIENT_ID!,
      Authorization: `Bearer ${tokenData.access_token}`,
      'Content-Type': 'text/plain',
    },
    body: `search "${query}"; fields name, cover.url, first_release_date; limit 12;`,
  });

  const games = await igdbRes.json(); // <-- THIS VARIABLE NAME

  if (!Array.isArray(games)) {
    return NextResponse.json([]);
  }

  // 3. Map to consistent frontend properties (coverUrl)
  const formattedGames = games.map((game: any) => ({
    id: game.id,
    name: game.name,
    coverUrl: game.cover?.url
      ? `https:${game.cover.url.replace('t_thumb', 't_cover_big')}`
      : null,
  }));

  return NextResponse.json(formattedGames);
}