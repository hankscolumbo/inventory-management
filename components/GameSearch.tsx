// components/GameSearch.tsx
'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useDebounce } from '@/hooks/useDebounce';
import Link from 'next/link';
import { getActiveUserLists } from '@/app/actions/getUserLists';
import LogGameButton from '@/components/LogGameButton';
import AddToListModal from '@/components/AddToListModal';

interface GameResult {
  id: number;
  name: string;
  coverUrl?: string | null;
  releaseYear?: number | null;
  genres?: string;
}

interface GameSearchProps {
  initialQuery?: string;
}

export default function GameSearch({ initialQuery = '' }: GameSearchProps) {
  const router = useRouter();
  const [query, setQuery] = useState(initialQuery);
  const [results, setResults] = useState<GameResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [userLists, setUserLists] = useState<{ id: string; title: string }[]>([]);

  const debouncedQuery = useDebounce(query, 300);
  const searchRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null); // Ref for input focus checks

  useEffect(() => {
    getActiveUserLists().then((lists) => setUserLists(lists));
  }, []);

  // Live Dropdown Auto-Suggest Search
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
          // Only open dropdown if the user is actively focused on the input field
          if (document.activeElement === inputRef.current) {
            setIsDropdownOpen(true);
          }
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

  // Submit search query to /search page
  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!query.trim()) return;

    setIsDropdownOpen(false);
    inputRef.current?.blur(); // Explicitly remove focus from input field
    router.push(`/search?q=${encodeURIComponent(query.trim())}`);
  };

  return (
    <div className="relative w-full max-w-xl mx-auto" ref={searchRef}>
      <form onSubmit={handleSearchSubmit} className="relative">
        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onFocus={() => query.trim() && results.length > 0 && setIsDropdownOpen(true)}
          placeholder="Search games..."
          className="w-full bg-slate-900 border border-slate-800 rounded-xl px-4 py-3 pl-11 pr-20 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-purple-500 shadow-xl transition"
        />

        <div className="absolute left-3.5 top-3.5 text-slate-500">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
        </div>

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
              <div
                key={game.id}
                className="flex items-center justify-between p-3 hover:bg-slate-800/60 transition group"
              >
                <Link
                  href={`/game/${game.id}`}
                  onClick={() => setIsDropdownOpen(false)}
                  className="flex items-center gap-3 flex-1 min-w-0"
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

                <div className="flex items-center gap-1.5 ml-3 opacity-90 sm:opacity-0 group-hover:opacity-100 transition shrink-0">
                  {userLists.length > 0 && (
                    <AddToListModal
                      game={{
                        name: game.name,
                        coverUrl: game.coverUrl,
                        igdbId: game.id,
                      }}
                      userLists={userLists}
                      customTrigger={
                        <button
                          type="button"
                          title="Add to List"
                          className="p-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg transition text-xs"
                        >
                          📋
                        </button>
                      }
                    />
                  )}

                  <LogGameButton
                    game={{
                      id: game.id,
                      name: game.name,
                      coverUrl: game.coverUrl,
                    }}
                    customTrigger={
                      <button
                        type="button"
                        title="Log Game"
                        className="p-1.5 bg-purple-600/20 hover:bg-purple-600/40 text-purple-300 rounded-lg transition text-xs"
                      >
                        ➕
                      </button>
                    }
                  />
                </div>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
}
