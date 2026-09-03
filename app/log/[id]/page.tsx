// app/log/[id]/page.tsx

import { prisma } from '@/lib/prisma';
import { auth } from '@/lib/auth';
import { notFound } from 'next/navigation';
import Link from 'next/link';
import LogGameButton from '@/components/LogGameButton';

interface LogPageProps {
  params: Promise<{ id: string }>;
}

export default async function LogDetailsPage({ params }: LogPageProps) {
  const { id } = await params;
  const session = await auth();

  const log = await prisma.gameLog.findUnique({
    where: { id },
    include: {
      user: {
        select: {
          id: true,
          username: true,
          name: true,
          image: true,
          email: true,
        },
      },
    },
  });

  if (!log) {
    notFound();
  }

  const isOwner =
    !!session?.user &&
    (session.user.id === log.user.id || session.user.email === log.user.email);

  // Determine back navigation path to game page
  const gamePath = log.igdbId
    ? `/game/${log.igdbId}`
    : log.steamAppId
    ? `/game/${log.steamAppId}?source=steam`
    : null;

  const statusColors: Record<string, string> = {
    PLAYED: 'text-emerald-400 bg-emerald-950/60 border-emerald-800/80',
    PLAYING: 'text-cyan-400 bg-cyan-950/60 border-cyan-800/80',
    'WANT TO PLAY': 'text-purple-400 bg-purple-950/60 border-purple-800/80',
  };

  const displayName = log.user.name || log.user.username || 'User';

  return (
    <main className="max-w-4xl mx-auto px-6 py-10 space-y-8">
      {/* Navigation & Edit Controls */}
      <div className="flex items-center justify-between">
        <Link
          href={gamePath || '/'}
          className="text-xs text-slate-400 hover:text-white transition flex items-center gap-1"
        >
          ← {gamePath ? `Back to ${log.gameTitle}` : 'Back'}
        </Link>

        {isOwner && (
          <LogGameButton
            game={{
              id: log.igdbId || log.steamAppId || 0,
              name: log.gameTitle,
              coverUrl: log.coverUrl,
              isSteamApp: !log.igdbId && Boolean(log.steamAppId),
            }}
            initialLog={{
              status: log.status as any,
              rating: log.rating,
              playtimeHours: log.playtimeHours,
              platforms: log.platforms || [],
              isOwned: log.isOwned,
              review: log.review || '',
              substatus: log.substatus || null,
            }}
          />
        )}
      </div>

      {/* Main Log Display Card */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 sm:p-8 space-y-8 shadow-2xl">
        {/* User Profile Header */}
        <div className="flex items-center justify-between border-b border-slate-800 pb-6">
          <Link
            href={log.user.username ? `/u/${log.user.username}` : '#'}
            className="flex items-center gap-3 group"
          >
            {log.user.image ? (
              <img
                src={log.user.image}
                alt={displayName}
                className="w-12 h-12 rounded-full border-2 border-purple-500/50 object-cover group-hover:border-purple-400 transition"
              />
            ) : (
              <div className="w-12 h-12 rounded-full border-2 border-purple-500/50 bg-purple-950 text-purple-200 font-bold flex items-center justify-center text-base group-hover:border-purple-400 transition">
                {displayName.charAt(0).toUpperCase()}
              </div>
            )}
            <div>
              <h2 className="text-base font-bold text-white group-hover:text-purple-300 transition">
                {displayName}
              </h2>
              {log.user.username && (
                <p className="text-xs font-mono text-slate-400">@{log.user.username}</p>
              )}
            </div>
          </Link>

          <span className="text-xs font-mono text-slate-500">
            {new Date(log.updatedAt).toLocaleDateString('en-US', {
              month: 'short',
              day: 'numeric',
              year: 'numeric',
            })}
          </span>
        </div>

        {/* Game & Log Detail Overview */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 items-start">
          {/* Cover Art */}
          <div className="flex flex-col items-center sm:items-start gap-2">
            {gamePath ? (
              <Link href={gamePath} className="group relative block overflow-hidden rounded-xl">
                {log.coverUrl ? (
                  <img
                    src={log.coverUrl}
                    alt={log.gameTitle}
                    className="w-40 h-56 object-cover rounded-xl border border-slate-800 shadow-xl group-hover:scale-105 transition duration-300"
                  />
                ) : (
                  <div className="w-40 h-56 bg-slate-800 rounded-xl border border-slate-700 flex items-center justify-center text-slate-500 text-xs">
                    No Cover
                  </div>
                )}
              </Link>
            ) : (
              log.coverUrl && (
                <img
                  src={log.coverUrl}
                  alt={log.gameTitle}
                  className="w-40 h-56 object-cover rounded-xl border border-slate-800 shadow-xl"
                />
              )
            )}
          </div>

          {/* Status & Stats */}
          <div className="sm:col-span-2 space-y-5">
            <div>
              <span className="text-[10px] font-mono font-bold text-purple-400 uppercase tracking-widest">
                Log Entry
              </span>
              <h1 className="text-2xl font-extrabold text-white">{log.gameTitle}</h1>
            </div>

            {/* Badges */}
            <div className="flex flex-wrap items-center gap-3 text-xs">
              <span
                className={`px-3 py-1 font-mono font-extrabold rounded-lg border uppercase ${
                  statusColors[log.status] || 'text-slate-300 bg-slate-800 border-slate-700'
                }`}
              >
                {log.status}
              </span>

              {log.rating && log.rating > 0 && (
                <span className="px-3 py-1 bg-amber-950/40 border border-amber-800/50 text-amber-300 font-extrabold rounded-lg">
                  ★ {log.rating} / 5
                </span>
              )}

              {log.playtimeHours !== null && log.playtimeHours > 0 && (
                <span className="px-3 py-1 bg-slate-950 border border-slate-800 text-slate-300 font-mono rounded-lg">
                  ⏱️ {log.playtimeHours} hrs
                </span>
              )}

              {log.isOwned && (
                <span className="px-3 py-1 bg-emerald-950/30 border border-emerald-800/40 text-emerald-400 font-bold rounded-lg">
                  Owned
                </span>
              )}
            </div>

            {/* Platforms */}
            {log.platforms && log.platforms.length > 0 && (
              <div className="space-y-1">
                <span className="text-[10px] uppercase font-bold text-slate-500 tracking-wider">
                  Platforms Played On
                </span>
                <div className="flex flex-wrap gap-1.5">
                  {log.platforms.map((platform) => (
                    <span
                      key={platform}
                      className="px-2.5 py-0.5 bg-slate-950 border border-slate-800 text-slate-300 font-medium text-xs rounded-md"
                    >
                      {platform}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Played Date */}
            {log.playedOn && (
              <p className="text-xs text-slate-400 font-mono">
                Last played:{' '}
                <span className="text-slate-200">
                  {new Date(log.playedOn).toLocaleDateString('en-US', {
                    month: 'long',
                    day: 'numeric',
                    year: 'numeric',
                  })}
                </span>
              </p>
            )}
          </div>
        </div>

        {/* Written Review Section */}
        {log.review ? (
          <div className="border-t border-slate-800 pt-6 space-y-2">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">
              Review & Notes
            </h3>
            <p className="text-slate-200 text-sm leading-relaxed whitespace-pre-line bg-slate-950/60 p-4 rounded-xl border border-slate-800/80">
              {log.review}
            </p>
          </div>
        ) : (
          <div className="border-t border-slate-800 pt-6">
            <p className="text-xs text-slate-500 italic">No written review attached to this entry.</p>
          </div>
        )}
      </div>
    </main>
  );
}
