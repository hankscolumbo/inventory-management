// app/u/[username]/page.tsx
import { getPublicProfile } from '@/lib/getPublicProfile';
import { notFound } from 'next/navigation';
import ProfileGameGrid from './ProfileGameGrid';
import { auth } from '@/lib/auth';
import SignOutButton from '@/components/SignOutButton';
import SteamSyncSection from './SteamSyncSection';

interface PageProps {
    params: Promise<{ username: string }>;
}

export default async function PublicProfilePage({ params }: PageProps) {
    const { username } = await params;
    const profile = await getPublicProfile(username);

    if (!profile) {
        notFound();
    }

    const session = await auth();
    const isOwner = session?.user?.email && session.user.email === profile.email;

    const logs = profile.logs || [];
    const playedCount = logs.filter((l) => l.status === 'PLAYED').length;
    const playingCount = logs.filter((l) => l.status === 'PLAYING').length;
    const backlogCount = logs.filter((l) => l.status === 'BACKLOG').length;
    const wantToPlayCount = logs.filter((l) => l.status === 'WANT TO PLAY').length;

    return (
        <div className="max-w-6xl mx-auto px-4 py-8 space-y-8">

            {/* Profile Header Card */}
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 sm:p-8 flex flex-col sm:flex-row items-center gap-6 shadow-2xl relative overflow-hidden">
                {/* User Avatar */}
                {profile.image ? (
                    <img
                        src={profile.image}
                        alt={profile.name || profile.username || 'User Avatar'}
                        className="w-24 h-24 sm:w-28 sm:h-28 rounded-full border-2 border-purple-500/50 object-cover shadow-xl shrink-0"
                    />
                ) : (
                    <div className="w-24 h-24 sm:w-28 sm:h-28 rounded-full bg-slate-800 border-2 border-slate-700 flex items-center justify-center text-3xl font-extrabold text-purple-400 shrink-0 shadow-xl">
                        {(profile.username || profile.name || 'U')[0]?.toUpperCase()}
                    </div>
                )}

                {/* User Details */}
                <div className="text-center sm:text-left space-y-3 flex-1 min-w-0">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                        <h1 className="text-2xl sm:text-3xl font-extrabold text-white truncate">
                            {profile.name || profile.username}
                        </h1>
                        {profile.username && (
                            <p className="text-sm font-mono text-purple-400 mt-0.5">
                                @{profile.username}
                            </p>
                        )}
                    </div>


                    {/* ONLY RENDER SYNC BUTTON IF VIEWER OWN PROFILE */}
                    {isOwner && (
                        <div className="flex items-center gap-3 justify-center sm:justify-end">
                            <SteamSyncSection steamId={profile.steamId} isOwner={isOwner} />
                            <SignOutButton />
                        </div>
                    )}

                    {/* Stat Counters */}
                    <div className="flex flex-wrap justify-center sm:justify-start gap-6 pt-2 border-t border-slate-800/80">
                        <div>
                            <span className="font-extrabold text-white text-lg block">{logs.length}</span>
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
                        <div className="border-l border-slate-800 pl-6">
                            <span className="font-extrabold text-amber-400 text-lg block">{backlogCount}</span>
                            <span className="text-xs font-medium text-slate-400 uppercase tracking-wider">Backlog</span>
                        </div>
                    </div>
                </div>
            </div>
            {/* Interactive Game Grid with Search, Filter Tabs & Pagination */}
            <ProfileGameGrid logs={logs} />
        </div>
    );
}