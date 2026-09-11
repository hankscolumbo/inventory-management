'use client';

import { useState, useEffect, useRef, FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useDebounce } from '@/hooks/useDebounce';
import { getActiveUserLists } from '@/app/actions/getUserLists';
import { searchCommunity } from '@/app/actions/searchCommunity';
import LogGameButton from '@/components/LogGameButton';
import AddToListModal from '@/components/AddToListModal';

type SearchCategory = 'game' | 'list' | 'user';

interface CustomBadgeRule {
  terms: string[];
  message: string;
  badgeStyle?: string;
}

const CUSTOM_BADGE_RULES: CustomBadgeRule[] = [
  {
    terms: ['harry potter', 'hogwarts', 'quidditch'],
    message: '🏳️‍⚧️ PROTECT TRANS RIGHTS 🏳️‍⚧️',
    badgeStyle: 'text-cyan-300 bg-fuchsia-500/60 border border-white-500/40',
  },
  {
    terms: ['israel', 'palestine'],
    message: '🇵🇸 FREE PALESTINE 🇵🇸',
    badgeStyle: 'text-white bg-red-600/80 border border-green-500/40',
  },
];

function getAppendedBadges(title: string): CustomBadgeRule[] {
  const lowerTitle = title.toLowerCase();
  return CUSTOM_BADGE_RULES.filter((rule) =>
    rule.terms.some((term) => lowerTitle.includes(term.toLowerCase()))
  );
}

interface GameResult {
  id: number;
  name: string;
  coverUrl?: string | null;
  releaseYear?: number | null;
}

