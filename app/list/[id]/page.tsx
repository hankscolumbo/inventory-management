import { getCurrentDbUser } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { notFound } from 'next/navigation';
import Link from 'next/link';
import ListProgressSummary from '@/components/ListProgressSummary';
import FollowListButton from '@/components/FollowListButton';
import EditableListGrid from './EditableListGrid';
import EditListModal from '@/components/EditListModal';
import DeleteListButton from '@/components/DeleteListButton';
import SafeHtml from '@/components/safeHtml';
import ReactionsBar from '@/components/ReactionsBar';
import CommentSection from '@/components/CommentSection';

export const dynamic = 'force-dynamic';

interface Props {
  params: Promise<{ id: string }>;
}

export default async function ListPage({ params }: Props) {
  const { id } = await params;

  // 1. Fetch current user (memoized request-wide)
  const currentUser = await getCurrentDbUser();

  // 2. Fetch List Items, Social Data, and User Logs in Parallel
  const [list, userLogs, userLists, isFollowingRecord] = await Promise.all([
    prisma.customList.findUnique({
      where: { id },
      include: {
        items: {
          orderBy: { position: 'asc' },
        },
        user: { select: { id: true, username: true, name: true, image: true, email: true } },
        comments: {
          orderBy: { createdAt: 'desc' },
          include: {
            user: { select: { id: true, username: true, name: true, image: true } },
          },
        },
        reactions: {
          select: { id: true, emoji: true, userId: true },
        },
      },
    }),
    currentUser
      ? prisma.gameLog.findMany({
          where: {
            userId: currentUser.id,
          },
          select: {
            igdbId: true,
            steamAppId: true,
            gameTitle: true,
            status: true,
          },
        })
      : Promise.resolve([]),
    currentUser
      ? prisma.customList.findMany({
          where: { userId: currentUser.id },
          select: { id: true, title: true },
        })
      : Promise.resolve([]),
    currentUser
      ? prisma.listFollow.findFirst({
          where: {
            customListId: id,
            userId: currentUser.id,
          },
        })
      : Promise.resolve(null),
  ]);

  if (!list) notFound();

  // 3. Build Lookup Maps for User Log Statuses
  const statusByIgdb = new Map<number, string>();
  const statusBySteam = new Map<number, string>();
  const statusByTitle = new Map<string, string>();

  userLogs.forEach((log) => {
    if (log.status) {
      if (log.igdbId !== null) statusByIgdb.set(log.igdbId, log.status);
      if (log.steamAppId !== null) statusBySteam.set(log.steamAppId, log.status);
      if (log.gameTitle) statusByTitle.set(log.gameTitle.trim().toLowerCase(), log.status);
    }
  });

  const getUserGameStatus = (item: {
    igdbId: number | null;
    steamAppId: number | null;
    gameTitle: string;
  }): string | null => {
    if (item.igdbId !== null && statusByIgdb.has(item.igdbId)) {
      return statusByIgdb.get(item.igdbId)!;
    }
    if (item.steamAppId !== null && statusBySteam.has(item.steamAppId)) {
      return statusBySteam.get(item.steamAppId)!;
    }
    const lowerTitle = item.gameTitle.trim().toLowerCase();
    if (statusByTitle.has(lowerTitle)) {
      return statusByTitle.get(lowerTitle)!;
    }
    return null;
  };

  const isOwner = currentUser?.id === list?.user?.id;
  const isFollowing = Boolean(isFollowingRecord);

  // 4. Map exact status flags for strictly: PLAYED, PLAYING, and WANT TO PLAY
  const itemsWithStatus = list.items.map((item) => {
    const rawStatus = getUserGameStatus(item);
    const normalized = rawStatus ? rawStatus.trim().toUpperCase().replace(/_/g, ' ') : null;

    const isPlayed = normalized === 'PLAYED' || normalized === 'PLAYING';
    const isWantToPlay = normalized === 'WANT TO PLAY';

    return {
      ...item,
      userStatus: rawStatus,
      isPlayed,
      isWantToPlay,
    };
  });

  // 5. Compute Progress Metrics
  const totalCount = itemsWithStatus.length;
  const playedCount = itemsWithStatus.filter((item) => item.isPlayed).length;
  const unplayedCount = totalCount - playedCount;
  const percentage = totalCount > 0 ? Math.round((playedCount / totalCount) * 100) : 0;

  const authorName = list.user.username || list.user.name || 'User';
  const authorProfileHref = list.user.username ? `/u/${list.user.username}` : '#';

  return (
    <div className="max-w-6xl mx-auto py-8 px-4 space-y-8">
      {/* Top Header Layout */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-stretch mb-8">
        {/* Left 2/3: Status Bar Progress Summary */}
        <div className={currentUser ? 'md:col-span-2' : 'md:col-span-3'}>
          {currentUser ? (
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

        {/* Right 1/3: Title, Description & Author Profile Link */}
        <div className="relative md:col-span-1 bg-slate-900 border border-slate-800 p-6 rounded-2xl flex flex-col justify-between space-y-4">
          {isOwner && (
            <div className="absolute top-4 right-4 z-10 flex items-center gap-2">
              <EditListModal
                listId={list.id}
                initialTitle={list.title}
                initialDescription={list.description || ''}
              />
              <DeleteListButton
                listId={list.id}
                listTitle={list.title}
                username={list.user.username ?? undefined}
              />
            </div>
          )}
          <div>
            <h1 className="text-2xl font-extrabold text-white mb-2 leading-tight pr-16">
              {list.title}
            </h1>
            {list.description && (
              <SafeHtml
                html={list.description}
                className="text-xs text-slate-300 leading-relaxed mb-4 prose prose-invert prose-xs max-w-none
                           [&_a]:text-purple-400 [&_a]:underline [&_strong]:text-white [&_ul]:list-disc [&_ul]:pl-4 [&_ol]:list-decimal [&_ol]:pl-4"
              />
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

          {currentUser && !isOwner && (
            <div className="pt-2 border-t border-slate-800/80 flex flex-col gap-2">
              <FollowListButton
                customListId={list.id}
                initialIsFollowing={isFollowing}
                isOwner={isOwner}
              />
            </div>
          )}
        </div>
      </div>

      {/* Full Width Editable/Interactive Game Cards Grid */}
      <EditableListGrid
        listId={list.id}
        items={itemsWithStatus}
        isOwner={isOwner}
        session={currentUser ? { user: currentUser } : null}
        userLists={userLists}
      />

      {/* Social Interactions: Reactions & Comments */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 sm:p-8 space-y-6 shadow-2xl">
        <ReactionsBar
          targetId={list.id}
          targetType="list"
          reactions={list.reactions}
          currentUserId={currentUser?.id}
        />
        <CommentSection
          targetId={list.id}
          targetType="list"
          comments={list.comments}
          currentUserId={currentUser?.id}
        />
      </div>
    </div>
  );
}

