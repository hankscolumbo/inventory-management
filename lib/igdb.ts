import { prisma } from '@/lib/prisma';

export interface GameDetails {
  igdbId: number;
  name: string;
  summary: string | null;
  coverUrl: string | null;
  releaseYear: number | null;
  genres: string[];
  developers: string[];
  platforms: string[];
}

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

export async function getGameDetails(igdbId: number): Promise<GameDetails | null> {
  if (!igdbId || igdbId <= 0) return null;

  try {
    const cachedGame = await prisma.game.findUnique({
      where: { igdbId },
    });

    if (cachedGame) {
      return cachedGame;
    }

    const clientId = process.env.TWITCH_CLIENT_ID?.trim();
    const token = await getTwitchToken();

    if (!clientId || !token) return null;

    const res = await fetch('https://api.igdb.com/v4/games', {
      method: 'POST',
      headers: {
        'Client-ID': clientId,
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'text/plain',
      },
      cache: 'no-store',
      body: `fields name, summary, cover.url, first_release_date, genres.name, platforms.name, involved_companies.developer, involved_companies.company.name; where id = ${igdbId}; limit 1;`,
    });

    if (!res.ok) return null;
    const games = await res.json();
    if (!Array.isArray(games) || games.length === 0) return null;

    const game = games[0];

    const developers: string[] = (game.involved_companies || [])
      .filter((ic: any) => ic.developer && ic.company?.name)
      .map((ic: any) => ic.company.name);

    const gameData = {
      igdbId: game.id,
      name: game.name,
      summary: game.summary || null,
      coverUrl: game.cover?.url ? `https:${game.cover.url.replace('t_thumb', 't_1080p')}` : null,
      releaseYear: game.first_release_date
        ? new Date(game.first_release_date * 1000).getFullYear()
        : null,
      genres: (game.genres || []).map((g: any) => g.name),
      developers,
      platforms: (game.platforms || []).map((p: any) => p.name),
    };

    return await prisma.game.upsert({
      where: { igdbId: gameData.igdbId },
      update: gameData,
      create: gameData,
    });
  } catch (error) {
    console.error('Failed to fetch/cache IGDB game details:', error);
    return null;
  }
}