// app/profile/page.tsx
import { redirect } from 'next/navigation';
import { getProfileData } from '@/app/actions/getProfileData';
import ProfileTabs from '@/components/ProfileTabs';

export default async function ProfilePage() {
  //if user isnt logged in or profile  failed to load, redirect to sign in
  const profileData = await getProfileData();

  if (!profileData?.user) {
    redirect('/api/auth/signin');
  }

  const { user, logs = [] } = profileData;

  // Provide safe fallback object for stats to clear Typescript undefined warnings 
  const stats = profileData.stats ?? {
    totalLogged: 0,
    playedCount: 0,
    avgRating: null,
  };

  return (
    <main className="max-w-6xl mx-auto px-6 py-10 space-y-10">
      {/* Profile Header Banner */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 sm:p-8 flex flex-col sm:flex-row items-center justify-between gap-6">
        <div className="flex items-center gap-4">
          {user.image ? (
            <img
              src={user.image}
              alt={user.name || 'User Avatar'}
              className="w-20 h-20 rounded-full border-2 border-purple-500 shadow-lg object-cover"
            />
          ) : (
            <div className="w-20 h-20 rounded-full bg-purple-600 flex items-center justify-center text-2xl font-bold text-white shadow-lg">
              {user.name?.charAt(0) || 'U'}
            </div>
          )}

          <div>
            <h1 className="text-2xl font-extrabold text-white">
              {user.name || 'Gamer Profile'}
            </h1>
            {user.email && (
                <p className="text-xs text-slate-400 mt-1">{user.email}</p>
            )}
          </div>
        </div>

        {/* Quick Stats Bar */}
        <div className="flex gap-6 border-t sm:border-t-0 sm:border-l border-slate-800 pt-4 sm:pt-0 sm:pl-8">
          <div className="text-center sm:text-left">
            <p className="text-2xl font-bold text-white">{stats.totalLogged}</p>
            <p className="text-[11px] text-slate-400 font-medium uppercase tracking-wider">
              Total Logged
            </p>
          </div>
          <div className="text-center sm:text-left">
            <p className="text-2xl font-bold text-purple-400">{stats.playedCount}</p>
            <p className="text-[11px] text-slate-400 font-medium uppercase tracking-wider">
              Played
            </p>
          </div>
          <div className="text-center sm:text-left">
            <p className="text-2xl font-bold text-amber-400">
              {stats.avgRating ? `★ ${stats.avgRating}` : 'N/A'}
            </p>
            <p className="text-[11px] text-slate-400 font-medium uppercase tracking-wider">
              Avg Rating
            </p>
          </div>
        </div>
      </div>

      {/* Interactive Logs List with Filter & Sort Controls */}
      <section className="space-y-4">
        <h2 className="text-xl font-bold text-white">Game Collection</h2>
        <ProfileTabs logs={logs} isOwner={true} />
      </section>
    </main>
  );
}