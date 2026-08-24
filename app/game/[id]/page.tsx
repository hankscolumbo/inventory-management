// app/game/[id]/page.tsx
import { getGameCommunityData } from '@/lib/getGameCommunityData';
import { notFound } from 'next/navigation';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import Link from 'next/link';
import LogGameButton from '@/components/LogGameButton';
import AddToListModal from '@/components/AddToListModal';

interface GamePageProps {
  params: Promise<{
    id: string;
  }>;
  searchParams?: Promise<{
    source?: 'steam' | 'igdb';
  }>;
}

function cleanDescription(text: string): string {
  if (!text) return 'No overview available for this title.';

  return text
    .replace(/<br\s*[\/]?>/gi, '\n')
    .replace(/<[^>]*>/g, '')
    .replace(/\[\/?\w+\]/g, '')
    .replace(/&quot;/g, '"')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&#39;/g, "'")
    .replace(/\n\s*\n/g, '\n\n')
    .trim();
}

function parseReleaseInfo(timestamp?: number | null, fallbackDateStr?: string | null, comingSoonFallback?: boolean) {
  if (timestamp) {
    const releaseDate = new Date(timestamp * 1000);
    const isUpcoming = releaseDate.getTime() > Date.now();
    const formatted = releaseDate.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
    return { releaseDate: formatted, isUpcoming, releaseYear: releaseDate.getFullYear() };
  }

  if (fallbackDateStr) {
    const parsedDate = Date.parse(fallbackDateStr);
    const isUpcoming = comingSoonFallback || (!isNaN(parsedDate) && parsedDate > Date.now());
    return { releasedDate: fallbackDateStr, isUpcoming, releaseYear: !isNaN(parsedDate) ? new Date(parsedDate).getFullYear() : null };
  }

  return { releasedDate: null, isUpcoming: false, releaseYear: null };
}

async function getTwitchToken(): Promise<string | null> {
  const clientId = process.env.TWITCH_CLIENT_ID?.trim();
  const clientSecret = process.env.TWITCH_CLIENT_SECRET?.trim();

  if (!clientId || !clientSecret) {
    console.error('[IGDB Auth Error] Missing Twitch Client ID or Secret');
    return null;
  }

  try {
    const tokenRes = await fetch(
      `https://id.twitch.tv/oauth2/token?client_id=${clientId}&client_secret=${clientSecret}&grant_type=client_credentials`,
      { method: 'POST', cache: 'no-store' }
    );

    const tokenData = await tokenRes.json();
    if (!tokenRes.ok || !tokenData.access_token) {
      console.error('Twitch token request failed:', tokenData);
      return null;
    }
    return tokenData.access_token;
  } catch (err) {
    console.error('[Twitch OAuth Exception]:', err);
    return null;
  }
}

