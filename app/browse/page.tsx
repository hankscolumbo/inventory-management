'use client';

import { useState, useEffect, Suspense } from 'react';
import Link from 'next/link';
import { useRouter, usePathname, useSearchParams } from 'next/navigation';
import { triggerHaptic } from '@/lib/haptics';
import GameCardActions from '@/components/GameCardActions';

const PAGE_SIZE_OPTIONS = [18, 24, 36, 48];

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

function BrowseContent() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  // 1. Read state directly from URL parameters
  const sort = searchParams.get('sort') || SORT_OPTIONS[0].value;
  const platform = searchParams.get('platform');
  const genre = searchParams.get('genre');
  const decade = searchParams.get('decade');
  const limit = searchParams.get('limit') || '24';

  // 2. Local state only for infinite scrolling / data holding
  const [games, setGames] = useState<BrowseGame[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);

  // 3. Helper to update URL when a filter changes
  const updateFilter = (key: string, value: string | null) => {
    triggerHaptic('light');
    const current = new URLSearchParams(Array.from(searchParams.entries()));

    if (value) {
      current.set(key, value);
    } else {
      current.delete(key);
    }

    // Push new URL (scroll: false prevents jumping to top of page unnecessarily)
    router.push(`${pathname}?${current.toString()}`, { scroll: false });
  };

  const fetchGames = async (resetPage = false) => {
    setLoading(true);
    const currentPage = resetPage ? 1 : page;

    // Use current URL searchParams but override pagination
    const params = new URLSearchParams(Array.from(searchParams.entries()));
    if (!params.has('sort')) params.set('sort', SORT_OPTIONS[0].value);
    if (!params.has('limit')) params.set('limit', '24');
    params.set('page', currentPage.toString());

    try {
      const res = await fetch(`/api/browse?${params.toString()}`);
      if (res.ok) {
        const data = await res.json();
        setGames((prev) => (resetPage ? data : [...prev, ...data]));
        setHasMore(data.length === Number(limit));
        setPage(currentPage + 1);
      }
    } catch (error) {
      console.error('Failed to fetch browse results:', error);
    } finally {
      setLoading(false);
    }
  };

  // 4. Re-fetch from page 1 whenever the URL search parameters change
  useEffect(() => {
    fetchGames(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams]);

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
        onClick={() => onSelect(null)}
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
          onClick={() => onSelect(item.id)}
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
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <h1 className="text-xl font-bold text-white">Browse Games</h1>

        <div className="flex flex-wrap items-center gap-3">
          {/* Sort Dropdown */}
          <div className="flex items-center gap-2 bg-slate-900 border border-slate-800 rounded-xl px-3 py-1">
            <span className="text-xs text-slate-400">Sort:</span>
            <select
              value={sort}
              onChange={(e) => updateFilter('sort', e.target.value)}
              className="bg-transparent text-xs text-white font-bold focus:outline-none py-1.5 cursor-pointer appearance-none"
            >
              {SORT_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value} className="bg-slate-900">
                  {opt.label}
                </option>
              ))}
            </select>
          </div>

          {/* Items Per Page Dropdown */}
          <div className="flex items-center gap-2 bg-slate-900 border border-slate-800 rounded-xl px-3 py-1">
            <span className="text-xs text-slate-400">Show:</span>
            <select
              value={limit}
              onChange={(e) => updateFilter('limit', e.target.value)}
              className="bg-transparent text-xs text-white font-bold focus:outline-none py-1.5 cursor-pointer appearance-none"
            >
              {PAGE_SIZE_OPTIONS.map((size) => (
                <option key={size} value={size} className="bg-slate-900">
                  {size} games
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Filter Rows */}
      <div className="space-y-3">
        <FilterRow items={PLATFORMS} selectedValue={platform} onSelect={(val) => updateFilter('platform', val)} />
        <FilterRow items={GENRES} selectedValue={genre} onSelect={(val) => updateFilter('genre', val)} />
        <FilterRow items={DECADES} selectedValue={decade} onSelect={(val) => updateFilter('decade', val)} />
      </div>

      {/* Results Grid */}
      <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 gap-3 pt-4">
        {games.map((game, index) => (
          <div key={`${game.id}-${index}`} className="relative group flex flex-col justify-between gap-1.5">
            <div className="flex flex-col gap-1.5">
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

            <div className="pt-0.5">
              <GameCardActions
                item={{
                  gameTitle: game.name,
                  coverUrl: game.coverUrl,
                  igdbId: game.id,
                }}
              />
            </div>
          </div>
        ))}
      </div>

      {!loading && games.length === 0 && (
        <div className="py-12 text-center text-slate-500 text-xs">
          No games found matching these exact filters. Try broadening your search.
        </div>
      )}

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

export default function BrowsePage() {
  return (
    <Suspense fallback={
      <div className="max-w-6xl mx-auto py-12 text-center text-slate-500 text-sm">
        Loading Browse...
      </div>
    }>
      <BrowseContent />
    </Suspense>
  );
}
