// lib/getHomePageData.ts
import { prisma } from '@/lib/prisma';


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


async function fetchIgdbReleases(whereClause: string, sortClause: string, limit = 18) {
  const clientId = process.env.TWITCH_CLIENT_ID?.trim();
  const token = await getTwitchToken();
  if (!clientId || !token) return [];


  try {
    const res = await fetch('https://api.igdb.com/v4/games', {
      method: 'POST',
      headers: {
        'Client-ID': clientId,
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'text/plain',
      },
      next: { revalidate: 3600 },
      // 🔽 Enforce cover != null to skip unmapped games
      body: `fields id, name, cover.url, first_release_date, hypes, rating_count; where ${whereClause} & game_type = (0, 3, 4, 8, 9, 10, 11) & version_parent = null & cover != null; ${sortClause} limit ${limit};`,
    });


    if (!res.ok) return [];
    const games = await res.json();
    return Array.isArray(games)
      ? games.map((g: any) => ({
          igdbId: Number(g.id),
          gameTitle: g.name,
          coverUrl: g.cover?.url ? `https:${g.cover.url.replace('t_thumb', 't_1080p')}` : null,
          releaseDateFormatted: g.first_release_date
            ? new Date(g.first_release_date * 1000).toLocaleDateString('en-US', {
                month: 'short',
                day: 'numeric',
                timeZone: 'UTC',
            })
            : null,
        }))
      : [];
  } catch {
    return [];
  }
}


export async function getHomePageData() {
  const now = Math.floor(Date.now() / 1000);
  const oneWeekAgo = now - 7 * 24 * 60 * 60;
  const twoWeeksAhead = now + 30 * 24 * 60 * 60; // Expanded to 30 days to capture more hyped titles


  const [mostPlayed, mostWanted, activeLogs, newlyReleased, upcoming, communityLists] =
    await Promise.all([
      prisma.gameLog.groupBy({
        by: ['igdbId', 'steamAppId', 'gameTitle', 'coverUrl'],
        where: { status: 'PLAYED' },
        _count: { userId: true },
        orderBy: { _count: { userId: 'desc' } },
        take: 24,
      }),


      prisma.gameLog.groupBy({
        by: ['igdbId', 'steamAppId', 'gameTitle', 'coverUrl'],
        where: { status: 'WANT TO PLAY' },
        _count: { userId: true },
        orderBy: { _count: { userId: 'desc' } },
        take: 24,
      }),


      prisma.gameLog.findMany({
        where: { status: 'PLAYING' },
        select: {
          id: true,
          gameTitle: true,
          coverUrl: true,
          igdbId: true,
          steamAppId: true,
          user: {
            select: { username: true, name: true, image: true },
          },
        },
        orderBy: { updatedAt: 'desc' },
        take: 24,
      }),


      // 🔽 Newly Released: Filter by rating_count > 0 or sort by rating_count desc
      fetchIgdbReleases(
        `first_release_date >= ${oneWeekAgo} & first_release_date <= ${now}`,
        'sort rating_count desc;',
        18
      ),


      // 🔽 Upcoming Releases: Sort primarily by hypes desc
      fetchIgdbReleases(
        `first_release_date > ${now} & first_release_date <= ${twoWeeksAhead}`,
        'sort hypes desc;',
        18
      ),


      prisma.customList.findMany({
        where: { isPrivate: false },
        include: {
          user: { select: { username: true, name: true, image: true } },
          _count: { select: { items: true, followers: true } },
        },
        orderBy: { updatedAt: 'desc' },
        take: 6,
      }),
    ]);


  return { mostPlayed, mostWanted, activeLogs, newlyReleased, upcoming, communityLists };
}