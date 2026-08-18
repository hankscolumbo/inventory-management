// app/u/[username]/ProfileGameGrid.tsx
'use client';

import { useState, useMemo } from 'react';
import Link from 'next/link';

interface GameLog {
  id: string;
  externalGameId: number;
  steamAppId?: number | null;
  gameTitle: string;
  coverUrl?: string | null;
  status: string;
  rating?: number | null;
  playtimeHours?: number | null;
}

export default function ProfileGameGrid({ logs }: { logs: GameLog[] }) {
  const [search, setSearch] = useState('');
  const [activeTab, setActiveTab] = useState<'ALL' | 'PLAYED' | 'PLAYING' | 'BACKLOG'>('ALL');
  const [sortBy, setSortBy] = useState<'NEWEST' | 'TITLE' | 'RATING' | 'PLAYTIME'>('NEWEST');
  const [page, setPage] = useState(1);
  const ITEMS_PER_PAGE = 24;

  // Filter and Sort Logic
  const filteredLogs = useMemo(() => {
    return logs
      .filter((log) => {
        const matchesTab = activeTab === 'ALL' || log.status === activeTab;
        const matchesSearch = log.gameTitle.toLowerCase().includes(search.toLowerCase());
        return matchesTab && matchesSearch;
      })
      .sort((a, b) => {
        if (sortBy === 'TITLE') return a.gameTitle.localeCompare(b.gameTitle);
        if (sortBy === 'RATING') return (b.rating || 0) - (a.rating || 0);
        if (sortBy === 'PLAYTIME') return (b.playtimeHours || 0) - (a.playtimeHours || 0);
        return 0; // Default order
      });
  }, [logs, search, activeTab, sortBy]);

  // Paginate list
  const totalPages = Math.ceil(filteredLogs.length / ITEMS_PER_PAGE);
  const paginatedLogs = filteredLogs.slice((page - 1) * ITEMS_PER_PAGE, page * ITEMS_PER_PAGE);

  return (
    <div className="space-y-6">
      {/* Control Bar */}
      <div className="flex flex-col md:flex-row gap-4 justify-between items-stretch md:items-center bg-slate-900 p-4 rounded-2xl border border-slate-800">
        
        {/* Status Tabs */}
        <div className="flex items-center gap-1 bg-slate-950 p-1 rounded-xl border border-slate-800/80 overflow-x-auto">
          {(['ALL', 'PLAYED', 'PLAYING', 'BACKLOG'] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => { setActiveTab(tab); setPage(1); }}
              className={`px-3 py-1.5 text-xs font-bold rounded-lg transition whitespace-nowrap ${
                activeTab === tab
                  ? 'bg-purple-600 text-white shadow-md'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              {tab}
            </button>
          ))}
        </div>

        {/* Search & Sort Controls */}
        <div className="flex items-center gap-3">
          <input
            type="text"
            placeholder="Search collection..."
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            className="bg-slate-950 border border-slate-800 rounded-xl px-3 py-1.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-purple-500 w-full sm:w-48"
          />

          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as any)}
            className="bg-slate-950 border border-slate-800 rounded-xl px-3 py-1.5 text-xs text-slate-300 focus:outline-none focus:border-purple-500"
          >
            <option value="NEWEST">Recently Added</option>
            <option value="TITLE">Title (A-Z)</option>
            <option value="RATING">Highest Rated</option>
            <option value="PLAYTIME">Most Played</option>
          </select>
        </div>
      </div>

      {/* Grid */}
      {paginatedLogs.length === 0 ? (
        <div className="bg-slate-900/50 border border-slate-800 rounded-2xl p-12 text-center text-slate-500 text-sm">
          No games found matching your filters.
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
          {paginatedLogs.map((log) => {
            const appId = log.steamAppId || log.externalGameId;

            return (
              <Link
                key={log.id}
                href={`/game/${log.externalGameId}`}
                className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden hover:border-purple-500/50 hover:scale-[1.02] transition duration-200 flex flex-col group shadow-lg"
              >
                <div className="aspect-[3/4] w-full bg-slate-950 relative overflow-hidden">
                  {log.coverUrl ? (
                    <img
                      src={log.coverUrl}
                      alt={log.gameTitle}
                      className="w-full h-full object-cover group-hover:scale-105 transition duration-300"
                      onError={(e) => {
                        const target = e.target as HTMLImageElement;
                        // Prevent infinite re-trigger loop if fallback also fails
                        if (appId && !target.src.includes('header.jpg')) {
                          target.src = `https://cdn.cloudflare.steamstatic.com/steam/apps/${appId}/header.jpg`;
                        }
                      }}
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-xs text-slate-500 font-medium p-2 text-center">
                      {log.gameTitle}
                    </div>
                  )}

                  {/* Status Badge */}
                  <span className={`absolute top-2 right-2 px-1.5 py-0.5 text-[9px] font-black uppercase rounded border shadow-md ${
                    log.status === 'PLAYED'
                      ? 'bg-emerald-950/90 text-emerald-300 border-emerald-500/40'
                      : log.status === 'PLAYING'
                      ? 'bg-cyan-950/90 text-cyan-300 border-cyan-500/40'
                      : 'bg-amber-950/90 text-amber-300 border-amber-500/40'
                  }`}>
                    {log.status}
                  </span>

                  {/* Playtime Overlay Badge (If Available) */}
                  {log.playtimeHours && log.playtimeHours > 0 ? (
                    <span className="absolute bottom-2 left-2 bg-slate-950/80 backdrop-blur-xs text-slate-300 border border-slate-700/60 text-[9px] font-mono px-1.5 py-0.5 rounded shadow">
                      {log.playtimeHours} hrs
                    </span>
                  ) : null}
                </div>

                <div className="p-2.5 flex-1 flex flex-col justify-between space-y-1">
                  <h3 className="text-xs font-bold text-slate-100 group-hover:text-purple-400 line-clamp-1 transition">
                    {log.gameTitle}
                  </h3>
                </div>
              </Link>
            );
          })}
        </div>
      )}

      {/* Pagination Controls */}
      {totalPages > 1 && (
        <div className="flex justify-center items-center gap-2 pt-4">
          <button
            disabled={page === 1}
            onClick={() => setPage((p) => p - 1)}
            className="px-3 py-1.5 bg-slate-900 border border-slate-800 text-xs font-bold text-slate-300 rounded-lg hover:bg-slate-800 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
          >
            Previous
          </button>
          <span className="text-xs font-mono text-slate-400 px-2">
            Page {page} of {totalPages}
          </span>
          <button
            disabled={page === totalPages}
            onClick={() => setPage((p) => p + 1)}
            className="px-3 py-1.5 bg-slate-900 border border-slate-800 text-xs font-bold text-slate-300 rounded-lg hover:bg-slate-800 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
          >
            Next
          </button>
        </div>
      )}
    </div>
  );
}