// app/u/[username]/page.tsx
import { getPublicProfile } from '@/lib/getPublicProfile';
import { auth } from '@/app/api/auth/[...nextauth]/route';
import { notFound } from 'next/navigation';
import Link from 'next/link';
import SyncSteamButton from '@/components/SyncSteamButton';

interface PageProps {
  params: Promise<{ username: string }>;
}

export default async function PublicProfilePage({ params }: PageProps) {
  const { username } = await params;
  const [profile, session] = await Promise.all([
    getPublicProfile(username),
    auth(),
  ]);

  if (!profile) {
    notFound();
  }

  // Check if current logged-in user is viewing their own profile
  const isOwner = session?.user?.email && session.user.username === profile.username;

  const playedCount = profile.logs.filter((l) => l.status === 'PLAYED').length;
  const playingCount = profile.logs.filter((l) => l.status === 'PLAYING').length;
  const backlogCount = profile.logs.filter((l) => l.status === 'BACKLOG').length;

  return (
    <div className="max-w-5xl mx-auto px-4 py-8 space-y-8">
      {/* Header Banner */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 sm:p-8 flex flex-col sm:flex-row items-center justify-between gap-6 shadow-xl">
        <div className="flex flex-col sm:flex-row items-center gap-6">
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

          <div className="text-center sm:text-left space-y-2">
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

        {/* Sync Button (Shown only to profile owner if Steam is linked) */}
        {isOwner && (
          <div className="shrink-0">
            <SyncSteamButton hasSteamLinked={Boolean(profile.steamId)} />
          </div>
        )}
      </div>

      {/* User Custom Lists Section */}
        <div className="space-y-4 pt-6">
        <h2 className="text-lg font-bold text-white">Custom Lists</h2>

        {profile.lists.length === 0 ? (
            <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-6 text-center text-slate-500 text-sm">
            No public lists created yet.
            </div>
        ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {profile.lists.map((list) => (
                <div key={list.id} className="bg-slate-900 border border-slate-800 rounded-xl p-4 space-y-3 hover:border-slate-700 transition">
                <div>
                    <h3 className="font-bold text-white text-sm">{list.title}</h3>
                    {list.description && (
                    <p className="text-xs text-slate-400 line-clamp-2 mt-0.5">{list.description}</p>
                    )}
                </div>

                {/* List Cover Grid Preview */}
                <div className="grid grid-cols-4 gap-1.5 bg-slate-950 p-2 rounded-lg">
                    {list.items.map((item) => (
                    <div key={item.id} className="aspect-[3/4] bg-slate-800 rounded overflow-hidden">
                        {item.coverUrl ? (
                        <img src={item.coverUrl} alt={item.gameTitle} className="w-full h-full object-cover" />
                        ) : (
                        <div className="w-full h-full flex items-center justify-center text-[8px] text-slate-600">No Cover</div>
                        )}
                    </div>
                    ))}
                </div>
                </div>
            ))}
            </div>
        )}
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
            <span className="absolute top-2 right-2 px-2 py-0.5 text-[10px] font-bold uppercase rounded bg-slate-950/80 text-purple-300 border border-purple-500/30 backdrop-blur-sm">
              {log.status}
            </span>

            {/* Steam Playtime Badge */}
            {typeof log.playtimeHours === 'number' && log.playtimeHours > 0 && (
              <span className="absolute bottom-2 left-2 px-2 py-0.5 text-[10px] font-semibold rounded bg-slate-950/90 text-slate-200 border border-slate-800 backdrop-blur-sm flex items-center gap-1">
                <svg className="w-2.5 h-2.5 text-sky-400" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M12 2C6.486 2 2 6.486 2 12s4.486 10 10 10 10-4.486 10-10S17.514 2 12 2zm0 18c-4.411 0-8-3.589-8-8s3.589-8 8-8 8 3.589 8 8-3.589 8-8 8zm1-13h-2v6l5.25 3.15.75-1.23-4.5-2.67V7z" />
                </svg>
                {log.playtimeHours}h
              </span>
            )}
          </div>

          {/* Game Title & Review Rating */}
                <div className="p-3 flex-1 flex flex-col justify-between space-y-1.5">
                  <h3 className="text-xs font-bold text-slate-100 group-hover:text-purple-400 line-clamp-1 transition">
                    {log.gameTitle}
                  </h3>

                  {log.rating ? (
                    <div className="text-amber-400 text-[11px] tracking-wider">
                      {'★'.repeat(Math.round(log.rating))}
                      <span className="text-slate-700">
                        {'★'.repeat(5 - Math.round(log.rating))}
                      </span>
                    </div>
                  ) : (
                    <span className="text-[10px] text-slate-500 italic">Unrated</span>
                  )}
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>

      {/* Custom Lists Section (Renders if user has lists) */}
      {profile.lists && profile.lists.length > 0 && (
        <div className="space-y-4 pt-6 border-t border-slate-800/80">
          <h2 className="text-xl font-extrabold text-white tracking-tight">Public Lists</h2>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {profile.lists.map((list) => (
              <div
                key={list.id}
                className="bg-slate-900 border border-slate-800 rounded-xl p-4 space-y-3 hover:border-slate-700 transition shadow-lg"
              >
                <div>
                  <h3 className="font-bold text-white text-sm">{list.title}</h3>
                  {list.description && (
                    <p className="text-xs text-slate-400 line-clamp-2 mt-1">{list.description}</p>
                  )}
                </div>

                {/* List Preview Thumbnails */}
                {list.items && list.items.length > 0 && (
                  <div className="grid grid-cols-4 gap-1.5 bg-slate-950 p-2 rounded-lg border border-slate-800/50">
                    {list.items.slice(0, 4).map((item) => (
                      <div key={item.id} className="aspect-[3/4] bg-slate-800 rounded overflow-hidden">
                        {item.coverUrl ? (
                          <img src={item.coverUrl} alt={item.gameTitle} className="w-full h-full object-cover" />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-[8px] text-slate-600">
                            No Cover
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}