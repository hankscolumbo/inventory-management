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
}

export default function SearchResultsGrid() {
  const searchParams = useSearchParams();
  const query = searchParams.get('q') || '';

  const [results, setResults] = useState<GameResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);
  const [userLists, setUserLists] = useState<{ id: string; title: string }[]>([]);

  useEffect(() => {
    getActiveUserLists().then((lists) => setUserLists(lists));
  }, []);

  // Fetch initial results when the search query changes
  useEffect(() => {
    async function fetchInitialResults() {
      if (!query.trim()) {
        setResults([]);
        setHasMore(false);
        return;
      }

      setLoading(true);
      setPage(1);
      try {
        const res = await fetch(`/api/search?q=${encodeURIComponent(query)}&page=1&limit=20`);
        if (res.ok) {
          const data = await res.json();
          
          // DEFENSIVE CHECK: Support both paginated objects and flat arrays
          const fetchedResults = Array.isArray(data.results) 
            ? data.results 
            : Array.isArray(data) 
              ? data 
              : [];
              
          setResults(fetchedResults);
          setHasMore(Boolean(data.hasMore));
        } else {
          setResults([]);
          setHasMore(false);
        }
      } catch (err) {
        console.error('Failed to fetch search results:', err);
        setResults([]);
        setHasMore(false);
      } finally {
        setLoading(false);
      }
    }

    fetchInitialResults();
  }, [query]);

  // Handle "Load More" pagination
  const handleLoadMore = async () => {
    if (loadingMore || !hasMore) return;

    const nextPage = page + 1;
    setLoadingMore(true);

    try {
      const res = await fetch(`/api/search?q=${encodeURIComponent(query)}&page=${nextPage}&limit=20`);
      if (res.ok) {
        const data = await res.json();
        
        // DEFENSIVE CHECK
        const newResults = Array.isArray(data.results) 
          ? data.results 
          : Array.isArray(data) 
            ? data 
            : [];

        // Append new page items without duplicates
        setResults((prev) => {
          const existingIds = new Set(prev.map((g) => g.id));
          const filteredNew = newResults.filter((g: GameResult) => !existingIds.has(g.id));
          return [...prev, ...filteredNew];
        });

        setPage(nextPage);
        setHasMore(Boolean(data.hasMore) && newResults.length > 0);
      }
    } catch (err) {
      console.error('Failed to load more results:', err);
    } finally {
      setLoadingMore(false);
    }
  };

  if (!query) return null;

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 space-y-6">
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
        <>
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
                          className="px-2 py-1 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-md transition text-[11px] font-semibold flex items-center gap-1 cursor-pointer"
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
                        className="px-2 py-1 bg-purple-600/30 hover:bg-purple-600/50 text-purple-300 rounded-md transition text-[11px] font-semibold flex items-center gap-1 cursor-pointer"
                      >
                        <span>➕</span> Log
                      </button>
                    }
                  />
                </div>
              </div>
            ))}
          </div>

          {/* Load More Button */}
          {hasMore && (
            <div className="flex justify-center pt-4 pb-8">
              <button
                type="button"
                onClick={handleLoadMore}
                disabled={loadingMore}
                className="px-6 py-2.5 bg-slate-900 border border-slate-800 hover:border-purple-500/50 hover:bg-slate-800 text-slate-200 text-xs font-bold rounded-xl transition cursor-pointer flex items-center gap-2"
              >
                {loadingMore ? (
                  <>
                    <div className="w-3.5 h-3.5 border-2 border-purple-400 border-t-transparent rounded-full animate-spin" />
                    Loading more...
                  </>
                ) : (
                  'Load More Games'
                )}
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