async function getGameDetails(gameId: string, isSteamAppExplicit: boolean) {
  try {
    const numericId = Number(gameId);
    if (isNaN(numericId)) return null;

    const clientId = process.env.TWITCH_CLIENT_ID?.trim();
    const token = await getTwitchToken();

    if (!clientId || !token) return null;

    const headers = {
      'Client-ID': clientId.trim(),
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'text/plain',
    };

    let game: any = null;

    // STEP 1: Direct IGDB Game ID Lookup
    if (!isSteamAppExplicit && clientId && token) {
      try {
        const igdbRes = await fetch('https://api.igdb.com/v4/games', {
          method: 'POST',
          headers,
          cache: 'no-store',
          body: `fields name, summary, cover.url, first_release_date, genres.name, platforms.name; where id = ${numericId};`,
        });

        if (igdbRes.ok) {
          const games = await igdbRes.json();
          if (Array.isArray(games) && games.length > 0) {
            game = games[0];
            const { releaseDate, isUpcoming, releaseYear } = parseReleaseInfo(game.first_release_date);

            return {
              igdbId: Number(game.id),
              steamAppId: null as number | null,
              name: game.name || 'Untitled Game',
              summary: cleanDescription(game.summary),
              coverUrl: game.cover?.url
                ? `https:${game.cover.url.replace('t_thumb', 't_1080p')}`
                : null,
              releaseYear,
              releaseDate,
              isUpcoming,
              genres: Array.isArray(game.genres)
                ? game.genres.map((g: { name: string }) => g.name)
                : [],
              platforms: Array.isArray(game.platforms) ? game.platforms.map((p: { name: string }) => p.name) : [],
            };
          }
        }
      } catch (e) {
        console.error('[IGDB Direct Lookup Exception]:', e);
      }
    }

    // STEP 2: IGDB Steam UID Lookup
    if (clientId && token) {
      try {
        const externalRes = await fetch('https://api.igdb.com/v4/external_games', {
          method: 'POST',
          headers,
          cache: 'no-store',
          body: `fields game.id, game.name, game.summary, game.cover.url, game.first_release_date, game.genres.name, game.platforms.name; where uid = "${gameId}" & external_game_source = 1; limit 1;`,
        });

        if (externalRes.ok) {
          const externalData = await externalRes.json();
          if (Array.isArray(externalData) && externalData.length > 0 && externalData[0]?.game) {
            game = externalData[0].game;
            const { releaseDate, isUpcoming, releaseYear } = parseReleaseInfo(game.first_release_date);

            return {
              igdbId: Number(game.id), // ✅ Fixed igdbdId typo
              steamAppId: numericId,
              name: game.name || 'Untitled Game',
              summary: cleanDescription(game.summary),
              coverUrl: game.cover?.url
                ? `https:${game.cover.url.replace('t_thumb', 't_1080p')}`
                : `https://shared.fastly.steamstatic.com/store_item_assets/steam/apps/${numericId}/library_600x900.jpg`,
              releaseYear,
              releaseDate,
              isUpcoming,
              genres: Array.isArray(game.genres)
                ? game.genres.map((g: { name: string }) => g.name)
                : [],
              platforms: Array.isArray(game.platforms) ? game.platforms.map((p: { name: string }) => p.name) : [],
            };
          }
        }
      } catch (e) {
        console.error('[IGDB External Games Lookup Error]:', e);
      }
    }

    // STEP 3: Steam Store API Fallback
    if (!game) {
      try {
        const steamStoreRes = await fetch(
          `https://store.steampowered.com/api/appdetails?appids=${gameId}`,
          { cache: 'no-store' }
        );
        if (steamStoreRes.ok) {
          const steamStoreData = await steamStoreRes.json();
          if (steamStoreData?.[gameId]?.success) {
            const steamDetails = steamStoreData[gameId].data;
            const rawSummary = steamDetails.short_description || steamDetails.about_the_game || '';
            const { releaseDate, isUpcoming, releaseYear } = parseReleaseInfo(
              null,
              steamDetails.release_date?.date,
              steamDetails.release_date?.coming_soon
            );

            return {
              igdbId: null as number | null,
              steamAppId: numericId,
              name: steamDetails.name,
              summary: cleanDescription(rawSummary),
              coverUrl: `https://shared.fastly.steamstatic.com/store_item_assets/steam/apps/${numericId}/library_600x900.jpg`,
              genres: Array.isArray(steamDetails.genres)
                ? steamDetails.genres?.map((g: any) => g.description)
                : [],
              platforms: ['PC'],
              releaseYear,
              releaseDate,
              isUpcoming,
            };
          }
        }
      } catch (e) {
        console.error('Steam Store API Fallback Failed:', e);
      }
    }

    return null;
  } catch (err) {
    console.error('Error fetching game details:', err);
    return null;
  }
}

