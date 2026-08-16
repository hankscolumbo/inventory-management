// app/u/[username]/page.tsx
import { getPublicProfile } from '@/lib/getPublicProfile';
import { notFound } from 'next/navigation';
import Link from 'next/link';

interface PageProps {
  params: Promise<{ username: string }>;
}

export default async function PublicProfilePage({ params }: PageProps) {
  const { username } = await params;
  const profile = await getPublicProfile(username);

  if (!profile) {
    notFound();
  }

  const playedCount = profile.logs.filter((l) => l.status === 'PLAYED').length;
  const playingCount = profile.logs.filter((l) => l.status === 'PLAYING').length;
  const backlogCount = profile.logs.filter((l) => l.status === 'BACKLOG').length;

  return (
    <div className="max-w-5xl mx-auto px-4 py-8 space-y-8">
      {/* Header Banner */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 sm:p-8 flex flex-col sm:flex-row items-center gap-6 shadow-xl">
        {profile.image ? (
          <img
            src={profile.image}
            alt={profile.name || username}
            className="w-24 h-24 rounded-full border-2 border-purple-500/50 object-cover"
          />
        ) : (
          <div className="w-24 h-24 rounded-full bg-slate-800 border-2 border-slate-700 flex items-center justify-center text-2xl font-bold text-slate-400">
            {username[0]?.toUpperCase()}
          </div>
        )}

        <div className="text-center sm:text-left space-y-2 flex-1">
          <h1 className="text-2xl font-extrabold text-white">
            {profile.name || username}
          </h1>
          <p className="text-xs text-purple-400 font-mono">@{profile.username}</p>
          
          {/* Stats Bar */}
          <div className="flex justify-center sm:justify-start gap-6 pt-2 text-xs">
            <div>
              <span className="font-bold text-white text-base">{playedCount}</span>
              <span className="text-slate-400 block">Played</span>
            </div>
            <div>
              <span className="font-bold text-white text-base">{playingCount}</span>
              <span className="text-slate-400 block">Playing</span>
            </div>
            <div>
              <span className="font-bold text-white text-base">{backlogCount}</span>
              <span className="text-slate-400 block">Backlog</span>
            </div>
          </div>
        </div>
      </div>

      {/* Game Logs Grid */}
      <div className="space-y-4">
        <h2 className="text-lg font-bold text-white">Game Collection</h2>

        {profile.logs.length === 0 ? (
          <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-8 text-center text-slate-500 text-sm">
            No games logged yet.
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
            {profile.logs.map((log) => (
              <Link
                key={log.id}
                href={`/game/${log.externalGameId}`}
                className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden hover:border-slate-700 hover:scale-[1.02] transition flex flex-col group shadow-lg"
              >
                <div className="aspect-[3/4] w-full bg-slate-800 relative">
                  {log.coverUrl ? (
                    <img
                      src={log.coverUrl}
                      alt={log.gameTitle}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-xs text-slate-500">
                      No Cover
                    </div>
                  )}
                  {/* Status Badge */}
                  <span className="absolute top-2 right-2 px-2 py-0.5 text-[10px] font-bold uppercase rounded bg-slate-950/80 text-purple-300 border border-purple-500/30">
                    {log.status}
                  </span>
                </div>

                <div className="p-3 flex-1 flex flex-col justify-between space-y-1">
                  <h3 className="text-xs font-bold text-slate-100 group-hover:text-purple-400 line-clamp-1 transition">
                    {log.gameTitle}
                  </h3>
                  
                  {log.rating && (
                    <div className="text-yellow-400 text-xs">
                      {'★'.repeat(Math.round(log.rating))}
                      {'☆'.repeat(5 - Math.round(log.rating))}
                    </div>
                  )}
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}