export default function UnifiedNavbarSearch() {
  const router = useRouter();
  const [category, setCategory] = useState<SearchCategory>('game');
  const [query, setQuery] = useState('');
  const [gameResults, setGameResults] = useState<GameResult[]>([]);
  const [communityResults, setCommunityResults] = useState<{ users: any[]; lists: any[] }>({
    users: [],
    lists: [],
  });
  const [loading, setLoading] = useState(false);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [isMobileModalOpen, setIsMobileModalOpen] = useState(false);
  const [userLists, setUserLists] = useState<{ id: string; title: string }[]>([]);

  const debouncedQuery = useDebounce(query, 300);
  const searchContainerRef = useRef<HTMLDivElement>(null);
  const desktopInputRef = useRef<HTMLInputElement>(null);
  const mobileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    getActiveUserLists().then((lists) => setUserLists(lists));
  }, []);

  // Fetch live autocomplete results for both mobile modal and desktop dropdown
  useEffect(() => {
    async function fetchResults() {
      const trimmed = debouncedQuery.trim();
      if (!trimmed || (category !== 'game' && trimmed.length < 2)) {
        setGameResults([]);
        setCommunityResults({ users: [], lists: [] });
        setIsDropdownOpen(false);
        return;
      }

      setLoading(true);
      setIsDropdownOpen(true);

      try {
        if (category === 'game') {
          const res = await fetch(`/api/search?q=${encodeURIComponent(trimmed)}&limit=5`);
          if (res.ok) {
            const data = await res.json();
            const results = Array.isArray(data.results)
              ? data.results
              : Array.isArray(data)
              ? data
              : [];
            setGameResults(results);
          } else {
            setGameResults([]);
          }
        } else {
          const commRes = await searchCommunity(trimmed);
          setCommunityResults({
            users: Array.isArray(commRes?.users) ? commRes.users : [],
            lists: Array.isArray(commRes?.lists) ? commRes.lists : [],
          });
        }
      } catch (err) {
        console.error('Search failed:', err);
      } finally {
        setLoading(false);
      }
    }

    fetchResults();
  }, [debouncedQuery, category]);

  // Handle outside clicks safely attached to root container ref
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        searchContainerRef.current &&
        !searchContainerRef.current.contains(event.target as Node)
      ) {
        setIsDropdownOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Prevent background scrolling and focus input when mobile modal opens
  useEffect(() => {
    if (isMobileModalOpen) {
      document.body.style.overflow = 'hidden';
      setTimeout(() => mobileInputRef.current?.focus(), 100);
    } else {
      document.body.style.overflow = 'unset';
    }
  }, [isMobileModalOpen]);

  const handleSearchSubmit = (e: FormEvent) => {
    e.preventDefault();
    const trimmed = query.trim();
    if (!trimmed) return;

    setIsDropdownOpen(false);
    setIsMobileModalOpen(false);
    desktopInputRef.current?.blur();
    mobileInputRef.current?.blur();

    if (category === 'game') {
      router.push(`/search?q=${encodeURIComponent(trimmed)}`);
    } else {
      router.push(`/search?q=${encodeURIComponent(trimmed)}&type=${category}`);
    }
  };

  return (
    <div ref={searchContainerRef} className="relative w-full">
      {/* 1. MOBILE TRIGGER (< sm) */}
      <button
        type="button"
        onClick={() => setIsMobileModalOpen(true)}
        className="sm:hidden flex items-center gap-2 w-full bg-slate-900 border border-slate-800/80 rounded-xl px-3 py-1.5 text-xs text-slate-400 hover:text-white transition cursor-pointer"
      >
        <svg className="w-3.5 h-3.5 text-slate-400 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
        </svg>
        <span className="truncate">
          {query.trim() ? query : 'Search games, lists, users...'}
        </span>
      </button>

      {/* 2. DESKTOP EXPANDABLE SEARCH BAR (>= sm) */}
      <div className="hidden sm:flex justify-center relative w-full">
        <form
          onSubmit={handleSearchSubmit}
          className="group relative flex items-center w-full max-w-[280px] focus-within:max-w-[480px] bg-slate-900/90 border border-slate-800 focus-within:border-purple-500/80 rounded-xl overflow-hidden shadow-md focus-within:shadow-xl focus-within:shadow-purple-500/10 transition-all duration-300 ease-in-out z-20"
        >
          {/* Category Selector */}
          <div className="relative border-r border-slate-800/80 bg-slate-950/50 hover:bg-slate-900 transition shrink-0">
            <select
              value={category}
              onChange={(e) => {
                setCategory(e.target.value as SearchCategory);
                if (query.trim()) setIsDropdownOpen(true);
              }}
              className="appearance-none bg-transparent text-slate-300 text-xs font-semibold pl-3 pr-6 py-1.5 focus:outline-none cursor-pointer"
            >
              <option value="game" className="bg-slate-900 text-slate-200">Games</option>
              <option value="list" className="bg-slate-900 text-slate-200">Lists</option>
              <option value="user" className="bg-slate-900 text-slate-200">Users</option>
            </select>
            <span className="absolute right-2 top-1/2 -translate-y-1/2 text-[9px] text-slate-500 pointer-events-none">▼</span>
          </div>

          <input
            ref={desktopInputRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onFocus={() => {
              if (query.trim()) setIsDropdownOpen(true);
            }}
            placeholder={`Search ${category}s...`}
            className="w-full bg-transparent px-3 py-1.5 text-xs text-white placeholder-slate-500 focus:outline-none"
          />

          <button
            type="submit"
            aria-label="Submit search"
            className="pr-3 text-slate-400 hover:text-purple-400 transition shrink-0 cursor-pointer"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          </button>
        </form>

        {/* Desktop Autocomplete Popover */}
        {isDropdownOpen && query.trim() && (
          <div className="absolute left-1/2 -translate-x-1/2 w-full max-w-[480px] top-full mt-2 bg-slate-900/95 border border-slate-800 rounded-2xl shadow-2xl backdrop-blur-xl overflow-hidden z-50 max-h-96 overflow-y-auto divide-y divide-slate-800/60">
            <SearchResultsList
              loading={loading}
              category={category}
              query={query}
              gameResults={gameResults}
              communityResults={communityResults}
              userLists={userLists}
              onSelect={() => setIsDropdownOpen(false)}
            />
          </div>
        )}
      </div>

      {/* 3. MOBILE FULL-SCREEN MODAL OVERLAY (< sm) WITH LIVE AUTOCOMPLETE */}
      {isMobileModalOpen && (
        <div className="fixed inset-0 z-50 h-[100dvh] bg-slate-950/98 backdrop-blur-2xl flex flex-col p-4 sm:hidden animate-in fade-in duration-150">
          <div className="flex items-center justify-between gap-3 mb-3 shrink-0">
            {/* Segmented Category Buttons */}
            <div className="flex-1 bg-slate-900 p-1 rounded-xl border border-slate-800 flex items-center text-xs font-semibold shadow-inner">
              {(['game', 'list', 'user'] as SearchCategory[]).map((cat) => (
                <button
                  key={cat}
                  type="button"
                  onClick={() => setCategory(cat)}
                  className={`flex-1 py-1.5 rounded-lg capitalize transition-all duration-150 cursor-pointer ${
                    category === cat
                      ? 'bg-purple-600 text-white font-bold shadow-md scale-[1.02]'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  {cat}s
                </button>
              ))}
            </div>

            <button
              type="button"
              onClick={() => setIsMobileModalOpen(false)}
              className="p-2 text-slate-400 hover:text-white font-bold text-sm cursor-pointer"
              aria-label="Close search"
            >
              ✕
            </button>
          </div>

          <form onSubmit={handleSearchSubmit} className="relative mb-3 shrink-0">
            <input
              ref={mobileInputRef}
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={`Search ${category}s...`}
              className="w-full bg-slate-900 border border-slate-800 rounded-xl pl-4 pr-10 py-3 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-purple-500 shadow-inner"
            />
            <button
              type="submit"
              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-purple-400 p-1 cursor-pointer"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </button>
          </form>

          {/* Live Mobile Autocomplete Results Area with min-h-0 flexbox fix */}
          <div className="flex-1 min-h-0 overflow-y-auto rounded-2xl bg-slate-900/90 border border-slate-800/80 divide-y divide-slate-800/60 shadow-lg">
            <SearchResultsList
              loading={loading}
              category={category}
              query={query}
              gameResults={gameResults}
              communityResults={communityResults}
              userLists={userLists}
              onSelect={() => setIsMobileModalOpen(false)}
            />
          </div>
        </div>
      )}
    </div>
  );
}

function SearchResultsList({
  loading,
  category,
  query,
  gameResults = [],
  communityResults = { users: [], lists: [] },
  userLists = [],
  onSelect,
}: any) {
  if (!query.trim()) {
    return (
      <div className="p-8 text-center text-xs text-slate-500">
        Type a name to search {category}s...
      </div>
    );
  }

  if (loading) {
    return (
      <div className="p-6 text-xs text-slate-400 text-center flex items-center justify-center gap-2">
        <div className="w-4 h-4 border-2 border-purple-500 border-t-transparent rounded-full animate-spin" />
        Searching {category}s...
      </div>
    );
  }

  if (category === 'game') {
    const games = Array.isArray(gameResults) ? gameResults : [];
    if (games.length === 0) {
      return <div className="p-6 text-xs text-slate-500 text-center">No game results for "{query}"</div>;
    }
    return (
      <div>
        {games.slice(0, 5).map((game: any) => {
          const matchedBadges = getAppendedBadges(game.name || '');
          return (
            <div key={game.id} className="flex items-center justify-between p-3 hover:bg-slate-800/60 transition group">
              <Link
                href={`/game/${game.id}`}
                onClick={onSelect}
                className="flex items-center gap-3 flex-1 min-w-0"
              >
                {game.coverUrl ? (
                  <img
                    src={game.coverUrl.startsWith('//') ? `https:${game.coverUrl}` : game.coverUrl}
                    alt={game.name}
                    className="w-10 h-14 object-cover rounded-lg border border-slate-700/80 shrink-0 shadow-md"
                  />
                ) : (
                  <div className="w-10 h-14 bg-slate-800 rounded-lg flex items-center justify-center text-[9px] text-slate-500 shrink-0">
                    No Cover
                  </div>
                )}

                <div className="flex-1 min-w-0">
                  <h4 className="text-xs font-semibold text-slate-200 group-hover:text-purple-400 truncate transition">
                    {game.name}
                  </h4>
                  <div className="flex items-center flex-wrap gap-1.5 text-[10px] text-slate-400 mt-0.5">
                    {game.releaseYear && <p className="text-slate-500">{game.releaseYear}</p>}
                    {matchedBadges.map((badge, idx) => (
                      <span
                        key={idx}
                        className={`inline-flex items-center font-bold text-[9px] px-1.5 py-0.5 rounded shadow-sm border ${
                          badge.badgeStyle || 'text-purple-300 bg-purple-950/50 border-purple-500/40'
                        }`}
                      >
                        {badge.message}
                      </span>
                    ))}
                  </div>
                </div>
              </Link>

              <div className="flex items-center gap-1.5 ml-3 shrink-0">
                {userLists.length > 0 && (
                  <AddToListModal
                    game={{ name: game.name, coverUrl: game.coverUrl, igdbId: game.id }}
                    userLists={userLists}
                    customTrigger={
                      <button type="button" title="Add to List" className="p-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg text-xs cursor-pointer">
                        📋
                      </button>
                    }
                  />
                )}
                <LogGameButton
                  game={{ id: game.id, name: game.name, coverUrl: game.coverUrl }}
                  customTrigger={
                    <button type="button" title="Log Game" className="p-1.5 bg-purple-600/20 hover:bg-purple-600/40 text-purple-300 rounded-lg text-xs cursor-pointer">
                      ➕
                    </button>
                  }
                />
              </div>
            </div>
          );
        })}
      </div>
    );
  }

  if (category === 'list') {
    const lists = Array.isArray(communityResults?.lists) ? communityResults.lists : [];
    if (lists.length === 0) {
      return <div className="p-6 text-xs text-slate-500 text-center">No list results for "{query}"</div>;
    }
    return (
      <div className="p-2 space-y-1">
        {lists.map((list: any) => (
          <Link
            key={list.id}
            href={`/list/${list.id}`}
            onClick={onSelect}
            className="block p-3 hover:bg-slate-800 rounded-xl transition"
          >
            <div className="text-xs font-semibold text-white truncate">{list.title}</div>
            <div className="text-[10px] text-slate-400 mt-0.5">by @{list.user?.username || list.user?.name || 'User'}</div>
          </Link>
        ))}
      </div>
    );
  }

  // Users Category
  const users = Array.isArray(communityResults?.users) ? communityResults.users : [];
  if (users.length === 0) {
    return <div className="p-6 text-xs text-slate-500 text-center">No user results for "{query}"</div>;
  }
  return (
    <div className="p-2 space-y-1">
      {users.map((user: any) => (
        <Link
          key={user.id}
          href={`/u/${user.username || user.id}`}
          onClick={onSelect}
          className="flex items-center gap-3 p-3 hover:bg-slate-800 rounded-xl transition"
        >
          <div className="w-7 h-7 rounded-full bg-purple-600 flex items-center justify-center text-xs font-bold text-white uppercase shrink-0">
            {user.username?.[0] || 'U'}
          </div>
          <span className="text-xs font-medium text-white truncate">@{user.username || user.name}</span>
        </Link>
      ))}
    </div>
  );
}

