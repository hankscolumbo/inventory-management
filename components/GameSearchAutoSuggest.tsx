// components/GameSearchAutoSuggest.tsx
'use client';

import { useState, useEffect, useRef } from 'react';
import { useDebounce } from '@/hooks/useDebounce';
import Link from 'next/link';

interface SearchResult {
  id: number;
  name: string;
  coverUrl?: string | null;
  releaseYear?: number | null;
}

export default function GameSearchAutoSuggest() {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  
  const debouncedQuery = useDebounce(query, 300);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Fetch results when debounced query updates
  useEffect(() => {
    async function fetchResults() {
      if (!debouncedQuery.trim()) {
        setResults([]);
        setIsOpen(false);
        return;
      }

      setLoading(true);
      try {
        const res = await fetch(`/api/search?q=${encodeURIComponent(debouncedQuery)}`);
        if (res.ok) {
          const data = await res.json();
          setResults(data);
          setIsOpen(true);
        }
      } catch (err) {
        console.error('Failed to search games:', err);
      } finally {
        setLoading(false);
      }
    }

    fetchResults();
  }, [debouncedQuery]);

  // Close dropdown on outside click
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <div className="relative w-full max-w-xl mx-auto" ref={dropdownRef}>
      {/* Search Input Box */}
      <div className="relative">
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onFocus={() => query.trim() && setIsOpen(true)}
          placeholder="Search games (e.g. Elden Ring, Zelda)..."
          className="w-full bg-slate-900 border border-slate-800 rounded-xl px-4 py-3 pl-11 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-purple-500 shadow-xl transition"
        />
        
        {/* Search Icon */}
        <div className="absolute left-3.5 top-3.5 text-slate-500">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
        </div>

        {/* Loading Spinner */}
        {loading && (
          <div className="absolute right-3.5 top-3.5">
            <div className="w-4 h-4 border-2 border-purple-500 border-t-transparent rounded-full animate-spin" />
          </div>
        )}
      </div>

      {/* Auto-Suggest Dropdown */}
      {isOpen && (
        <div className="absolute left-0 right-0 top-full mt-2 bg-slate-900 border border-slate-800 rounded-xl shadow-2xl overflow-hidden z-50 max-h-96 overflow-y-auto divide-y divide-slate-800/60">
          {results.length === 0 && !loading ? (
            <div className="p-4 text-xs text-slate-500 text-center">
              No games found for "{query}"
            </div>
          ) : (
            results.map((game) => (
              <Link
                key={game.id}
                href={`/game/${game.id}`}
                onClick={() => setIsOpen(false)}
                className="flex items-center gap-3 p-3 hover:bg-slate-800/60 transition group"
              >
                {/* Cover Thumbnail */}
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

                {/* Info */}
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
  );
}
