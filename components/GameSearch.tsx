'use client';

import { useState } from 'react';
import LogModal from '@/components/LogModal';

interface IGDBGame {
  id: number;
  name: string;
  cover?: {
    id: number;
    url: string;
  };
  first_release_date?: number;
}

export default function GameSearch() {
  const [query, setQuery] = useState('');
  const [games, setGames] = useState<IGDBGame[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedGame, setSelectedGame] = useState<IGDBGame | null>(null);

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!query.trim()) return;

    setLoading(true);
    try {
      const res = await fetch(`/api/games/search?q=${encodeURIComponent(query)}`);
      const data = await res.json();
      setGames(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error('Failed to search games:', err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="w-full max-w-5xl mx-auto p-4 space-y-6">
      {/* Search Bar */}
      <form onSubmit={handleSearch} className="flex gap-2">
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search for a game (e.g., Elden Ring, Zelda)..."
          className="flex-1 bg-slate-800 border border-slate-700 text-white rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-indigo-500"
        />
        <button
          type="submit"
          disabled={loading}
          className="bg-indigo-600 hover:bg-indigo-500 text-white font-medium px-6 py-3 rounded-lg transition disabled:opacity-50"
        >
          {loading ? 'Searching...' : 'Search'}
        </button>
      </form>

      {/* Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
        {games.map((game) => {
          const coverUrl = game.cover?.url
            ? `https:${game.cover.url.replace('t_thumb', 't_cover_big')}`
            : null;

          const releaseYear = game.first_release_date
            ? new Date(game.first_release_date * 1000).getFullYear()
            : null;

          return (
            <div
              key={game.id}
              onClick={() => setSelectedGame(game)}
              className="group relative bg-slate-800 rounded-lg overflow-hidden border border-slate-700/50 hover:border-indigo-500 transition-all duration-200 hover:-translate-y-1 shadow-md hover:shadow-xl cursor-pointer"
            >
              <div className="aspect-[3/4] w-full relative bg-slate-900">
                {coverUrl ? (
                  <img
                    src={coverUrl}
                    alt={game.name}
                    className="w-full h-full object-cover group-hover:opacity-80 transition-opacity"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-slate-500 text-xs p-2 text-center">
                    No Cover Available
                  </div>
                )}
              </div>

              <div className="p-3">
                <h3 className="font-semibold text-white text-sm truncate group-hover:text-indigo-400">
                  {game.name}
                </h3>
                {releaseYear && (
                  <p className="text-xs text-slate-400 mt-0.5">{releaseYear}</p>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Log Modal */}
      <LogModal
        game={selectedGame}
        onClose={() => setSelectedGame(null)}
      />
    </div>
  );
}