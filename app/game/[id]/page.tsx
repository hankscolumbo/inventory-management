// app/game/[id]/page.tsx
import { getGameCommunityData } from '@/lib/getGameCommunityData'; // aka GameStats
import { notFound } from 'next/navigation';
import Link from 'next/link';
import LogGameButton from '@/components/LogGameButton';

interface GamePageProps {
  params: Promise<{
    id: string;
  }>;
}

function cleanDescription(text: string): string {
  if (!text) return 'No overview available for this title.';

  return text
    // 1. Convert HTML line breaks to standard newlines
    .replace(/<br\s*[\/]?>/gi, '\n')
    // 2. Strip out all remaining HTML tags (e.g. <p>, <strong>, <div>)
    .replace(/<[^>]*>/g, '')
    // 3. Strip BBCode tags (e.g. [b], [/b], [i], [h1])
    .replace(/\[\/?\w+\]/g, '')
    // 4. Decode common HTML entities
    .replace(/&quot;/g, '"')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&#39;/g, "'")
    // 5. Trim duplicate line breaks and whitespace
    .replace(/\n\s*\n/g, '\n\n')
    .trim();
}

async function getTwitchToken(): Promise<string | null> {
  const clientId = process.env.TWITCH_CLIENT_ID?.trim();
  const clientSecret = process.env.TWITCH_CLIENT_SECRET?.trim();

  if (!clientId || !clientSecret) {
    console.error('[IGDB Auth Error] Missing Twitch Client ID or Twitch Client Secret');
    return null;
  }

  // Get Twitch OAuth Token
  try {
    const tokenRes = await fetch(
      `https://id.twitch.tv/oauth2/token?client_id=${clientId}&client_secret=${clientSecret}&grant_type=client_credentials`,
      { method: 'POST', cache: 'no-store' }
    );

    const tokenData = await tokenRes.json();
    console.log('Generated Token:', tokenData.access_token ? 'SUCCESS' : tokenData);

    if (!tokenRes.ok || !tokenData.access_token) {
      console.error('Twitch token request failed:', tokenData);
      return null;
    }
    const accessToken = tokenData.access_token;
    return accessToken;
  } catch (err) {
    console.error('[Twitch OAuth Exception]:', err);
    return null;
  }
}

async function getGameDetails(gameId: string) {
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

    // STEP 1: DIRECT IGDB GAME ID TO LOOKUP
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
        }
      } else {
        console.error('[IGDB Games Direct Lookup Rejected:', await igdbRes.text());
      }
    } catch (e) {
      console.error('[IGDB Direct Lookup Exception]:', e);
    }

    // STEP 2: If the direct IGDB lookup didnt find anything, try IDGB Steam lookup
    if (!game) {
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
          }
        }
      } catch (e) {
        console.error('[IGDB Games Direct Lookup Error:', e);
      }
    }

    // STEP 3: Steam Store API Fallback (for unmapped indie games)      
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

            return {
              id: numericId,
              name: steamDetails.name,
              summary: cleanDescription(rawSummary),
              coverUrl: `https://cdn.cloudflare.steamstatic.com/steam/apps/${gameId}/library_600x900.jpg`,
              genres: Array.isArray(steamDetails.genres)
                ? steamDetails.genres?.map((g: any) => g.description)
                : [],
              platforms: ['PC'],
              releaseYear: steamDetails.release_date?.date
                ? new Date(steamDetails.release_date.date).getFullYear() || null
                : null
            };
          }
        }
      } catch (e) {
        console.error('Steam Store API Fallback Failed:', e);
      }
    }

    // Return only if all 3 lookup strategies fail
    if (!game) return null;

    const coverUrl = game.cover?.url
      ? `https:${game.cover.url.replace('t_thumb', 't_1080p')}`
      : `https://cdn.cloudflare.steamstatic.com/steam/apps/${gameId}/library_600x900.jpg`;

    const releaseYear = game.first_release_date
      ? new Date(game.first_release_date * 1000).getFullYear()
      : null;

    const genres = Array.isArray(game.genres)
      ? game.genres?.map((g: { name: string }) => g.name)
      : [];

    const platforms = Array.isArray(game.platforms)
      ? game.platforms?.map((p: any) => p.name)
      : [];

    return {
      id: game.id || numericId,
      name: game.name || 'Untitled Game',
      summary: cleanDescription(game.summary) || 'No description available for this game.',
      coverUrl,
      releaseYear,
      genres,
      platforms,
    };
  } catch (err) {
    console.error('Error getching game details:', err);
    return null;
  }
}

// 2. PAGE COMPONENT
export default async function GameDetailsPage({ params }: GamePageProps) {
  const { id } = await params;
  const game = await getGameDetails(id);
  const stats = await getGameCommunityData(Number(id));

  if (!game) {
    notFound();
  }

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
            {/* Left Side: Genre Badges */}
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

            {/* Right Side: Release Year */}
            {game.releaseYear && (
              <div className="flex items-center gap-1.5 text-xs font-mono font-bold text-purple-400 bg-purple-950/40 border border-purple-800/40 px-3 py-1 rounded-lg shrink-0">
                <svg className="w-3.5 h-3.5 text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
                {game.releaseYear}
              </div>
            )}

          </div>



          {/* COMMUNITY STATS BAR */}
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
            <div className="border-l border-slate-800 pl-6">
              <span className="font-extrabold text-amber-400 text-base block">
                {stats.backlogCount}
              </span>
              <span className="text-slate-400 uppercase tracking-wider font-semibold text-[10px]">
                Backlog
              </span>
            </div>
          </div>

          {/* Summary */}
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
            id: game.id,
            name: game.name,
            coverUrl: game.coverUrl,
          }}
        />
      </div>

    </main>
  );
}
