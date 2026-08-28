// app/list/[id]/page.tsx
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { notFound } from 'next/navigation';
import Link from 'next/link';
import ListProgressSummary from '@/components/ListProgressSummary';
import GameCardActions from '@/components/GameCardActions';
import FollowListButton from '@/components/FollowListButton';
import AddGamesToListModal from '@/components/AddGamesToListModal'; // 👈 Import your modal component


interface Props {
  params: Promise<{ id: string }>;
}


export default async function ListPage({ params }: Props) {
  const { id } = await params;
  const session = await auth();


  // 1. Fetch List Items and User Logs in Parallel
  const [list, userLogs, userLists, isFollowingRecord] = await Promise.all([
    prisma.customList.findUnique({
      where: { id },
      include: {
        items: {
          orderBy: { position: 'asc' },
        },
        user: { select: { username: true, name: true, email: true } },
      },
    }),
    session?.user?.email
      ? prisma.gameLog.findMany({
          where: {
            user: { email: session.user.email },
            OR: [
              { status: { in: ['PLAYED', 'PLAYING'] } },
              { playtimeHours: { gt: 0 } },
            ],
          },
          select: {
            igdbId: true,
            steamAppId: true,
            gameTitle: true,
          },
        })
      : Promise.resolve([]),
    session?.user?.email
      ? prisma.customList.findMany({
          where: { user: { email: session.user.email } },
          select: { id: true, title: true },
        })
      : Promise.resolve([]),
    session?.user?.email
      ? prisma.listFollow.findFirst({
          where: {
            customListId: id,
            user: { email: session.user.email },
          },
        })
      : Promise.resolve(null),
  ]);


  if (!list) notFound();


  // 2. Build Lookup Sets for Matching Played Status
  const playedIgdbIds = new Set(
    userLogs.map((log) => log.igdbId).filter((val): val is number => val !== null)
  );
  const playedSteamAppIds = new Set(
    userLogs.map((log) => log.steamAppId).filter((val): val is number => val !== null)
  );
  const playedTitles = new Set(
    userLogs.map((log) => log.gameTitle.trim().toLowerCase())
  );


  const checkIfPlayed = (item: {
    igdbId: number | null;
    steamAppId: number | null;
    gameTitle: string;
  }) => {
    if (item.igdbId !== null && playedIgdbIds.has(item.igdbId)) return true;
    if (item.steamAppId !== null && playedSteamAppIds.has(item.steamAppId)) return true;
    return playedTitles.has(item.gameTitle.trim().toLowerCase());
  };


  const isOwner = session?.user?.email ? list?.user?.email === session.user.email : false;
  const isFollowing = Boolean(isFollowingRecord);


  // 3. Compute Progress Metrics
  const totalCount = list.items.length;
  const playedCount = list.items.filter(checkIfPlayed).length;
  const unplayedCount = totalCount - playedCount;
  const percentage = totalCount > 0 ? Math.round((playedCount / totalCount) * 100) : 0;


  const authorName = list.user.username || list.user.name || 'User';
  const authorProfileHref = list.user.username ? `/u/${list.user.username}` : '#';


  return (
    <div className="max-w-6xl mx-auto py-8 px-4">
      {/* Top Header Layout */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-stretch mb-8">
        {/* Left 2/3: Status Bar Progress Summary */}
        <div className={session ? 'md:col-span-2' : 'md:col-span-3'}>
          {session ? (
            <div className="[&>div]:mb-0 h-full">
              <ListProgressSummary
                playedCount={playedCount}
                unplayedCount={unplayedCount}
                totalCount={totalCount}
                percentage={percentage}
              />
            </div>
          ) : (
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 flex items-center justify-center text-slate-400 text-sm h-full">
              Sign in to track your progress on this list.
            </div>
          )}
        </div>


        {/* Right 1/3: Title, Description, Author Profile Link & Actions */}
        <div className="md:col-span-1 bg-slate-900 border border-slate-800 p-6 rounded-2xl flex flex-col justify-between space-y-4">
          <div>
            <h1 className="text-2xl font-extrabold text-white mb-2 leading-tight">
              {list.title}
            </h1>
            {list.description && (
              <p className="text-xs text-slate-300 leading-relaxed mb-4">
                {list.description}
              </p>
            )}
            <div>
              <span className="text-xs text-slate-300 leading-relaxed">Curated by </span>
              <Link
                href={authorProfileHref}
                className="text-xs font-semibold text-purple-400 hover:text-purple-300 hover:underline transition w-fit"
              >
                @{authorName}
              </Link>
            </div>
          </div>


          {/* Render Add Games trigger for the List Owner, or Follow button for visitors */}
          {session && (
            <div className="pt-2 border-t border-slate-800/80 flex flex-col gap-2">
              {isOwner ? (
                <AddGamesToListModal customListId={list.id} />
              ) : (
                <FollowListButton
                  customListId={list.id}
                  initialIsFollowing={isFollowing}
                  isOwner={isOwner}
                />
              )}
            </div>
          )}
        </div>
      </div>


      {/* Full Width Game Cards Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
        {list.items.map((item) => {
          const isPlayed = checkIfPlayed(item);


          return (
            <div
              key={item.id}
              className="relative bg-slate-900 border border-slate-800 rounded-xl overflow-hidden group flex flex-col justify-between"
            >
              {/* Status Badge */}
              {session && (
                <div className="absolute top-2 right-2 z-10">
                  {isPlayed ? (
                    <span className="px-2 py-0.5 bg-emerald-500/90 text-white text-[10px] font-bold rounded-full shadow backdrop-blur-sm">
                      ✓ Played
                    </span>
                  ) : (
                    <span className="px-2 py-0.5 bg-slate-950/80 text-slate-400 text-[10px] font-semibold rounded-full border border-slate-700/80 backdrop-blur-sm">
                      Unplayed
                    </span>
                  )}
                </div>
              )}


              {/* Game Cover */}
              <Link
                href={
                  item.igdbId
                    ? `/game/${item.igdbId}`
                    : item.steamAppId
                    ? `/game/steam-${item.steamAppId}`
                    : `/game/${encodeURIComponent(item.gameTitle)}`
                }
                className="aspect-[3/4] bg-slate-950 relative block overflow-hidden group/cover"
              >
                <div className="aspect-[3/4] bg-slate-950 relative">
                  <img
                    src={item.coverUrl || '/placeholder.png'}
                    alt={item.gameTitle}
                    className={`w-full h-full object-cover transition ${
                      isPlayed ? 'opacity-100' : 'opacity-75 group-hover:opacity-100'
                    }`}
                  />
                </div>
              </Link>


              {/* Game Info, Entry Notes & Action Buttons */}
              <div className="p-3 flex-1 flex flex-col justify-between space-y-2">
                <div>
                  <h3 className="text-xs font-semibold text-white truncate">{item.gameTitle}</h3>


                  {item.note && (
                    <div className="bg-slate-950/80 border border-slate-800 p-2 rounded-lg text-[11px] text-slate-300 leading-tight italic mt-2">
                      "{item.note}"
                    </div>
                  )}
                </div>


                {/* Card Interactive Actions */}
                <GameCardActions item={item} userLists={userLists} />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}



