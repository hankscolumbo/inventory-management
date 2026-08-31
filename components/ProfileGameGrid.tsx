// app/u/[username]/ProfileGameGrid.tsx
'use client';

import { useState, useMemo, useEffect } from 'react';
import Link from 'next/link';
import GameCardActions from '@/components/GameCardActions';
import { getActiveUserLists } from '@/app/actions/getUserLists';
import GameCoverImage from './GameCoverImage';

interface GameLog {
  id: string;
  userId: string;
  igdbId?: number | null;
  steamAppId?: number | null;
  gameTitle: string;
  coverUrl?: string | null;
  status: string;
  substatus: string | null;
  rating?: number | null;
  playtimeHours?: number | null;
  isOwned?: boolean;
  createdAt?: Date;
  updatedAt?: Date;
}

export function getGameLogHref(log: GameLog): string {
  if (log.igdbId) {
    return `/game/${log.igdbId}`;
  }
  if (log.steamAppId) {
    return `/game/${log.steamAppId}?source=steam`;
  }
  return '#';
}

export default function ProfileGameGrid({ logs }: { logs: GameLog[] }) {
  const [search, setSearch] = useState('');
  const [activeTab, setActiveTab] = useState<string>('ALL');
  const [sortBy, setSortBy] = useState<'NEWEST' | 'TITLE' | 'RATING' | 'PLAYTIME'>('NEWEST');
  const [showOwnedOnly, setShowOwnedOnly] = useState(false);
  const [page, setPage] = useState(1);
  const [userLists, setUserLists] = useState<{ id: string; title: string }[]>([]);
  const ITEMS_PER_PAGE = 16;

  const STATUS_STYLES: Record<string, string> = {
    'PLAYED': 'bg-emerald-950/90 text-emerald-300 border-emerald-500/40',
    'PLAYING': 'bg-cyan-950/90 text-cyan-300 border-cyan-500/40',
    'BACKLOG': 'bg-amber-950/90 text-amber-300 border-amber-500/40',
    'WANT TO PLAY': 'bg-indigo-950/90 text-indigo-300 border-indigo-500/40',
  };

  const DEFAULT_STATUS_STYLE = 'bg-slate-900/90 text-slate-300 border-slate-700/60';

  useEffect(() => {
    getActiveUserLists().then((lists) => setUserLists(lists));
  }, []);

  const filteredLogs = useMemo(() => {
    return logs
      .filter((log) => {
        const matchesTab = activeTab === 'ALL' || log.status === activeTab;
        const matchesSearch = log.gameTitle.toLowerCase().includes(search.toLowerCase());
        const matchesOwned = showOwnedOnly ? Boolean(log.isOwned) : true;
        return matchesTab && matchesSearch && matchesOwned;
      })
      .sort((a, b) => {
        if (sortBy === 'TITLE') return a.gameTitle.localeCompare(b.gameTitle);
        if (sortBy === 'RATING') return (b.rating || 0) - (a.rating || 0);
        if (sortBy === 'PLAYTIME') return (b.playtimeHours || 0) - (a.playtimeHours || 0);
        return 0;
      });
  }, [logs, search, activeTab, sortBy, showOwnedOnly]);

  const totalPages = Math.ceil(filteredLogs.length / ITEMS_PER_PAGE);
  const paginatedLogs = filteredLogs.slice((page - 1) * ITEMS_PER_PAGE, page * ITEMS_PER_PAGE);

  return (
    <div className="space-y-6">
      {/* Control Bar */}
      <div className="flex flex-col md:flex-row gap-4 justify-between items-stretch md:items-center bg-slate-900 p-4 rounded-2xl border border-slate-800">
        {/* Status Filter Tabs */}
        <div className="flex items-center gap-1 bg-slate-950 p-1 rounded-xl border border-slate-800/80 overflow-x-auto">
          {(['ALL', 'PLAYED', 'PLAYING', 'WANT TO PLAY', 'BACKLOG'] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => {
                setActiveTab(tab);
                setPage(1);
              }}
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
        <div className="flex flex-wrap items-center gap-3">
          <button
            onClick={() => {
              setShowOwnedOnly((prev) => !prev);
              setPage(1);
            }}
            className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold rounded-xl border transition ${
              showOwnedOnly
                ? 'bg-emerald-500/20 border-emerald-500 text-emerald-400 shadow-md'
                : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-slate-200'
            }`}
          >
            <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 20 20">
              <path
                fillRule="evenodd"
                d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                clipRule="evenodd"
              />
            </svg>
            Owned
          </button>

          <input
            type="text"
            placeholder="Search..."
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
            className="bg-slate-950 border border-slate-800 rounded-xl px-3 py-1.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-purple-500 w-full sm:w-24"
          />

          <div className="relative inline-block">
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as any)}
              className="appearance-none bg-slate-950 border border-slate-800 rounded-xl pl-3 pr-8 py-1.5 text-xs text-slate-300 focus:outline-none focus:border-purple-500 cursor-pointer"
            >
              <option value="NEWEST">Recently Added</option>
              <option value="TITLE">Title (A-Z)</option>
              <option value="RATING">Highest Rated</option>
              <option value="PLAYTIME">Most Played</option>
            </select>
            <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-2.5 text-slate-400">
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
              </svg>
            </div>
          </div>
        </div>
      </div>

      {/* Grid */}
      {paginatedLogs.length === 0 ? (
        <div className="bg-slate-900/50 border border-slate-800 rounded-2xl p-12 text-center text-slate-500 text-sm">
          No games found matching your filters.
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-4 gap-4">
          {paginatedLogs.map((log) => {
            const href = getGameLogHref(log);

            return (
              <div
                key={log.id}
                className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden hover:border-purple-500/50 hover:scale-[1.02] transition duration-200 flex flex-col group shadow-lg"
              >
                {/* Cover & Title Link */}
                <Link href={href} className="flex-1 flex flex-col relative">
                  <div className="aspect-[3/4] w-full bg-slate-950 relative overflow-hidden">
                    {log.coverUrl ? (
                      <GameCoverImage
                        src={log.coverUrl}
                        alt={log.gameTitle}
                        steamAppId={log.steamAppId}
                        className="w-full h-full object-cover group-hover:scale-105 transition duration-300"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-xs text-slate-500 font-medium p-2 text-center">
                        {log.gameTitle}
                      </div>
                    )}

                    {/* Status Badge */}
                    <span
                      className={`absolute top-2 right-2 px-1.5 py-0.5 text-[9px] font-black uppercase rounded border shadow-md ${
                        STATUS_STYLES[log.status] || DEFAULT_STATUS_STYLE
                      }`}
                    >
                      {log.status}
                    </span>

                    {/* Playtime Badge */}
                    {log.playtimeHours && log.playtimeHours > 0 ? (
                      <span className="absolute top-2 left-2 bg-slate-950/80 backdrop-blur-xs text-slate-300 border border-slate-700/60 text-[9px] font-mono px-1.5 py-0.5 rounded shadow">
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

                {/* Unified GameCardActions */}
                <div className="p-2 border-t border-slate-800/80 bg-slate-950/90 z-20">
                  <GameCardActions
                    item={{
                      id: log.id,
                      gameTitle: log.gameTitle,
                      coverUrl: log.coverUrl,
                      igdbId: log.igdbId,
                      steamAppId: log.steamAppId,
                      status: log.status,
                      substatus: log.substatus,
                      rating: log.rating,
                      playtimeHours: log.playtimeHours,
                      isOwned: log.isOwned,
                    }}
                    userLists={userLists}
                  />
                </div>
              </div>
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