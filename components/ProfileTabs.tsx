// components/ProfileTabs.tsx
'use client';

import { useState, useMemo } from 'react';
import LogFilters, { StatusFilter, SortOption } from '@/components/LogFilters';
import StarRating from '@/components/StarRating';
import Link from 'next/link';

export interface GameLog {
  id: string;
  externalGameId: number;
  gameTitle: string;
  coverUrl?: string | null;
  rating?: number | null;
  review?: string | null;
  status: string;
  playedOn: string | Date;
}

interface ProfileTabsProps {
    logs: GameLog[];
}

export default function ProfileTabs({ logs }: ProfileTabsProps) {
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('ALL');
  const [sortBy, setSortBy] = useState<SortOption>('NEWEST');
  const [minRating, setMinRating] = useState<number>(0);

  // Filter and sort logs dynamically
  const processedLogs = useMemo(() => {
    return logs
      .filter((log) => {
        // Status filter
        if (statusFilter !== 'ALL' && log.status !== statusFilter) return false;
        // Rating filter
        if (minRating > 0 && (log.rating ?? 0) < minRating) return false;
        return true;
      })
      .sort((a, b) => {
        if (sortBy === 'NEWEST') {
          return new Date(b.playedOn).getTime() - new Date(a.playedOn).getTime();
        }
        if (sortBy === 'OLDEST') {
          return new Date(a.playedOn).getTime() - new Date(b.playedOn).getTime();
        }
        if (sortBy === 'RATING_HIGH') {
          return (b.rating ?? 0) - (a.rating ?? 0);
        }
        if (sortBy === 'RATING_LOW') {
          return (a.rating ?? 0) - (b.rating ?? 0);
        }
        return 0;
      });
  }, [logs, statusFilter, sortBy, minRating]);

  return (
    <div className="space-y-6">
      {/* Filter and Sort Controls */}
      <LogFilters
        status={statusFilter}
        setStatus={setStatusFilter}
        sortBy={sortBy}
        setSortBy={setSortBy}
        minRating={minRating}
        setMinRating={setMinRating}
      />

      {/* Render Logs */}
      {processedLogs.length === 0 ? (
        <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-8 text-center text-slate-500 text-sm">
          No logs match your selected filter criteria.
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {processedLogs.map((log) => (
            <div
              key={log.id}
              className="bg-slate-900 border border-slate-800 rounded-xl p-4 flex gap-4 items-start hover:border-slate-700 transition"
            >
              {/* Cover Poster Link */}
              <Link href={`/game/${log.externalGameId}`} className="shrink-0">
                {log.coverUrl ? (
                  <img
                    src={log.coverUrl}
                    alt={log.gameTitle}
                    className="w-20 h-28 object-cover rounded-md border border-slate-800 hover:opacity-80 transition"
                  />
                ) : (
                  <div className="w-20 h-28 bg-slate-800 rounded-md flex items-center justify-center text-xs text-slate-500">
                    No Cover
                  </div>
                )}
              </Link>

              {/* Log Details */}
              <div className="flex-1 min-w-0 space-y-2">
                <div className="flex justify-between items-start gap-2">
                  <Link href={`/game/${log.externalGameId}`} className="hover:text-purple-400 transition truncate">
                    <h3 className="font-bold text-slate-100 text-base truncate">{log.gameTitle}</h3>
                  </Link>
                  <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded bg-purple-600/20 text-purple-300 border border-purple-500/30 shrink-0">
                    {log.status}
                  </span>
                </div>

                {log.rating ? (
                  <StarRating value={log.rating} readOnly />
                ) : null}

                {log.review && (
                  <p className="text-xs text-slate-300 italic bg-slate-950/40 p-2.5 rounded-lg border border-slate-800/60 line-clamp-2">
                    "{log.review}"
                  </p>
                )}

                <p className="text-[11px] text-slate-500">
                  Logged on {new Date(log.playedOn).toLocaleDateString()}
                </p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
