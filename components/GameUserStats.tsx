// components/GameUserStats.tsx
import Link from 'next/link';

interface UserSummary {
  id: string;
  username: string | null;
  name: string | null;
  image: string | null;
}

interface GameUserStatsProps {
  playing: UserSummary[];
  played: UserSummary[];
  wantToPlay: UserSummary[];
}

export default function GameUserStats({
  playing,
  played,
  wantToPlay,
}: GameUserStatsProps) {
  const sections = [
    {
      title: 'Currently Playing',
      count: playing.length,
      users: playing,
      badgeColor: 'text-cyan-400 border-cyan-500/30 bg-cyan-950/30',
    },
    {
      title: 'Played',
      count: played.length,
      users: played,
      badgeColor: 'text-emerald-400 border-emerald-500/30 bg-emerald-950/30',
    },
    {
      title: 'Want To Play',
      count: wantToPlay.length,
      users: wantToPlay,
      badgeColor: 'text-purple-400 border-purple-500/30 bg-purple-950/30',
    },
  ];

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-4 shadow-xl">
      <h3 className="text-sm font-bold uppercase tracking-wider text-slate-400">
        Community Activity
      </h3>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {sections.map(({ title, count, users, badgeColor }) => (
          <div
            key={title}
            className="bg-slate-950/60 border border-slate-800/80 rounded-xl p-4 flex flex-col justify-between space-y-3"
          >
            {/* Header with Count Badge */}
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-200">{title}</span>
              <span
                className={`text-xs font-mono font-extrabold px-2 py-0.5 rounded-md border ${badgeColor}`}
              >
                {count}
              </span>
            </div>

            {/* Avatar Stack */}
            {count === 0 ? (
              <p className="text-[11px] text-slate-500 italic">No users yet</p>
            ) : (
              <div className="flex items-center gap-2">
                <div className="flex -space-x-2 overflow-hidden py-1">
                  {users.slice(0, 5).map((u) => {
                    const displayName = u.name || u.username || 'User';
                    const profilePath = u.username ? `/u/${u.username}` : '#';

                    return (
                      <Link
                        key={u.id}
                        href={profilePath}
                        title={displayName}
                        className="relative group transition transform hover:scale-110 hover:z-10"
                      >
                        {u.image ? (
                          <img
                            src={u.image}
                            alt={displayName}
                            className="w-7 h-7 rounded-full border-2 border-slate-900 object-cover"
                          />
                        ) : (
                          <div className="w-7 h-7 rounded-full border-2 border-slate-900 bg-purple-900/80 text-purple-200 text-[10px] font-bold flex items-center justify-center">
                            {displayName.charAt(0).toUpperCase()}
                          </div>
                        )}
                      </Link>
                    );
                  })}
                </div>

                {/* Remaining count indicator */}
                {count > 5 && (
                  <span className="text-[10px] font-mono font-semibold text-slate-400 pl-1">
                    +{count - 5} more
                  </span>
                )}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}