'use client';

import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { setPriceAlert } from '@/app/actions/managePriceAlerts';

interface PriceAlertModalProps {
  gameTitle: string;
  steamAppId?: number | null;
  igdbId?: number | null;
  onClose: () => void;
}

export default function PriceAlertModal({
  gameTitle,
  steamAppId,
  igdbId,
  onClose,
}: PriceAlertModalProps) {
  const [mounted, setMounted] = useState(false);
  const [targetPrice, setTargetPrice] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const priceNum = parseFloat(targetPrice);
    if (isNaN(priceNum) || priceNum <= 0) {
      setError('Please enter a valid target price.');
      return;
    }

    setLoading(true);

    const res = await setPriceAlert({
      gameTitle,
      targetPrice: priceNum,
      steamAppId,
      igdbId,
    });

    setLoading(false);

    if (res.success) {
      setSuccess(true);
      setTimeout(() => {
        onClose();
      }, 1200);
    } else {
      setError(res.error || 'Failed to set price alert.');
    }
  };

  if (!mounted) return null;

  return createPortal(
    <div className="fixed inset-0 z-[10000] bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-md p-6 shadow-2xl space-y-4">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
          <div className="flex items-center gap-2">
            <span className="text-base">🔔</span>
            <h3 className="text-sm font-extrabold text-white">Set Price Alert</h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-slate-400 hover:text-white font-bold text-xs"
          >
            ✕
          </button>
        </div>

        <p className="text-xs text-slate-300">
          We will notify you when <strong className="text-white">{gameTitle}</strong> drops
          below your target price.
        </p>

        {error && (
          <div className="p-2.5 bg-rose-950/80 border border-rose-500/40 text-rose-300 text-xs rounded-xl font-medium">
            {error}
          </div>
        )}

        {success ? (
          <div className="p-3 bg-emerald-950/80 border border-emerald-500/40 text-emerald-300 text-xs font-bold rounded-xl text-center">
            ✓ Alert set successfully!
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
                Target Price ($ USD)
              </label>
              <div className="relative">
                <span className="absolute left-3 top-2.5 text-xs text-slate-500 font-bold">$</span>
                <input
                  type="number"
                  step="0.01"
                  min="0.01"
                  placeholder="19.99"
                  value={targetPrice}
                  onChange={(e) => setTargetPrice(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-7 pr-3 py-2 text-xs text-white focus:outline-none focus:border-emerald-500 font-mono"
                  required
                  autoFocus
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-slate-800">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-xs rounded-xl transition"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={loading}
                className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs rounded-xl shadow-lg transition disabled:opacity-50"
              >
                {loading ? 'Saving...' : 'Set Alert'}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>,
    document.body
  );
}