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

// 1. TOP-LEVEL HELPER FUNCTION (Outside component body)
async function getGameDetails(gameId: string) {
  try {
    const numericId = Number(gameId);
    if (isNaN(numericId)) return null;

    const rawClientId = process.env.TWITCH_CLIENT_ID?.trim() || '';
    const rawClientSecret = process.env.TWITCH_CLIENT_SECRET?.trim() || '';

    const clientId = rawClientId.replace(/['"\s]/g, '');
    const clientSecret = rawClientSecret.replace(/['"\s]/g, '');

    if (!clientId || !clientSecret) {
      console.error('Missing Twitch Client ID or Twitch Client Secret');
      return null;
    }

    // Get Twitch OAuth Token
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

    const headers = {
      'Client-ID': clientId.trim(),
      'Authorization': `Bearer ${accessToken}`,
      'Content-Type': 'text/plain',
    };

    let game: any = null;

    // Steam App IDs are usually 7+ digits
    // If < 1,000,000 its almost certainly a direct IGDB game Id (???)
    const isLikelyIgdbId = numericId < 1000000;

    if (isLikelyIgdbId) {
      // Query direct IGDB first
      const igdbRes = await fetch('https://api.igdb.com/v4/games', {
        method: 'POST',
        headers,
        cache: 'no-store',
        body: `fields name, summary, cover.url, first_release_date, genres.name, platforms.name; where id = ${numericId};`,
      });


      const games = await igdbRes.json();
      if (Array.isArray(games) && games.length > 0 && !('cause' in games)) {
        game = games[0]
      }
    }

    // If its a 7-digit Id or the direct IGDB lookup didnt find anything, try IDGB Steam lookup
    if (!game) {
      const steamLookupRes = await fetch('https://api.igdb.com/v4/external_games', {
        method: 'POST',
        headers,
        cache: 'no-store',
        body: `fields game.id, game.name, game.summary, game.cover.url, game.first_release_date, game.genres.name, game.platforms.name; where uid = ${gameId} & external_game_source = 1;`,
      });

      const externalGames = await steamLookupRes.json();
      if (Array.isArray(externalGames) && externalGames.length > 0 && externalGames[0]?.game) {
        // Match found via steam app Id!
        game = [externalGames[0].game];
      }
    }

    // STEAM API DIRECT FALLBACK (For indie/new games not mapped in IGDB)

    // Hard Fallback: if IGDB has no record, construct a basic game object
    if (!game || !game.name) {
      try {
        const steamStoreRes = await fetch(
          `https://store.steampowered.com/api/appdetails?appids=${gameId}`,
          { cache: 'no-store' }
        );
        const steamStoreData = await steamStoreRes.json();

        if (steamStoreData?.[gameId]?.success) {
          const steamDetails = steamStoreData[gameId].data;
          const rawSummary = steamDetails.about_the_game || steamDetails.short_description || '';

          return {
            id: numericId,
            name: steamDetails.name,
            summary: cleanDescription(rawSummary),
            //summary: steamDetails.about_the_game || steamDetails.short_description || 'No description available.',
            coverUrl: `https://cdn.cloudflare.steamstatic.com/steam/apps/${gameId}/library_600x900.jpg`,
            genres: steamDetails.genres?.map((g: any) => g.description) || [],
            platforms: ['PC'],
            releaseYear: steamDetails.release_date?.date
              ? new Date(steamDetails.release_date.date).getFullYear() || null
              : null
          };
        }
      } catch (e) {
        console.error('Steam Store API Fallback Failed:', e);
      }

      // Final emergency fallback
      return {
        id: numericId,
        name: `Game ${gameId}`,
        summary: 'No description available for this game',
        coverUrl: `https://cdn.cloudflare.steamstatic.com/steam/apps/${gameId}/library_600x900.jpg`,
        genres: [] as string[],
        platforms: [] as string[],
        releaseYear: null as number | null,
      };
    }

    const coverUrl = game.cover?.url
      ? `https:${game.cover.url.replace('t_thumb', 't_1080p')}`
      : `https://cdn.cloudflare.steamstatic.com/steam/apps/${gameId}/library_600x900.jpg`;

    const releaseYear = game.first_release_date
      ? new Date(game.first_release_date * 1000).getFullYear()
      : null;

    const genres = game.genres?.map((g: { name: string }) => g.name).join(', ') || 'Game';

    const platforms = game.platforms?.map((p: any) => p.name) || [];

    return {
      id: game.id || numericId,
      name: game.name,
      summary: game.summary || 'No description available for this game.',
      coverUrl,
      releaseYear,
      genres,
      platforms,
    };
  } catch (error) {
    console.error('Error fetching IGDB details:', error);
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
          <div>
            <h1 className="text-3xl font-extrabold text-white">{game.name}</h1>
            <p className="text-sm text-slate-400 mt-1">
              {game.releaseYear ? `${game.releaseYear} • ` : ''}{game.genres}
            </p>
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
      <div className="justify-content: flex-end">
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
