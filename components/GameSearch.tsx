// components/GameSearch.tsx
'use client';

import { useState } from 'react';
import Link from 'next/link';

// Define explicit type for search results matching API output
export interface Game {
  id: number;
  name: string;
  coverUrl?: string | null;
}

interface GameSearchProps {
  onSelectGame?: (game: Game) => void;
}

export default function GameSearch({ onSelectGame }: GameSearchProps) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<Game[]>([]);
  const [loading, setLoading] = useState(false);

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!query.trim()) return;

    setLoading(true);
    try {
      const res = await fetch('/api/games/search', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query }),
      });

      if (res.ok) {
        const data = await res.json();
        setResults(data);
      }
    } catch (error) {
      console.error('Failed to search games:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="w-full space-y-6">
      {/* Search Input Bar */}
      <form onSubmit={handleSearch} className="flex gap-2">
        <input
          type="text"
          placeholder="Search for a game (e.g., Elden Ring, Zelda, Cyberpunk)..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className="flex-1 bg-slate-900 border border-slate-800 rounded-xl px-4 py-3 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-purple-500 transition"
        />
        <button
          type="submit"
          disabled={loading}
          className="bg-purple-600 hover:bg-purple-500 disabled:opacity-50 text-white font-medium px-6 py-3 rounded-xl text-sm transition shrink-0"
        >
          {loading ? 'Searching...' : 'Search'}
        </button>
      </form>

      {/* Results Grid */}
      {results.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
          {results.map((game) => (
            <div
              key={game.id}
              className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden p-3 flex flex-col justify-between hover:border-slate-700 transition group"
            >
              <div className="space-y-2">
                {/* Clickable Game Poster */}
                <Link href={`/game/${game.id}`} className="block overflow-hidden rounded-lg relative aspect-[3/4]">
                  {game.coverUrl ? (
                    <img
                      src={
                        game.coverUrl?.startsWith('//')
                            ? 'https:${game.coverUrl}'
                            : game.coverUrl || undefined
                        }
                      alt={game.name}
                      className="w-full h-full object-cover group-hover:scale-105 transition duration-200"
                    />
                  ) : (
                    <div className="w-full h-full bg-slate-800 flex items-center justify-center text-slate-500 text-xs text-center p-2">
                      No Cover
                    </div>
                  )}
                </Link>

                {/* Clickable Title */}
                <Link href={`/game/${game.id}`} className="block hover:text-purple-400 transition">
                  <h3 className="font-bold text-white text-xs sm:text-sm line-clamp-2 leading-tight">
                    {game.name}
                  </h3>
                </Link>
              </div>

              {/* Log Button */}
              {onSelectGame && (
                <button
                  onClick={() => onSelectGame(game)}
                  className="mt-3 w-full bg-slate-800 hover:bg-purple-600 text-slate-300 hover:text-white font-medium py-1.5 rounded-lg text-xs transition"
                >
                  + Log
                </button>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}