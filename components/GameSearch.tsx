// components/GameSearch.tsx
'use client';

import { useState, useEffect, useRef } from 'react';
import { useDebounce } from '@/hooks/useDebounce';
import Link from 'next/link';

interface GameResult {
  id: number;
  name: string;
  coverUrl?: string | null;
  releaseYear?: number | null;
  genres?: string;
}

export default function GameSearch() {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<GameResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  
  // Track grid results submitted via Enter/Form submission
  const [gridQuery, setGridQuery] = useState('');
  const [gridResults, setGridResults] = useState<GameResult[]>([]);
  const [gridLoading, setGridLoading] = useState(false);

  const debouncedQuery = useDebounce(query, 300);
  const searchRef = useRef<HTMLDivElement>(null);

  // 1. Live Dropdown Search (Triggers on typing)
  useEffect(() => {
    async function fetchDropdownResults() {
      if (!debouncedQuery.trim()) {
        setResults([]);
        setIsDropdownOpen(false);
        return;
      }

      setLoading(true);
      try {
        const res = await fetch(`/api/search?q=${encodeURIComponent(debouncedQuery)}`);
        if (res.ok) {
          const data = await res.json();
          setResults(data);
          setIsDropdownOpen(true);
        }
      } catch (err) {
        console.error('Failed to search games:', err);
      } finally {
        setLoading(false);
      }
    }

    fetchDropdownResults();
  }, [debouncedQuery]);

  // Close dropdown on outside click
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (searchRef.current && !searchRef.current.contains(event.target as Node)) {
        setIsDropdownOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // 2. Full Grid Search (Triggers on Enter / Form Submit)
  const handleSearchSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!query.trim()) return;

    // Close dropdown
    setIsDropdownOpen(false);
    setGridQuery(query);
    setGridLoading(true);

    try {
      // Fetch up to 20 results for the main grid view
      const res = await fetch(`/api/search?q=${encodeURIComponent(query)}&limit=20`);
      if (res.ok) {
        const data = await res.json();
        setGridResults(data);
      }
    } catch (err) {
      console.error('Failed to execute full search:', err);
    } finally {
      setGridLoading(false);
    }
  };

  return (
    <div className="w-full space-y-8">
      {/* Search Bar Container */}
      <div className="relative w-full max-w-xl mx-auto" ref={searchRef}>
        <form onSubmit={handleSearchSubmit} className="relative">
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onFocus={() => query.trim() && setResults.length > 0 && setIsDropdownOpen(true)}
            placeholder="Search games (press Enter for full results)..."
            className="w-full bg-slate-900 border border-slate-800 rounded-xl px-4 py-3 pl-11 pr-20 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-purple-500 shadow-xl transition"
          />

          {/* Search Icon */}
          <div className="absolute left-3.5 top-3.5 text-slate-500">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          </div>

          {/* Submit Button inside input */}
          <button
            type="submit"
            className="absolute right-2 top-2 bottom-2 px-3 bg-purple-600 hover:bg-purple-500 text-white text-xs font-medium rounded-lg transition"
          >
            Search
          </button>
        </form>

        {/* Live Auto-Suggest Dropdown */}
        {isDropdownOpen && (
          <div className="absolute left-0 right-0 top-full mt-2 bg-slate-900 border border-slate-800 rounded-xl shadow-2xl overflow-hidden z-50 max-h-96 overflow-y-auto divide-y divide-slate-800/60">
            {loading ? (
              <div className="p-4 text-xs text-slate-400 text-center flex items-center justify-center gap-2">
                <div className="w-4 h-4 border-2 border-purple-500 border-t-transparent rounded-full animate-spin" />
                Searching games...
              </div>
            ) : results.length === 0 ? (
              <div className="p-4 text-xs text-slate-500 text-center">
                No quick results for "{query}"
              </div>
            ) : (
              results.slice(0, 5).map((game) => (
                <Link
                  key={game.id}
                  href={`/game/${game.id}`}
                  onClick={() => setIsDropdownOpen(false)}
                  className="flex items-center gap-3 p-3 hover:bg-slate-800/60 transition group"
                >
                  {game.coverUrl ? (
                    <img
                      src={game.coverUrl.startsWith('//') ? `https:${game.coverUrl}` : game.coverUrl}
                      alt={game.name}
                      className="w-10 h-14 object-cover rounded border border-slate-700 shrink-0"
                    />
                  ) : (
                    <div className="w-10 h-14 bg-slate-800 rounded flex items-center justify-center text-[10px] text-slate-500 shrink-0">
                      No Cover
                    </div>
                  )}

                  <div className="flex-1 min-w-0">
                    <h4 className="text-sm font-semibold text-slate-200 group-hover:text-purple-400 truncate transition">
                      {game.name}
                    </h4>
                    {game.releaseYear && (
                      <p className="text-xs text-slate-500 mt-0.5">{game.releaseYear}</p>
                    )}
                  </div>
                </Link>
              ))
            )}
          </div>
        )}
      </div>

      {/* Full Grid Results (Displayed when Enter is pressed) */}
      {gridQuery && (
        <div className="space-y-4">
          <h3 className="text-lg font-bold text-white">
            Search Results for <span className="text-purple-400">"{gridQuery}"</span>
          </h3>

          {gridLoading ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
              {Array.from({ length: 10 }).map((_, i) => (
                <div key={i} className="bg-slate-900 border border-slate-800 rounded-xl h-64 animate-pulse" />
              ))}
            </div>
          ) : gridResults.length === 0 ? (
            <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-8 text-center text-slate-500 text-sm">
              No games found matching "{gridQuery}".
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
              {gridResults.map((game) => (
                <Link
                  key={game.id}
                  href={`/game/${game.id}`}
                  className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden hover:border-slate-700 hover:scale-[1.02] transition flex flex-col group shadow-lg"
                >
                  <div className="aspect-[3/4] w-full bg-slate-800 relative">
                    {game.coverUrl ? (
                      <img
                        src={game.coverUrl.startsWith('//') ? `https:${game.coverUrl}` : game.coverUrl}
                        alt={game.name}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-xs text-slate-500">
                        No Cover
                      </div>
                    )}
                  </div>
                  <div className="p-3 flex-1 flex flex-col justify-between space-y-1">
                    <h4 className="text-xs font-bold text-slate-100 group-hover:text-purple-400 line-clamp-2 transition">
                      {game.name}
                    </h4>
                    {game.releaseYear && (
                      <p className="text-[11px] text-slate-500 font-medium">{game.releaseYear}</p>
                    )}
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}