// app/page.tsx
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import Link from 'next/link';


export default async function HomePage() {
  const session = await auth();


  // 1. Fetch data in parallel for high performance
  const [recentLogs, trendingLists, userActiveGames] = await Promise.all([
    // Community Recent Activity (logs with reviews or ratings)
    prisma.gameLog.findMany({
      take: 8,
      orderBy: { updatedAt: 'desc' },
      where: {
        OR: [
          { review: { not: null } },
          { rating: { gt: 0 } },
          { status: 'PLAYED' },
        ],
      },
      include: {
        user: { select: { username: true, name: true, image: true } },
      },
    }),


    // Featured / Trending Public Lists
    prisma.customList.findMany({
      where: { isPrivate: false },
      take: 4,
      orderBy: { updatedAt: 'desc' },
      include: {
        user: { select: { username: true, name: true } },
        items: { take: 3, select: { coverUrl: true } },
        _count: { select: { items: true, followers: true } },
      },
    }),


    // Currently playing games for logged-in user
    session?.user?.email
      ? prisma.gameLog.findMany({
          where: {
            user: { email: session.user.email },
            status: 'PLAYING',
          },
          take: 4,
          orderBy: { updatedAt: 'desc' },
        })
      : Promise.resolve([]),
  ]);


  return (
    <div className="max-w-7xl mx-auto px-4 py-8 space-y-12">
      {/* 1. HERO / WELCOME SECTION */}
      {!session ? (
        <div className="bg-gradient-to-r from-purple-950/40 via-slate-900 to-slate-950 border border-purple-900/40 rounded-3xl p-8 sm:p-12 text-center space-y-6 relative overflow-hidden shadow-2xl">
          <div className="max-w-2xl mx-auto space-y-3">
            <span className="px-3 py-1 bg-purple-500/10 text-purple-400 text-xs font-bold rounded-full border border-purple-500/20 uppercase tracking-widest">
              Track • Rate • Share
            </span>
            <h1 className="text-4xl sm:text-5xl font-extrabold text-white tracking-tight">
              Your Gaming Journey, <span className="text-purple-400">Logged.</span>
            </h1>
            <p className="text-sm sm:text-base text-slate-300">
              Keep track of what you're playing, sync your Steam library, build custom lists, and discover what the community thinks.
            </p>
          </div>
          <div className="flex justify-center gap-4 pt-2">
            <Link
              href="/login"
              className="px-6 py-3 bg-purple-600 hover:bg-purple-500 text-white font-bold text-sm rounded-xl transition shadow-lg shadow-purple-900/30"
            >
              Get Started Free
            </Link>
          </div>
        </div>
      ) : (
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 sm:p-8 space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-extrabold text-white">
                Welcome back, {session.user?.name || 'Gamer'}! 👋
              </h1>
              <p className="text-xs text-slate-400 mt-0.5">
                Here's what is happening across playLog today.
              </p>
            </div>
          </div>


          {/* Currently Playing Quick Bar */}
          {userActiveGames.length > 0 && (
            <div className="space-y-3 pt-4 border-t border-slate-800">
              <span className="text-xs font-bold uppercase tracking-wider text-cyan-400 block">
                🎮 Continue Playing
              </span>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {userActiveGames.map((game) => (
                  <Link
                    key={game.id}
                    href={game.igdbId ? `/game/${game.igdbId}` : '#'}
                    className="bg-slate-950 border border-slate-800/80 p-2.5 rounded-xl hover:border-purple-500/50 transition flex items-center gap-3 group"
                  >
                    <img
                      src={game.coverUrl || '/placeholder.png'}
                      alt={game.gameTitle}
                      className="w-10 h-14 object-cover rounded-lg bg-slate-900"
                    />
                    <div className="min-w-0 flex-1">
                      <h4 className="text-xs font-bold text-white truncate group-hover:text-purple-300 transition">
                        {game.gameTitle}
                      </h4>
                      <p className="text-[10px] text-slate-400 mt-0.5">
                        {game.playtimeHours ? `${game.playtimeHours}h logged` : 'In Progress'}
                      </p>
                    </div>
                  </Link>
                ))}
              </div>
            </div>
          )}
        </div>
      )}


      {/* 2. TRENDING COMMUNITY LISTS */}
      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-bold text-white flex items-center gap-2">
            <span>📋</span> Curated Community Lists
          </h2>
        </div>


        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {trendingLists.map((list) => (
            <Link
              key={list.id}
              href={`/list/${list.id}`}
              className="bg-slate-900 border border-slate-800 p-4 rounded-2xl hover:border-purple-500/50 transition flex flex-col justify-between group space-y-4"
            >
              <div className="space-y-2">
                {/* 3-Cover Stack Preview */}
                <div className="flex gap-1.5 h-20 overflow-hidden rounded-lg bg-slate-950 p-1 border border-slate-800/60">
                  {list.items.length > 0 ? (
                    list.items.map((item, idx) => (
                      <img
                        key={idx}
                        src={item.coverUrl || '/placeholder.png'}
                        alt="Cover"
                        className="w-1/3 h-full object-cover rounded"
                      />
                    ))
                  ) : (
                    <div className="w-full flex items-center justify-center text-[10px] text-slate-600">
                      Empty List
                    </div>
                  )}
                </div>


                <h3 className="text-sm font-bold text-white truncate group-hover:text-purple-300 transition">
                  {list.title}
                </h3>
              </div>


              <div className="flex items-center justify-between text-[11px] text-slate-400 pt-2 border-t border-slate-800/60">
                <span>by @{list.user.username || list.user.name}</span>
                <span className="font-semibold text-purple-400">
                  {list._count.items} games
                </span>
              </div>
            </Link>
          ))}
        </div>
      </section>


      {/* 3. RECENT COMMUNITY ACTIVITY FEED */}
      <section className="space-y-4">
        <h2 className="text-xl font-bold text-white flex items-center gap-2">
          <span>💬</span> Recent Activity
        </h2>


        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {recentLogs.map((log) => (
            <div
              key={log.id}
              className="bg-slate-900 border border-slate-800 rounded-2xl p-4 flex gap-4 items-start shadow-sm hover:border-slate-700 transition"
            >
              {/* Game Cover */}
              <img
                src={log.coverUrl || '/placeholder.png'}
                alt={log.gameTitle}
                className="w-16 h-24 object-cover rounded-xl bg-slate-950 flex-shrink-0"
              />


              {/* Activity Info */}
              <div className="flex-1 min-w-0 space-y-1.5">
                <div className="flex items-center justify-between gap-2">
                  <Link
                    href={log.user.username ? `/u/${log.user.username}` : '#'}
                    className="text-xs font-semibold text-purple-400 hover:underline truncate"
                  >
                    @{log.user.username || log.user.name}
                  </Link>


                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-950 border border-slate-800 text-slate-400">
                    {log.status}
                  </span>
                </div>


                <h3 className="text-sm font-bold text-white truncate">{log.gameTitle}</h3>


                {/* Star Rating & Playtime */}
                <div className="flex items-center gap-3 text-xs">
                  {log.rating && log.rating > 0 && (
                    <span className="text-amber-400 font-bold">★ {log.rating}</span>
                  )}
                  {log.playtimeHours && log.playtimeHours > 0 && (
                    <span className="text-slate-400 text-[11px]">{log.playtimeHours}h played</span>
                  )}
                </div>


                {/* User Review Snippet */}
                {log.review && (
                  <p className="text-xs text-slate-300 italic line-clamp-2 pt-1 border-t border-slate-800/60 mt-1">
                    "{log.review}"
                  </p>
                )}
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}