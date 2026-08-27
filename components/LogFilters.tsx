// components/LogFilters.tsx
'use client';

export type StatusFilter = 'ALL' | 'PLAYED' | 'PLAYING' | 'WANT TO PLAY' | 'BACKLOG';
export type SortOption = 'NEWEST' | 'OLDEST' | 'RATING_HIGH' | 'RATING_LOW';

interface LogFiltersProps {
  status: StatusFilter;
  setStatus: (status: StatusFilter) => void;
  sortBy: SortOption;
  setSortBy: (sort: SortOption) => void;
  minRating: number;
  setMinRating: (rating: number) => void;
}

export default function LogFilters({
  status,
  setStatus,
  sortBy,
  setSortBy,
  minRating,
  setMinRating,
}: LogFiltersProps) {
  return (
    <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 flex flex-wrap items-center justify-between gap-4">
      {/* Status Tabs */}
      <div className="flex gap-1 bg-slate-950 p-1 rounded-lg border border-slate-800/80">
        {(['ALL', 'PLAYED', 'PLAYING', 'WANT TO PLAY', 'BACKLOG'] as const).map((s) => (
          <button
            key={s}
            onClick={() => setStatus(s)}
            className={`px-3 py-1.5 rounded-md text-xs font-semibold transition ${
              status === s
                ? 'bg-purple-600 text-white shadow-sm'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            {s === 'ALL' ? 'All Logs' : s}
          </button>
        ))}
      </div>

      <div className="flex items-center gap-4 flex-wrap">
        {/* Rating Filter Dropdown */}
        <div className="flex items-center gap-2">
          <label className="text-xs text-slate-400 font-medium">Rating:</label>
          <select
            value={minRating}
            onChange={(e) => setMinRating(Number(e.target.value))}
            className="bg-slate-950 border border-slate-800 text-slate-300 text-xs rounded-lg px-2.5 py-1.5 focus:outline-none focus:border-purple-500"
          >
            <option value={0}>Any Rating</option>
            <option value={4}>★ 4.0+</option>
            <option value={3}>★ 3.0+</option>
            <option value={2}>★ 2.0+</option>
          </select>
        </div>

        {/* Sort Dropdown */}
        <div className="flex items-center gap-2">
          <label className="text-xs text-slate-400 font-medium">Sort By:</label>
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as SortOption)}
            className="bg-slate-950 border border-slate-800 text-slate-300 text-xs rounded-lg px-2.5 py-1.5 focus:outline-none focus:border-purple-500"
          >
            <option value="NEWEST">Most Recent</option>
            <option value="OLDEST">Oldest First</option>
            <option value="RATING_HIGH">Highest Rated</option>
            <option value="RATING_LOW">Lowest Rated</option>
          </select>
        </div>
      </div>
    </div>
  );
}