// components/SearchResultsGrid.tsx
'use client';

import { useState, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
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

export default function SearchResultsGrid() {
  const searchParams = useSearchParams();
  const query = searchParams.get('q') || '';

  const [results, setResults] = useState<GameResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [userLists, setUserLists] = useState<{ id: string; title: string }[]>([]);

  useEffect(() => {
    getActiveUserLists().then((lists) => setUserLists(lists));
  }, []);

  useEffect(() => {
    async function fetchGridResults() {
      if (!query.trim()) {
        setResults([]);
        return;
      }

      setLoading(true);
      try {
        const res = await fetch(`/api/search?q=${encodeURIComponent(query)}&limit=20`);
        if (res.ok) {
          const data = await res.json();
          setResults(data);
        }
      } catch (err) {
        console.error('Failed to fetch search results:', err);
      } finally {
        setLoading(false);
      }
    }

    fetchGridResults();
  }, [query]);

  if (!query) return null;

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 space-y-4">
      <h3 className="text-lg font-bold text-white">
        Search Results for <span className="text-purple-400">"{query}"</span>
      </h3>

      {loading ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
          {Array.from({ length: 10 }).map((_, i) => (
            <div key={i} className="bg-slate-900 border border-slate-800 rounded-xl h-64 animate-pulse" />
          ))}
        </div>
      ) : results.length === 0 ? (
        <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-8 text-center text-slate-500 text-sm">
          No games found matching "{query}".
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
          {results.map((game) => (
            <div
              key={game.id}
              className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden hover:border-slate-700 hover:scale-[1.02] transition flex flex-col group shadow-lg relative"
            >
              <Link href={`/game/${game.id}`} className="flex-1 flex flex-col">
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

              {/* Quick Action Overlay Buttons on Grid Cards */}
              <div className="p-2 border-t border-slate-800/80 bg-slate-950/90 flex items-center justify-end gap-1.5">
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
                        className="px-2 py-1 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-md transition text-[11px] font-semibold flex items-center gap-1"
                      >
                        <span>📋</span> List
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
                      className="px-2 py-1 bg-purple-600/30 hover:bg-purple-600/50 text-purple-300 rounded-md transition text-[11px] font-semibold flex items-center gap-1"
                    >
                      <span>➕</span> Log
                    </button>
                  }
                />
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}