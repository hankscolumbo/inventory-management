// app/u/[username]/page.tsx

import { notFound } from 'next/navigation';
import Link from 'next/link';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

import SignOutButton from '@/components/SignOutButton';
import SteamSyncModal from '@/components/SteamSyncModal';
import CreateListModal from '@/components/CreateListModal';
import UserListsGrid from '@/components/UserListsGrid';
import ProfileGameGrid from '@/components/ProfileGameGrid';
import EditableAvatar from '@/components/EditableAvatar';
import PsnSyncModal from '@/components/PsnSyncModal';
import PossibleDuplicatesSection from '@/components/PossibleDuplicatesSection';
import EditNameModal from '@/components/EditNameModal';

interface PageProps {
  params: Promise<{ username: string }>;
}

export default async function PublicProfilePage({ params }: PageProps) {
  const { username } = await params;
  const session = await auth();

  const user = await prisma.user.findUnique({
    where: { username },
    include: {
      gameLogs: {
        orderBy: { updatedAt: 'desc' },
      },
      customLists: {
        where: { isPrivate: false },
        include: { _count: { select: { items: true } } },
      },
      followedLists: {
        include: {
          customList: {
            include: {
              user: { select: { username: true, name: true } },
              _count: { select: { items: true } },
            },
          },
        },
      },
    },
  });

  if (!user) {
    notFound();
  }

  // determine if the current viewer owns this profile
  const isProfileOwner: boolean =
    !!session?.user &&
    (session.user.id === user.id || session.user.email === user.email);

  const customLists = await prisma.customList.findMany({
    where: {
      userId: user.id,
      ...(isProfileOwner ? {} : { isPrivate: false }),
    },
    include: {
      _count: {
        select: { items: true },
      },
    },
    orderBy: { updatedAt: 'desc' },
  });

  const logs = user.gameLogs || [];

  const totalLogged = logs.length;
  const playedCount = logs.filter((l) => l.status === 'PLAYED').length;
  const playingCount = logs.filter((l) => l.status === 'PLAYING').length;
  const wantToPlayCount = logs.filter((l) => l.status === 'WANT TO PLAY').length;

  const ratings = logs
    .map((l) => l.rating)
    .filter((r): r is number => r !== null && r > 0);

  const avgRating =
    ratings.length > 0
      ? (ratings.reduce((acc, curr) => acc + curr, 0) / ratings.length).toFixed(1)
      : null;

  return (
    <div className="max-w-7xl mx-auto px-6 py-10 space-y-8">
      {/* Profile Header Card */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 sm:p-8 flex flex-col sm:flex-row items-center gap-6 shadow-2xl relative overflow-hidden">
        <EditableAvatar
          currentImage={user.image}
          username={user.username || 'User'}
          isOwner={isProfileOwner}
        />

        {/* User Details */}
        <div className="text-center sm:text-left space-y-3 flex-1 min-w-0">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              {/* Display Name Heading + Pencil Button Trigger */}
              <div className="flex items-center justify-center sm:justify-start gap-2">
                <h1 className="text-2xl sm:text-3xl font-extrabold text-white truncate">
                  {user.name || user.username}
                </h1>
                {isProfileOwner && <EditNameModal initialName={user.name} />}
              </div>

              {/* Static Read-Only Username */}
              <p className="text-sm font-mono text-slate-400 mt-0.5">@{user.username}</p>
            </div>

            {/* Sync & Action Controls */}
            {isProfileOwner && (
              <div className="flex items-center gap-3 justify-center sm:justify-end shrink-0">
                <SteamSyncModal steamId={user.steamId} isOwner={isProfileOwner} />
                <PsnSyncModal
                  psnNpsso={user.psnNpsso}
                  psnOnlineId={user.psnOnlineId}
                  isOwner={isProfileOwner}
                />
                <SignOutButton />
              </div>
            )}
          </div>

          {/* Stat Counters */}
          <div className="flex flex-wrap justify-center sm:justify-start gap-6 pt-2 border-t border-slate-800/80">
            <div>
              <span className="font-extrabold text-white text-lg block">{totalLogged}</span>
              <span className="text-xs font-medium text-slate-400 uppercase tracking-wider">
                Total
              </span>
            </div>
            <div className="border-l border-slate-800 pl-6">
              <span className="font-extrabold text-emerald-400 text-lg block">
                {playedCount}
              </span>
              <span className="text-xs font-medium text-slate-400 uppercase tracking-wider">
                Played
              </span>
            </div>
            <div className="border-l border-slate-800 pl-6">
              <span className="font-extrabold text-cyan-400 text-lg block">
                {playingCount}
              </span>
              <span className="text-xs font-medium text-slate-400 uppercase tracking-wider">
                Playing
              </span>
            </div>
            <div className="border-l border-slate-800 pl-6">
              <span className="font-extrabold text-cyan-400 text-lg block">
                {wantToPlayCount}
              </span>
              <span className="text-xs font-medium text-slate-400 uppercase tracking-wider">
                Want To Play
              </span>
            </div>
            {avgRating && (
              <div className="border-l border-slate-800 pl-6">
                <span className="font-extrabold text-amber-300 text-lg block">
                  ★ {avgRating}
                </span>
                <span className="text-xs font-medium text-slate-400 uppercase tracking-wider">
                  Avg Rating
                </span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Two-Column Layout: Left 2/3 Game Grid, Right 1/3 Custom & Followed Lists */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
        {/* Left 2/3 Column: Game Collection Grid */}
        <div className="lg:col-span-2 space-y-4">
          <ProfileGameGrid logs={logs} />
          <PossibleDuplicatesSection userGames={logs} isOwner={isProfileOwner} />
        </div>

        {/* Right 1/3 Column: Sidebar */}
        <div className="lg:col-span-1 space-y-8">
          {/* Custom Lists Section */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-bold text-white">Custom Lists</h2>
              {isProfileOwner && <CreateListModal />}
            </div>
            <UserListsGrid lists={customLists} isOwner={isProfileOwner} />
          </div>

          {/* Followed Lists Section */}
          <div className="space-y-4">
            <h2 className="text-xl font-bold text-white">Followed Lists</h2>
            {user.followedLists.length === 0 ? (
              <p className="text-xs text-slate-500 italic">No followed lists yet.</p>
            ) : (
              <div className="space-y-3">
                {user.followedLists.map(({ customList }) => (
                  <Link
                    key={customList.id}
                    href={`/list/${customList.id}`}
                    className="bg-slate-900 border border-slate-800 p-4 rounded-xl hover:border-purple-500/50 transition block group"
                  >
                    <h3 className="text-sm font-bold text-white truncate group-hover:text-purple-300 transition">
                      {customList.title}
                    </h3>
                    <p className="text-xs text-purple-400 mt-1">
                      by @{customList.user.username || customList.user.name} • {customList._count.items} games
                    </p>
                  </Link>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}