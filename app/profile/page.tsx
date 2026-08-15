// app/profile/page.tsx
import { auth } from '@/lib/auth';
import { getProfileData } from '@/app/actions/getProfileData';
import { redirect } from 'next/navigation';
import Image from 'next/image';
import ProfileTabs from '@/components/ProfileTabs';

export default async function ProfilePage() {
  const session = await auth();

  if (!session?.user) {
    redirect('/');
  }

  const data = await getProfileData(session.user.id);

  if ('error' in data || !data.user) {
    return (
      <main className="max-w-5xl mx-auto px-6 py-12 text-center text-slate-400">
        Failed to load profile.
      </main>
    );
  }

  const { user, stats, logs } = data;

  return (
    <main className="max-w-6xl mx-auto px-6 py-10 space-y-10">
      {/* Profile Header */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 sm:p-8 flex flex-col sm:flex-row items-center justify-between gap-6">
        <div className="flex items-center gap-5">
          {user.image ? (
            <img
              src={user.image}
              alt={user.name}
              className="w-20 h-20 rounded-full border-2 border-purple-500/50 shadow-lg"
            />
          ) : (
            <div className="w-20 h-20 rounded-full bg-purple-600 flex items-center justify-center text-2xl font-bold text-white">
              {user.name.charAt(0)}
            </div>
          )}
          <div>
            <h1 className="text-2xl font-bold text-white">{user.name}</h1>
            <p className="text-xs text-slate-400 mt-1">
              Member since {new Date(user.createdAt).toLocaleDateString('en-US', { month: 'short', year: 'numeric' })}
            </p>
          </div>
        </div>

        {/* Stats Row */}
        <div className="grid grid-cols-4 gap-4 w-full sm:w-auto text-center border-t sm:border-t-0 sm:border-l border-slate-800 pt-4 sm:pt-0 sm:pl-8">
          <div>
            <p className="text-2xl font-bold text-white">{stats.totalLogged}</p>
            <p className="text-xs text-slate-400 font-medium uppercase tracking-wider">Logged</p>
          </div>
          <div>
            <p className="text-2xl font-bold text-amber-400">★ {stats.avgRating}</p>
            <p className="text-xs text-slate-400 font-medium uppercase tracking-wider">Avg Rating</p>
          </div>
          <div>
            <p className="text-2xl font-bold text-purple-400">{stats.playingCount}</p>
            <p className="text-xs text-slate-400 font-medium uppercase tracking-wider">Playing</p>
          </div>
          <div>
            <p className="text-2xl font-bold text-blue-400">{stats.backlogCount}</p>
            <p className="text-xs text-slate-400 font-medium uppercase tracking-wider">Backlog</p>
          </div>
        </div>
      </div>

      {/* Filterable Tabs & Logs */}
      <ProfileTabs logs={logs} />
    </main>
  );
}