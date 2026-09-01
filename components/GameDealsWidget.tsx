// components/GameDealsWidget.tsx
'use client';

import { useState, useEffect } from 'react';
import { getGameDeals, DealItem } from '@/app/actions/getGameDeals';

interface GameDealsWidgetProps {
  title: string;
  steamAppId?: number | null;
}

export default function GameDealsWidget({ title, steamAppId }: GameDealsWidgetProps) {
  const [deals, setDeals] = useState<DealItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchDeals() {
      setLoading(true);
      const data = await getGameDeals(title, steamAppId);
      setDeals(data);
      setLoading(false);
    }
    fetchDeals();
  }, [title, steamAppId]);

  if (loading) {
    return (
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 animate-pulse space-y-3">
        <div className="h-4 bg-slate-800 rounded w-1/3" />
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
          <div className="h-12 bg-slate-950 rounded-xl" />
          <div className="h-12 bg-slate-950 rounded-xl" />
        </div>
      </div>
    );
  }

  if (deals.length === 0) {
    return (
      <div className="bg-slate-950 border border-slate-800/80 rounded-xl p-6 text-center space-y-1">
        <p className="text-xs font-bold text-slate-300">No active store deals found</p>
        <p className="text-[11px] text-slate-500">
          There are currently no tracked sales or store listings on CheapShark for "{title}".
        </p>
      </div>
    );
  }

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 sm:p-5 space-y-3 shadow-xl">
      <div className="flex items-center justify-between border-b border-slate-800 pb-2.5">
        <div className="flex items-center gap-2">
          <span className="text-emerald-400 text-sm">🏷️</span>
          <h3 className="text-sm font-extrabold text-white tracking-wide">Active Deals & Stores</h3>
        </div>
        <span className="text-[10px] font-mono text-slate-500 uppercase">via CheapShark</span>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
        {deals.map((deal) => (
          <a
            key={deal.dealID}
            href={deal.dealUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="bg-slate-950 border border-slate-800 hover:border-emerald-500/50 p-3 rounded-xl transition flex items-center justify-between group shadow-sm"
          >
            <div className="flex items-center gap-2.5 min-w-0">
              {deal.storeIcon ? (
                <img
                  src={deal.storeIcon}
                  alt={deal.storeName}
                  className="w-5 h-5 object-contain shrink-0"
                />
              ) : (
                <div className="w-5 h-5 bg-slate-800 rounded shrink-0" />
              )}
              <span className="text-xs font-bold text-slate-200 group-hover:text-emerald-300 transition truncate">
                {deal.storeName}
              </span>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              {deal.savings > 0 && (
                <span className="px-1.5 py-0.5 bg-emerald-950 text-emerald-400 border border-emerald-500/30 text-[10px] font-mono font-bold rounded">
                  -{deal.savings}%
                </span>
              )}
              <div className="text-right">
                <span className="text-xs font-black text-white block">${deal.salePrice}</span>
                {deal.savings > 0 && (
                  <span className="text-[10px] text-slate-500 line-through block">
                    ${deal.normalPrice}
                  </span>
                )}
              </div>
            </div>
          </a>
        ))}
      </div>
    </div>
  );
}
