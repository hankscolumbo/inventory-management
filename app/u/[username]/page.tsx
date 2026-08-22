// app/u/[username]/page.tsx
//import { getPublicProfile } from '@/lib/getPublicProfile';
import { notFound } from 'next/navigation';
import ProfileGameGrid from '@/components/ProfileGameGrid';
import { auth } from '@/lib/auth';
import SignOutButton from '@/components/SignOutButton';
import SteamSyncSection from '@/components/SteamSyncSection';
import { prisma } from '@/lib/prisma';

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
        },
    });

    if (!user) {
        notFound();
    }

    // determine if the current viewer owns this profile
    const isProfileOwner =
        !!session?.user &&
        (session.user.id === user.id || session.user.email === user.email);

    const logs = user.gameLogs || [];

    const totalLogged = logs.length;
    const playedCount = logs.filter((l) => l.status === 'PLAYED').length;
    const playingCount = logs.filter((l) => l.status === 'PLAYING').length;
    const backlogCount = logs.filter((l) => l.status === 'BACKLOG').length;
    const wantToPlayCount = logs.filter((l) => l.status === 'WANT TO PLAY').length;

    const ratings = logs
        .map((l) => l.rating)
        .filter((r): r is number => r !== null && r > 0);

    const avgRating =
        ratings.length > 0
            ? (ratings.reduce((acc, curr) => acc + curr, 0) / ratings.length).toFixed(1)
            : null;

    return (
        <div className="max-w-6xl mx-auto px-6 py-10 space-y-10">

            {/* Profile Header Card */}
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 sm:p-8 flex flex-col sm:flex-row items-center gap-6 shadow-2xl relative overflow-hidden">
                {/* User Avatar */}
                {user.image ? (
                    <img
                        src={user.image}
                        alt={user.name || user.username || 'User Avatar'}
                        className="w-24 h-24 sm:w-28 sm:h-28 rounded-full border-2 border-purple-500/50 object-cover shadow-xl shrink-0"
                    />
                ) : (
                    <div className="w-24 h-24 sm:w-28 sm:h-28 rounded-full bg-slate-800 border-2 border-slate-700 flex items-center justify-center text-3xl font-extrabold text-purple-400 shrink-0 shadow-xl">
                        {(user.username || user.name || 'U')[0]?.toUpperCase()}
                    </div>
                )}

                {/* User Details */}
                <div className="text-center sm:text-left space-y-3 flex-1 min-w-0">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                        <h1 className="text-2xl sm:text-3xl font-extrabold text-white truncate">
                            {user.name || user.username}
                        </h1>
                            <div className="flex items-center gap-3 justify-center sm:justify-end">
                                <SignOutButton />
                                </div>
                    </div>


                    {/* ONLY RENDER SYNC BUTTON IF VIEWER OWN PROFILE */}
                    {isProfileOwner && (
                        <div className="flex items-center gap-3 justify-center sm:justify-end">
                            <SteamSyncSection steamId={user.steamId} isOwner={isProfileOwner} />
                        </div>
                    )}

                    {/* Stat Counters */}
                    <div className="flex flex-wrap justify-center sm:justify-start gap-6 pt-2 border-t border-slate-800/80">
                        <div>
                            <span className="font-extrabold text-white text-lg block">{totalLogged}</span>
                            <span className="text-xs font-medium text-slate-400 uppercase tracking-wider">Total</span>
                        </div>
                        <div className="border-l border-slate-800 pl-6">
                            <span className="font-extrabold text-emerald-400 text-lg block">{playedCount}</span>
                            <span className="text-xs font-medium text-slate-400 uppercase tracking-wider">Played</span>
                        </div>
                        <div className="border-l border-slate-800 pl-6">
                            <span className="font-extrabold text-cyan-400 text-lg block">{playingCount}</span>
                            <span className="text-xs font-medium text-slate-400 uppercase tracking-wider">Playing</span>
                        </div>
                        <div className="border-l border-slate-800 pl-6">
                            <span className="font-extrabold text-cyan-400 text-lg block">{wantToPlayCount}</span>
                            <span className="text-xs font-medium text-slate-400 uppercase tracking-wider">Want To Play</span>
                        </div>
                        {/*
                        <div className="border-l border-slate-800 pl-6">
                            <span className="font-extrabold text-amber-400 text-lg block">{backlogCount}</span>
                            <span className="text-xs font-medium text-slate-400 uppercase tracking-wider">Backlog</span>
                        </div>
                        */}
                        {avgRating && (
                            <div className="border-l border-slate-800 pl-6">
                                <span className="font-extrabold text-amber-300 text-lg block">★ {avgRating}</span>
                                <span className="text-xs font-medium text-slate-400 uppercase tracking-wider">Avg Rating</span>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* Interactive Game Grid with Search, Filter Tabs & Pagination */}
            <ProfileGameGrid logs={logs} />
        </div >
    );
}