export default async function GameDetailsPage({ params, searchParams }: GamePageProps) {
  const { id } = await params;
  const resolvedSearchParams = searchParams ? await searchParams : {};
  const isSteamApp = resolvedSearchParams.source === 'steam';

  const game = await getGameDetails(id, isSteamApp);

  if (!game) {
    notFound();
  }

  // Fetch Session & Active User's Existing Log
  const session = await auth();
  let existingLog = null;

  let userLists: { id: string; title: string }[] = [];

  if (session?.user) {
    const user = await prisma.user.findFirst({
      where: {
        OR: [
          ...(session.user.id ? [{ id: session.user.id }] : []),
          ...(session.user.email ? [{ email: session.user.email }] : []),
        ],
      },
      include: {
        customLists: {
          select: { id: true, title: true },
          orderBy: { updatedAt: 'desc' },
        },
      },
    });

    if (user) {
      userLists = user.customLists || [];

      const conditions: any[] = [];
      if (game.igdbId) conditions.push({ igdbId: game.igdbId });
      if (game.steamAppId) conditions.push({ steamAppId: game.steamAppId });

      if (conditions.length > 0) {
        existingLog = await prisma.gameLog.findFirst({
          where: {
            userId: user.id,
            OR: conditions,
          },
        });
      }
    }
  }

  // Fetch Community Stats
  const stats = await getGameCommunityData({
    igdbId: game.igdbId ?? null,
    steamAppId: game.steamAppId ?? null,
  }).catch(() => ({
    avgRating: null,
    totalLogs: 0,
    playedCount: 0,
    playingCount: 0,
    backlogCount: 0,
  }));

  return (
    <main className="max-w-6xl mx-auto px-6 py-10 space-y-10">
      {/* Back Link */}
      <Link href="/" className="text-xs text-slate-400 hover:text-white transition flex items-center gap-1">
        ← Back to Home
      </Link>

      {/* Main Game Banner */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-8 bg-slate-900 border border-slate-800 rounded-2xl p-6 sm:p-8">
        {/* Cover Poster */}
        <div className="flex flex-col items-center sm:items-start gap-4">
          {game.coverUrl ? (
            <img
              src={game.coverUrl}
              alt={game.name}
              className="w-48 h-64 object-cover rounded-xl border border-slate-700 shadow-xl"
            />
          ) : (
            <div className="w-48 h-64 bg-slate-800 rounded-xl border border-slate-700 shadow-xl flex items-center justify-center text-slate-500 text-sm">
              No Cover
            </div>
          )}
        </div>

        {/* Game Information & Stats */}
        <div className="md:col-span-2 space-y-6">
          {/* Header / Meta Bar */}
          <div className="flex flex-wrap items-center justify-between gap-4 w-full border-b border-slate-800 pb-4">
            <h1 className="text-3xl font-extrabold text-white">{game.name}</h1>
            <div className="flex flex-wrap items-center gap-2">
              {Array.isArray(game.genres) && game.genres.length > 0 ? (
                game.genres.map((genre: string) => (
                  <span
                    key={genre}
                    className="px-2.5 py-1 bg-slate-800 border border-slate-700/60 rounded-lg text-xs font-semibold text-slate-300"
                  >
                    {genre}
                  </span>
                ))
              ) : (
                <span className="text-xs text-slate-500">No genres listed</span>
              )}
            </div>

            {/* Release Date Badge */}
            {game.releaseDate && (
              <div
                className={`flex items-center gap-1.5 text-xs font-mono font-bold px-3 py-1 rounded-lg shrink-0 border ${game.isUpcoming
                  ? 'bg-emerald-950/60 border-emerald-800/80 text-emerald-400'
                  : 'bg-purple-950/40 border-purple-800/40 text-purple-400'
                  }`}
              >
                {/*<svg className="w-3.5 h-3.5 text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>*/}
                <span>{game.isUpcoming ? '🚀 Releases:' : '🗓️ Released:'}</span>
                <span>{game.releaseDate}</span>
              </div>
            )}
          </div>

          {/* Available Platforms Row */}
          <div className="space-y-1.5">
            <span className="text-[10px] uppercase font-bold text-slate-500 tracking-wider">
              Available Platforms
            </span>
            <div className="flex flex-wrap items-center gap-1.5">
              {Array.isArray(game.platforms) && game.platforms.length > 0 ? (
                game.platforms.map((platform: string) => (
                  <span
                    key={platform}
                    className="px-2.5 py-1 bg-slate-950 border border-slate-800 text-slate-300 font-medium text-xs rounded-lg"
                  >
                    {platform}
                  </span>
                ))
              ) : (
                <span className="text-xs text-slate-500 italic">No platforms listed</span>
              )}
            </div>
          </div>

          {/* Community Stats Bar */}
          <div className="flex flex-wrap gap-6 py-3 px-4 bg-slate-950 border border-slate-800 rounded-xl text-xs">
            <div>
              <span className="font-extrabold text-white text-base block">
                {stats.avgRating ? `★ ${stats.avgRating}` : 'N/A'}
              </span>
              <span className="text-slate-400 uppercase tracking-wider font-semibold text-[10px]">
                Avg Rating
              </span>
            </div>
            <div className="border-l border-slate-800 pl-6">
              <span className="font-extrabold text-white text-base block">
                {stats.totalLogs}
              </span>
              <span className="text-slate-400 uppercase tracking-wider font-semibold text-[10px]">
                Logged By
              </span>
            </div>
            <div className="border-l border-slate-800 pl-6">
              <span className="font-extrabold text-emerald-400 text-base block">
                {stats.playedCount}
              </span>
              <span className="text-slate-400 uppercase tracking-wider font-semibold text-[10px]">
                Played
              </span>
            </div>
            <div className="border-l border-slate-800 pl-6">
              <span className="font-extrabold text-cyan-400 text-base block">
                {stats.playingCount}
              </span>
              <span className="text-slate-400 uppercase tracking-wider font-semibold text-[10px]">
                Playing
              </span>
            </div>
          </div>

          {/* Overview */}
          <div className="space-y-2">
            <h3 className="text-sm font-semibold text-slate-300 uppercase tracking-wider">Overview</h3>
            <p className="text-sm text-slate-300 leading-relaxed">{game.summary}</p>
          </div>
        </div>
      </div>

      {/* Client Interactive Log Button */}
      <div className="flex justify-end">
        <LogGameButton
          game={{
            id: game.igdbId || game.steamAppId!,
            name: game.name,
            coverUrl: game.coverUrl,
            isSteamApp: !game.igdbId && Boolean(game.steamAppId),
          }}
          initialLog={
            existingLog
              ? {
                status: existingLog.status as any,
                rating: existingLog.rating,
                playtimeHours: existingLog.playtimeHours,
                platforms: existingLog.platforms || [],
                isOwned: existingLog.isOwned,
                review: (existingLog as any).review || '',
              }
              : undefined
          }
        />
      </div>
      {/* Client Interactive Action Buttons */}
      <div className="flex items-center justify-end gap-3">
        {session?.user && userLists.length > 0 && (
          <AddToListModal
            game={{
              name: game.name,
              coverUrl: game.coverUrl,
              igdbId: game.igdbId,
              steamAppId: game.steamAppId,
            }}
            userLists={userLists}
          />
        )}
      </div>
    </main>
  );
}