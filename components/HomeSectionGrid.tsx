// components/HomeSectionGrid.tsx
'use client';

import { useState } from 'react';
import Link from 'next/link';
import GameCardActions from '@/components/GameCardActions';

export interface GridItem {
  id?: string;
  igdbId?: number | null;
  steamAppId?: number | null;
  gameTitle: string;
  coverUrl?: string | null;
  badgeText?: string;
  badgeStyle?: string;
  user?: {
    username?: string | null;
    name?: string | null;
    image?: string | null;
  };
}

interface HomeSectionGridProps {
  title: string;
  subtitle?: string;
  accentColor?: string;
  items: GridItem[];
  itemsPerPage?: number;
  userLists?: { id: string; title: string }[];
  isLoggedIn?: boolean;
}

function getHref(item: GridItem) {
  if (item.igdbId) return `/game/${item.igdbId}`;
  if (item.steamAppId) return `/game/${item.steamAppId}?source=steam`;
  return '#';
}

export default function HomeSectionGrid({
  title,
  subtitle,
  accentColor = 'border-purple-500/40',
  items,
  itemsPerPage = 6,
  userLists = [],
  isLoggedIn = false,
}: HomeSectionGridProps) {
  const [page, setPage] = useState(1);
  const [showAll, setShowAll] = useState(false);

  const totalPages = Math.ceil(items.length / itemsPerPage);
  const visibleItems = showAll
    ? items
    : items.slice((page - 1) * itemsPerPage, page * itemsPerPage);

  if (items.length === 0) return null;

  return (
    <section className="space-y-4">
      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-slate-800 pb-3 gap-2">
        <div>
          <h2 className="text-lg font-extrabold text-white tracking-wide">{title}</h2>
          {subtitle && <p className="text-xs text-slate-400 font-mono mt-0.5">{subtitle}</p>}
        </div>

        <div className="flex items-center gap-2 self-end sm:self-auto">
          {items.length > itemsPerPage && (
            <button
              onClick={() => {
                setShowAll((prev) => !prev);
                setPage(1);
              }}
              className="px-2.5 py-1 bg-slate-900 hover:bg-slate-800 border border-slate-800 text-xs font-bold text-slate-300 rounded-lg transition"
            >
              {showAll ? 'Show Pages' : `View All (${items.length})`}
            </button>
          )}

          {!showAll && totalPages > 1 && (
            <div className="flex items-center gap-1 bg-slate-950 p-1 rounded-lg border border-slate-800">
              <button
                disabled={page === 1}
                onClick={() => setPage((p) => p - 1)}
                className="px-2 py-0.5 text-xs text-slate-400 hover:text-white disabled:opacity-30 disabled:hover:text-slate-400 font-bold"
              >
                ‹
              </button>
              <span className="text-[10px] font-mono text-slate-400 px-1">
                {page}/{totalPages}
              </span>
              <button
                disabled={page === totalPages}
                onClick={() => setPage((p) => p + 1)}
                className="px-2 py-0.5 text-xs text-slate-400 hover:text-white disabled:opacity-30 disabled:hover:text-slate-400 font-bold"
              >
                ›
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Grid Display */}
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
        {visibleItems.map((item, idx) => {
          const href = getHref(item);

          return (
            <div
              key={item.id || item.igdbId || `${item.gameTitle}-${idx}`}
              className={`bg-slate-900 border border-slate-800 rounded-xl overflow-hidden hover:${accentColor} hover:scale-[1.02] transition duration-200 flex flex-col justify-between group shadow-lg`}
            >
              <Link href={href} className="p-2 space-y-2 flex-1 flex flex-col">
                <div className="aspect-[3/4] relative bg-slate-950 rounded-lg overflow-hidden">
                  {item.coverUrl ? (
                    <img
                      src={item.coverUrl}
                      alt={item.gameTitle}
                      className="w-full h-full object-cover group-hover:scale-105 transition duration-300"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-[10px] text-slate-500 p-2 text-center font-medium">
                      {item.gameTitle}
                    </div>
                  )}

                  {item.badgeText && (
                    <span
                      className={`absolute top-1.5 right-1.5 text-[9px] font-mono font-bold px-1.5 py-0.5 rounded shadow ${
                        item.badgeStyle || 'bg-purple-950/90 text-purple-300 border border-purple-500/40'
                      }`}
                    >
                      {item.badgeText}
                    </span>
                  )}
                </div>

                <div className="pt-1 flex-1">
                  <h3 className="text-xs font-bold text-slate-100 group-hover:text-purple-300 line-clamp-1 transition">
                    {item.gameTitle}
                  </h3>
                </div>

                {item.user?.username && (
                  <div className="flex items-center gap-1.5 pt-1 border-t border-slate-800/80">
                    <div className="w-4 h-4 rounded-full bg-slate-800 overflow-hidden shrink-0">
                      {item.user.image ? (
                        <img src={item.user.image} alt="" className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full bg-purple-600" />
                      )}
                    </div>
                    <span className="text-[10px] font-medium text-slate-400 truncate">
                      @{item.user.username}
                    </span>
                  </div>
                )}
              </Link>

              {/* 🔽 Render actions only for logged-in users */}
              {isLoggedIn && (
                <div className="p-1.5 border-t border-slate-800/80 bg-slate-950/90 z-20">
                  <GameCardActions
                    item={{
                      id: item.id,
                      gameTitle: item.gameTitle,
                      coverUrl: item.coverUrl,
                      igdbId: item.igdbId,
                      steamAppId: item.steamAppId,
                    }}
                    userLists={userLists}
                  />
                </div>
              )}
            </div>
          );
        })}
      </div>
    </section>
  );
}