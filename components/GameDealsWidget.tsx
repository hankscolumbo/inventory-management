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
    async function loadDeals() {
      setLoading(true);
      const res = await getGameDeals(title, steamAppId);
      setDeals(res);
      setLoading(false);
    }
    loadDeals();
  }, [title, steamAppId]);

  if (loading) {
    return (
      <div className="py-8 text-center text-xs font-medium text-slate-400 animate-pulse">
        Fetching live store prices...
      </div>
    );
  }

  if (deals.length === 0) {
    return (
      <div className="py-8 text-center text-xs font-medium text-slate-500 bg-slate-950/50 rounded-xl border border-slate-800">
        No active store discounts found for this game right now.
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {deals.map((deal) => {
        const hasSavings = parseFloat(deal.savings) > 0;

        return (
          <a
            key={deal.dealID || deal.dealId}
            href={deal.dealUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center justify-between p-3 bg-slate-950 border border-slate-800 hover:border-purple-500/50 rounded-xl transition group"
          >
            <div className="flex items-center gap-3">
              {/* Store Icon */}
              <img
                src={deal.storeIcon}
                alt={deal.storeName}
                className="w-5 h-5 object-contain rounded shrink-0"
                onError={(e) => {
                  // Fallback icon on image error
                  (e.target as HTMLImageElement).src =
                    'https://www.cheapshark.com/img/stores/icons/0.png';
                }}
              />
              <span className="text-xs font-bold text-slate-200 group-hover:text-purple-300 transition">
                {deal.storeName}
              </span>
            </div>

            <div className="flex items-center gap-2">
              {hasSavings && (
                <span className="text-[10px] font-black text-emerald-400 bg-emerald-950/80 px-2 py-0.5 rounded border border-emerald-500/30 font-mono">
                  -{deal.savings}%
                </span>
              )}

              <div className="text-right">
                <div className="text-xs font-extrabold text-white font-mono">
                  ${parseFloat(deal.salePrice).toFixed(2)}
                </div>
                {hasSavings && (
                  <div className="text-[10px] text-slate-500 line-through font-mono">
                    ${parseFloat(deal.normalPrice).toFixed(2)}
                  </div>
                )}
              </div>

              <span className="text-xs text-slate-500 group-hover:text-purple-400 transition ml-1">
                ↗
              </span>
            </div>
          </a>
        );
      })}
    </div>
  );
}

