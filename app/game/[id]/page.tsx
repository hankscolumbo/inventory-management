// app/game/[id]/page.tsx
import { getGameCommunityData } from '@/app/actions/getGameCommunityData';
import { notFound } from 'next/navigation';
import Link from 'next/link';

interface GamePageProps {
  params: Promise<{
    id: string;
  }>;
}

// 1. TOP-LEVEL HELPER FUNCTION (Outside component body)
async function fetchIgdbGame(gameId: number) {
  try {
    const tokenRes = await fetch(
      `https://id.twitch.tv/oauth2/token?client_id=${process.env.TWITCH_CLIENT_ID}&client_secret=${process.env.TWITCH_CLIENT_SECRET}&grant_type=client_credentials`,
      { method: 'POST', next: { revalidate: 3600 } }
    );

    if (!tokenRes.ok) return null;
    const tokenData = await tokenRes.json();

    const igdbRes = await fetch('https://api.igdb.com/v4/games', {
      method: 'POST',
      headers: {
        'Client-ID': process.env.TWITCH_CLIENT_ID!,
        Authorization: `Bearer ${tokenData.access_token}`,
        'Content-Type': 'text/plain',
      },
      body: `fields name, summary, cover.url, first_release_date, genres.name; where id = ${gameId};`,
      next: { revalidate: 3600 },
    });

    if (!igdbRes.ok) return null;
    const games = await igdbRes.json();
    if (!games || games.length === 0) return null;

    const game = games[0];

    const coverUrl = game.cover?.url
      ? `https:${game.cover.url.replace('t_thumb', 't_cover_big')}`
      : null;

    const releaseYear = game.first_release_date
      ? new Date(game.first_release_date * 1000).getFullYear()
      : null;

    const genres = game.genres?.map((g: { name: string }) => g.name).join(', ') || 'Game';

    return {
      id: game.id,
      name: game.name,
      summary: game.summary || 'No description available for this game.',
      coverUrl,
      releaseYear,
      genres,
    };
  } catch (error) {
    console.error('Error fetching IGDB details:', error);
    return null;
  }
}

// 2. PAGE COMPONENT
export default async function GameDetailsPage({ params }: GamePageProps) {
  const { id } = await params;
  console.log('>>>> ACCESSED GAME ROUTE WITH ID:', id);
  const gameId = parseInt(id, 10);

  if (isNaN(gameId)) {
    notFound();
  }

  // Fetch IGDB metadata & Neon DB community reviews concurrently
  const [game, communityData] = await Promise.all([
    fetchIgdbGame(gameId),
    getGameCommunityData(gameId),
  ]);

  // If IGDB returns no game for this ID, render Next.js 404
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

          {/* Stats Bar */}
          <div className="flex gap-8 border-y border-slate-800 py-4">
            <div>
              <p className="text-2xl font-bold text-amber-400">
                {communityData.avgRating ? `★ ${communityData.avgRating}` : 'N/A'}
              </p>
              <p className="text-xs text-slate-400 font-medium uppercase tracking-wider">Avg Rating</p>
            </div>
            <div>
              <p className="text-2xl font-bold text-white">{communityData.totalLogs}</p>
              <p className="text-xs text-slate-400 font-medium uppercase tracking-wider">Community Logs</p>
            </div>
          </div>

          {/* Summary */}
          <div className="space-y-2">
            <h3 className="text-sm font-semibold text-slate-300 uppercase tracking-wider">Overview</h3>
            <p className="text-sm text-slate-300 leading-relaxed">{game.summary}</p>
          </div>
        </div>
      </div>

      {/* Community Reviews Section */}
      <section className="space-y-6">
        <h2 className="text-xl font-bold text-white">Community Reviews</h2>

        {communityData.logs.length === 0 ? (
          <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-8 text-center text-slate-500 text-sm">
            No reviews logged for this game yet.
          </div>
        ) : (
          <div className="space-y-4">
            {communityData.logs.map((log) => (
              <div
                key={log.id}
                className="bg-slate-900 border border-slate-800 rounded-xl p-5 space-y-3"
              >
                <div className="flex justify-between items-center">
                  <div className="flex items-center gap-3">
                    {log.user.image ? (
                      <img
                        src={log.user.image}
                        alt={log.user.name || 'User'}
                        className="w-8 h-8 rounded-full border border-slate-700"
                      />
                    ) : (
                      <div className="w-8 h-8 rounded-full bg-purple-600 flex items-center justify-center text-xs font-bold text-white">
                        {log.user.name?.charAt(0) || 'U'}
                      </div>
                    )}
                    <div>
                      <p className="text-sm font-semibold text-white">{log.user.name || 'Gamer'}</p>
                      <p className="text-xs text-slate-500">
                        {new Date(log.playedOn).toLocaleDateString()}
                      </p>
                    </div>
                  </div>

                  {log.rating && (
                    <div className="text-amber-400 font-semibold text-sm">
                      {'★'.repeat(Math.round(log.rating))}
                    </div>
                  )}
                </div>

                {log.review && (
                  <p className="text-sm text-slate-300 italic bg-slate-950/40 p-3 rounded-lg border border-slate-800/60">
                    "{log.review}"
                  </p>
                )}
              </div>
            ))}
          </div>
        )}
      </section>
    </main>
  );
}
