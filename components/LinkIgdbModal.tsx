'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { linkIgdbToLog } from '@/app/actions/linkIgdbToLog';

interface GameSearchResult {
  id: number;
  name: string;
  coverUrl?: string | null;
  releaseYear?: number | null;
}

export default function LinkIgdbModal({ logId, currentTitle }: { logId: string; currentTitle: string }) {
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState(currentTitle);
  const [results, setResults] = useState<GameSearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [isPending, startTransition] = useTransition();

  const handleSearch = async (searchTerm: string) => {
    if (!searchTerm.trim()) {
      setResults([]);
      return;
    }
    setLoading(true);
    try {
      const res = await fetch(`/api/search?q=${encodeURIComponent(searchTerm)}&limit=5`);
      if (res.ok) {
        const data = await res.json();
        setResults(Array.isArray(data) ? data : data.results || []);
      }
    } catch (err) {
      console.error('Failed to search IGDB:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleSelectGame = (game: GameSearchResult) => {
    startTransition(async () => {
      const res = await linkIgdbToLog(logId, game.id, game.name);
      if (res.success) {
        setIsOpen(false);
        router.refresh();
      }
    });
  };

  return (
    <>
      <button
        type="button"
        onClick={() => {
          setIsOpen(true);
          handleSearch(query);
        }}
        className="px-2 py-1 bg-slate-800 hover:bg-slate-700 text-slate-300 text-[10px] font-semibold rounded border border-slate-700 transition cursor-pointer"
      >
        🖼️ Link Cover
      </button>

      {isOpen && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-md w-full p-6 space-y-4 shadow-2xl relative">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="text-sm font-bold text-white">Link Cover Art</h3>
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                className="text-slate-400 hover:text-white text-xs font-bold"
              >
                ✕
              </button>
            </div>

            <input
              type="text"
              value={query}
              onChange={(e) => {
                setQuery(e.target.value);
                handleSearch(e.target.value);
              }}
              placeholder="Search game title on IGDB..."
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-purple-500"
            />

            <div className="max-h-60 overflow-y-auto space-y-2 divide-y divide-slate-800/60">
              {loading ? (
                <div className="p-4 text-center text-xs text-slate-500">Searching...</div>
              ) : results.length === 0 ? (
                <div className="p-4 text-center text-xs text-slate-500">No matches found.</div>
              ) : (
                results.map((game) => (
                  <div
                    key={game.id}
                    onClick={() => handleSelectGame(game)}
                    className="pt-2 first:pt-0 flex items-center justify-between p-2 hover:bg-slate-800/60 rounded-xl cursor-pointer transition group"
                  >
                    <div className="flex items-center gap-3">
                      {game.coverUrl ? (
                        <img
                          src={game.coverUrl}
                          alt={game.name}
                          className="w-8 h-11 object-cover rounded border border-slate-700"
                        />
                      ) : (
                        <div className="w-8 h-11 bg-slate-800 rounded flex items-center justify-center text-[9px] text-slate-500">
                          No Cover
                        </div>
                      )}
                      <div>
                        <p className="text-xs font-semibold text-slate-200 group-hover:text-purple-400">
                          {game.name}
                        </p>
                      </div>
                    </div>
                    <button
                      type="button"
                      disabled={isPending}
                      className="px-2.5 py-1 bg-purple-600/30 group-hover:bg-purple-600 text-purple-300 group-hover:text-white text-[10px] font-bold rounded-lg transition"
                    >
                      {isPending ? 'Linking...' : 'Select'}
                    </button>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
