// app/browse/page.tsx
'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { triggerHaptic } from '@/lib/haptics';
import GameCardActions from '@/components/GameCardActions';

const PAGE_SIZE = 24;

const SORT_OPTIONS = [
  { label: 'Highest Rated', value: 'total_rating desc' },
  { label: 'Popularity', value: 'total_rating_count desc' },
  { label: 'Newest Releases', value: 'first_release_date desc' },
  { label: 'Title (A-Z)', value: 'gameTitle asc' },
] as const;

const PLATFORMS = [
  { id: '167', name: 'PS5' },
  { id: '48', name: 'PS4' },
  { id: '169', name: 'Xbox Series' },
  { id: '49', name: 'Xbox One' },
  { id: '130', name: 'Switch' },
  { id: '6', name: 'PC' },
];

const GENRES = [
  { id: '31', name: 'Adventure' },
  { id: '12', name: 'RPG' },
  { id: '5', name: 'Shooter' },
  { id: '8', name: 'Platformer' },
  { id: '9', name: 'Puzzle' },
  { id: '14', name: 'Sport' },
  { id: '10', name: 'Racing' },
  { id: '32', name: 'Indie' },
];

const DECADES = [
  { id: '2020', name: '2020s' },
  { id: '2010', name: '2010s' },
  { id: '2000', name: '2000s' },
  { id: '1990', name: '1990s' },
];

interface BrowseGame {
  id: number;
  name: string;
  coverUrl: string | null;
  releaseYear: number | null;
  rating: number | null;
}

export default function BrowsePage() {
  const [games, setGames] = useState<BrowseGame[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);

  // Filters State
  const [sort, setSort] = useState<string>(SORT_OPTIONS[0].value);
  const [platform, setPlatform] = useState<string | null>(null);
  const [genre, setGenre] = useState<string | null>(null);
  const [decade, setDecade] = useState<string | null>(null);

  const fetchGames = async (resetPage = false) => {
    setLoading(true);
    const currentPage = resetPage ? 1 : page;

    const params = new URLSearchParams({
      sort,
      page: currentPage.toString(),
      limit: PAGE_SIZE.toString(),
    });

    if (platform) params.append('platform', platform);
    if (genre) params.append('genre', genre);
    if (decade) params.append('decade', decade);

    try {
      const res = await fetch(`/api/browse?${params.toString()}`);
      if (res.ok) {
        const data = await res.json();
        setGames((prev) => (resetPage ? data : [...prev, ...data]));
        setHasMore(data.length === PAGE_SIZE);
        setPage(currentPage + 1);
      }
    } catch (error) {
      console.error('Failed to fetch browse results:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchGames(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sort, platform, genre, decade]);

  const FilterRow = ({
    items,
    selectedValue,
    onSelect,
  }: {
    items: { id: string; name: string }[];
    selectedValue: string | null;
    onSelect: (val: string | null) => void;
  }) => (
    <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-hide snap-x touch-pan-x -mx-4 px-4">
      <button
        type="button"
        onClick={() => {
          triggerHaptic('light');
          onSelect(null);
        }}
        className={`shrink-0 snap-start px-3 py-1.5 rounded-full text-xs font-bold transition border ${
          selectedValue === null
            ? 'bg-purple-600 border-purple-500 text-white'
            : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-slate-200'
        }`}
      >
        All
      </button>
      {items.map((item) => (
        <button
          key={item.id}
          type="button"
          onClick={() => {
            triggerHaptic('light');
            onSelect(item.id);
          }}
          className={`shrink-0 snap-start px-3 py-1.5 rounded-full text-xs font-bold transition border ${
            selectedValue === item.id
              ? 'bg-purple-600 border-purple-500 text-white'
              : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-slate-200'
          }`}
        >
          {item.name}
        </button>
      ))}
    </div>
  );

  return (
    <div className="max-w-6xl mx-auto py-6 px-4 space-y-6">
      {/* Header & Sort */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <h1 className="text-xl font-bold text-white">Browse Games</h1>

        <div className="flex items-center gap-2 bg-slate-900 border border-slate-800 rounded-xl px-3 py-1">
          <span className="text-xs text-slate-400">Sort by:</span>
          <select
            value={sort}
            onChange={(e) => {
              triggerHaptic('light');
              setSort(e.target.value);
            }}
            className="bg-transparent text-xs text-white font-bold focus:outline-none py-1.5 cursor-pointer appearance-none"
          >
            {SORT_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value} className="bg-slate-900">
                {opt.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Filter Rows */}
      <div className="space-y-3">
        <FilterRow items={PLATFORMS} selectedValue={platform} onSelect={setPlatform} />
        <FilterRow items={GENRES} selectedValue={genre} onSelect={setGenre} />
        <FilterRow items={DECADES} selectedValue={decade} onSelect={setDecade} />
      </div>

      {/* Results Grid */}
      <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 gap-3 pt-4">
        {games.map((game, index) => (
          <div key={`${game.id}-${index}`} className="relative group flex flex-col gap-1.5">
            <div className="flex flex-col gap-5">
            <div className="relative aspect-[3/4] bg-slate-900 border border-slate-800 rounded-xl overflow-hidden group">
              <Link href={`/game/${game.id}`} className="block w-full h-full">
                {game.coverUrl ? (
                  <img
                    src={game.coverUrl}
                    alt={game.name}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-200"
                    loading="lazy"
                  />
                ) : (
                  <div className="w-full h-full flex flex-col items-center justify-center text-slate-600">
                    🎮
                  </div>
                )}
              </Link>

              {/* Rating Badge */}
              {game.rating && (
                <div className="absolute top-1.5 right-1.5 bg-slate-950/80 backdrop-blur border border-emerald-500/30 text-emerald-400 text-[9px] font-extrabold px-1.5 py-0.5 rounded flex items-center gap-1 pointer-events-none">
                  ★ {game.rating}
                </div>
              )}
            </div>

            <Link href={`/game/${game.id}`} className="group-hover:text-purple-400 transition">
              <p className="text-[11px] font-bold text-slate-200 line-clamp-1 leading-tight">
                {game.name}
              </p>
              {game.releaseYear && (
                <p className="text-[9px] text-slate-500">{game.releaseYear}</p>
              )}
            </Link>
          </div>

              {/* Action Buttons */}
              <div className="pt-0.5">
                <GameCardActions
                  item={{
                    igdbId: game.id,
                    gameTitle: game.name,
                    coverUrl: game.coverUrl,
                  }}
                />
              </div>
            </div>
        ))}
      </div>

      {/* Empty State */}
      {!loading && games.length === 0 && (
        <div className="py-12 text-center text-slate-500 text-xs">
          No games found matching these exact filters. Try broadening your search.
        </div>
      )}

      {/* Load More Button */}
      {hasMore && games.length > 0 && (
        <div className="flex justify-center pt-8">
          <button
            type="button"
            onClick={() => {
              triggerHaptic('medium');
              fetchGames(false);
            }}
            disabled={loading}
            className="px-6 py-2.5 bg-slate-800 hover:bg-slate-700 disabled:opacity-50 text-slate-200 text-xs font-bold rounded-xl transition shadow-lg border border-slate-700"
          >
            {loading ? 'Loading...' : 'Load More Games'}
          </button>
        </div>
      )}
    </div>
  );
}

