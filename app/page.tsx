// app/page.tsx
import Link from 'next/link';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { getHomePageData } from '@/lib/getHomePageData';
import HomeSectionGrid, { GridItem } from '@/components/HomeSectionGrid';
import SafeHtml from '@/components/safeHtml';

export const revalidate = 300;

export default async function HomePage() {
  const session = await auth();
  const userId = session?.user?.id;
  const isLoggedIn = Boolean(session?.user);

  const userLists = userId
    ? await prisma.customList.findMany({
        where: { userId },
        select: { id: true, title: true },
        orderBy: { updatedAt: 'desc' },
      })
    : [];

  const { mostPlayed, mostWanted, activeLogs, newlyReleased, upcoming, communityLists } =
    await getHomePageData();

  const activeLogItems: GridItem[] = activeLogs.map((log) => ({
    id: log.id,
    igdbId: log.igdbId,
    steamAppId: log.steamAppId,
    gameTitle: log.gameTitle,
    coverUrl: log.coverUrl,
    user: log.user,
  }));

  const mostPlayedItems: GridItem[] = mostPlayed.map((g) => ({
    igdbId: g.igdbId,
    steamAppId: g.steamAppId,
    gameTitle: g.gameTitle,
    coverUrl: g.coverUrl,
    badgeText: `${g._count.userId} players`,
    badgeStyle: 'bg-emerald-950/90 text-emerald-300 border border-emerald-500/40',
  }));

  const mostWantedItems: GridItem[] = mostWanted.map((g) => ({
    igdbId: g.igdbId,
    steamAppId: g.steamAppId,
    gameTitle: g.gameTitle,
    coverUrl: g.coverUrl,
    badgeText: `${g._count.userId} wanted`,
    badgeStyle: 'bg-amber-950/90 text-amber-300 border border-amber-500/40',
  }));

  const newlyReleasedItems: GridItem[] = newlyReleased.map((g) => ({
    igdbId: g.igdbId,
    gameTitle: g.gameTitle,
    coverUrl: g.coverUrl,
    badgeText: g.releaseDateFormatted ?? undefined,
    badgeStyle: 'bg-purple-950/90 text-purple-300 border border-purple-500/40',
  }));

  const upcomingItems: GridItem[] = upcoming.map((g) => ({
    igdbId: g.igdbId,
    gameTitle: g.gameTitle,
    coverUrl: g.coverUrl,
    badgeText: g.releaseDateFormatted ?? undefined,
    badgeStyle: 'bg-indigo-950/90 text-indigo-300 border border-indigo-500/40',
  }));

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8 space-y-12">
      {/* 0. Logged-Out Welcome Splash Page */}
      {!isLoggedIn && (
        <div className="relative overflow-hidden rounded-3xl bg-slate-900 border border-slate-800 p-8 sm:p-12 shadow-2xl bg-gradient-to-br from-slate-900 via-purple-950/20 to-slate-950">
          <div className="max-w-3xl space-y-6 relative z-10">
            <span className="inline-block px-3 py-1 bg-purple-600/20 border border-purple-500/30 text-purple-300 text-xs font-bold rounded-full uppercase tracking-wider">
              Welcome to playLog
            </span>
            <h1 className="text-3xl sm:text-5xl font-extrabold text-white leading-tight tracking-tight">
              Track, Organize & Share Your Gaming Journey
            </h1>
            <p className="text-slate-300 text-sm sm:text-base leading-relaxed">
              Sync your Steam and PlayStation backlogs, track playtime, organize custom lists, and see what the community is playing — all in one place.
            </p>

            <div className="flex flex-wrap items-center gap-4 pt-2">
              <Link
                href="/login"
                className="px-6 py-3 bg-purple-600 hover:bg-purple-500 text-white font-extrabold text-sm rounded-xl shadow-lg transition duration-200 hover:scale-105"
              >
                Get Started / Sign In
              </Link>
            </div>

            {/* Feature Highlights Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-6 border-t border-slate-800/80">
              <div className="space-y-1">
                <span className="text-base">🔄</span>
                <h3 className="text-xs font-bold text-white">Multi-Platform Sync</h3>
                <p className="text-[11px] text-slate-400">Import your library automatically from Steam & PSN.</p>
              </div>
              <div className="space-y-1">
                <span className="text-base">📋</span>
                <h3 className="text-xs font-bold text-white">Custom Lists</h3>
                <p className="text-[11px] text-slate-400">Curate rank lists, series tier lists, and recommendations.</p>
              </div>
              <div className="space-y-1">
                <span className="text-base">🎯</span>
                <h3 className="text-xs font-bold text-white">Backlog Management</h3>
                <p className="text-[11px] text-slate-400">Filter games by substatus, rating, and playtime.</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 1. What Folks Are Playing */}
      <HomeSectionGrid
        title="What Folks are Playing"
        subtitle="Recent active logs across the community"
        accentColor="border-cyan-500/40"
        items={activeLogItems}
        itemsPerPage={6}
        userLists={userLists}
        isLoggedIn={isLoggedIn}
      />

      {/* 2. Most Played Games */}
      <HomeSectionGrid
        title="Most Played Games"
        subtitle="Ranked by total community logs"
        accentColor="border-emerald-500/40"
        items={mostPlayedItems}
        itemsPerPage={6}
        userLists={userLists}
        isLoggedIn={isLoggedIn}
      />

      {/* 3. Most Wanted Games */}
      <HomeSectionGrid
        title="Most Wanted Games"
        subtitle="Top games in user backlogs"
        accentColor="border-amber-500/40"
        items={mostWantedItems}
        itemsPerPage={6}
        userLists={userLists}
        isLoggedIn={isLoggedIn}
      />

      {/* 4. Release Calendar */}
      <HomeSectionGrid
        title="Newly Released"
        subtitle="Past 7 days"
        accentColor="border-purple-500/40"
        items={newlyReleasedItems}
        itemsPerPage={6}
        userLists={userLists}
        isLoggedIn={isLoggedIn}
      />

      <HomeSectionGrid
        title="Upcoming Releases"
        subtitle="Next 30 days"
        accentColor="border-indigo-500/40"
        items={upcomingItems}
        itemsPerPage={6}
        userLists={userLists}
        isLoggedIn={isLoggedIn}
      />

      {/* 5. Featured Community Lists */}
      <section className="space-y-4 pt-4 border-t border-slate-800">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-extrabold text-white">Featured Community Lists</h2>
            <p className="text-xs text-slate-400 font-mono mt-0.5">Curated lists created by members</p>
          </div>
        </div>

        {communityLists.length === 0 ? (
          <p className="text-xs text-slate-500 italic">No public custom lists created yet.</p>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {communityLists.map((list) => (
              <Link
                key={list.id}
                href={`/list/${list.id}`}
                className="bg-slate-900 border border-slate-800 p-4 rounded-xl hover:border-purple-500/50 transition group flex flex-col justify-between shadow-md"
              >
                <div>
                  <h3 className="text-sm font-bold text-white group-hover:text-purple-300 transition line-clamp-1">
                    {list.title}
                  </h3>
                  {list.description && (
                    <SafeHtml
                      html={list.description}
                      className="text-xs text-slate-300 leading-relaxed mb-4 prose prose-invert prose-xs max-w-none
                                [&_a]:text-purple-400 [&_a]:underline [&_strong]:text-white [&_ul]:list-disc [&_ul]:pl-4 [&_ol]:list-decimal [&_ol]:pl-4"
                    />
                  )}
                </div>

                <div className="flex items-center justify-between mt-4 pt-3 border-t border-slate-800/80">
                  <span className="text-[11px] text-purple-400 font-medium">
                    by @{list.user.username || list.user.name || 'User'}
                  </span>
                  <span className="text-[10px] font-mono text-slate-500">
                    {list._count.items} games • {list._count.followers} followers
                  </span>
                </div>
              </Link>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}