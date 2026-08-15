// components/ProfileTabs.tsx
'use client';

import { useState } from 'react';

interface GameLog {
  id: string;
  externalGameId: number;
  gameTitle: string;
  coverUrl?: string | null;
  rating?: number | null;
  review?: string | null;
  status: string;
  playedOn: Date;
}

export default function ProfileTabs({ logs }: { logs: GameLog[] }) {
  const [activeTab, setActiveTab] = useState<'ALL' | 'PLAYED' | 'PLAYING' | 'BACKLOG'>('ALL');

  const filteredLogs = logs.filter((log) => {
    if (activeTab === 'ALL') return true;
    return log.status === activeTab;
  });

  return (
    <div className="space-y-6">
      {/* Tab Navigation */}
      <div className="flex border-b border-slate-800 gap-6 text-sm font-medium">
        {(['ALL', 'PLAYED', 'PLAYING', 'BACKLOG'] as const).map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`pb-3 transition relative ${
              activeTab === tab
                ? 'text-purple-400 font-semibold'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            {tab === 'ALL' && `All Logs (${logs.length})`}
            {tab === 'PLAYED' && `Completed (${logs.filter((l) => l.status === 'PLAYED').length})`}
            {tab === 'PLAYING' && `Playing (${logs.filter((l) => l.status === 'PLAYING').length})`}
            {tab === 'BACKLOG' && `Backlog (${logs.filter((l) => l.status === 'BACKLOG').length})`}

            {activeTab === tab && (
              <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-purple-500 rounded-full" />
            )}
          </button>
        ))}
      </div>

      {/* Logs Feed Grid */}
      {filteredLogs.length === 0 ? (
        <div className="py-12 text-center text-slate-500 text-sm">
          No games found in this category.
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filteredLogs.map((log) => (
            <div
              key={log.id}
              className="bg-slate-900 border border-slate-800/80 rounded-xl p-4 flex gap-4 items-start hover:border-slate-700 transition"
            >
              {/* Cover Poster */}
              {log.coverUrl ? (
                <img
                  src={log.coverUrl}
                  alt={log.gameTitle}
                  className="w-20 h-28 object-cover rounded-md border border-slate-800 shrink-0"
                />
              ) : (
                <div className="w-20 h-28 bg-slate-800 rounded-md shrink-0 flex items-center justify-center text-xs text-slate-500">
                  No Cover
                </div>
              )}

              {/* Log Information */}
              <div className="flex-1 min-w-0 space-y-1.5">
                <div className="flex justify-between items-start">
                  <h3 className="font-bold text-slate-100 text-base truncate">{log.gameTitle}</h3>
                  <span className="text-xs px-2 py-0.5 rounded bg-slate-800 text-slate-300 font-medium">
                    {log.status}
                  </span>
                </div>

                {log.rating && (
                  <div className="text-amber-400 font-semibold text-sm">
                    {'★'.repeat(Math.round(log.rating))}
                    <span className="text-slate-500 text-xs ml-1">({log.rating}/5)</span>
                  </div>
                )}

                {log.review && (
                  <p className="text-sm text-slate-300 line-clamp-2 italic bg-slate-950/50 p-2 rounded border border-slate-800/50">
                    "{log.review}"
                  </p>
                )}

                <p className="text-xs text-slate-500">
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