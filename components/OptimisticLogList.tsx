'use client';

import { useOfflineLogs } from '@/hooks/useOfflineLogs';
import GameLogCard from '@/components/GameLogCard';

interface ServerLog {
  id: string;
  gameTitle: string;
  igdbId: number | null;
  status: string;
  rating: number | null;
  playtimeHours: number | null;
  coverUrl?: string | null;
}

export default function OptimisticLogList({ serverLogs, isOwner }: { serverLogs: ServerLog[]; isOwner?: boolean }) {
  const offlineLogs = useOfflineLogs();

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
      {offlineLogs.map((log) => (
        <div key={log.tempId} className="relative group opacity-90">
          <div className="absolute top-2 left-2 z-20 bg-purple-900/90 text-purple-200 border border-purple-500/50 text-[9px] font-bold px-2 py-0.5 rounded-full shadow-lg flex items-center gap-1 backdrop-blur-md">
            <span className="w-1.5 h-1.5 rounded-full bg-purple-400 animate-pulse" />
            <span>Pending Sync</span>
          </div>

          <GameLogCard
            log={{
              id: log.tempId,
              gameTitle: log.gameTitle,
              igdbId: log.igdbId ?? null,
              coverUrl: null,
            }}
            isOwner={false}
          />
        </div>
      ))}

      {serverLogs.map((log) => (
        <GameLogCard key={log.id} log={log} isOwner={isOwner} />
      ))}
    </div>
  );
}
