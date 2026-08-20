// app/u/[username]/SteamSyncSection.tsx
'use client';

import { useState } from 'react';
import { syncSteamGames } from '@/app/actions/syncSteam';
import { syncSteamWishlist } from '@/app/actions/syncSteamWishlist';
import { syncSteamOwned } from '@/app/actions/syncSteamOwned';

interface SteamSyncSectionProps {
  steamId?: string | null;
  isOwner: boolean;
}

export default function SteamSyncSection({ steamId, isOwner }: SteamSyncSectionProps) {
  const [loadingAction, setLoadingAction] = useState<'played' | 'wishlist' | 'owned' | null>(null);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  if (!isOwner) return null; // Only show control panel to profile owner

  const handleSyncPlayed = async () => {
    setLoadingAction('played');
    setFeedback(null);
    const res = await syncSteamGames();
    setLoadingAction(null);

    if (res.success) {
      setFeedback({ type: 'success', message: `Synced ${res.count ?? 0} played games from Steam.` });
    } else {
      setFeedback({ type: 'error', message: res.error || 'Failed to sync played games.' });
    }
  };

  const handleSyncWishlist = async () => {
    setLoadingAction('wishlist');
    setFeedback(null);
    const res = await syncSteamWishlist();
    setLoadingAction(null);

    if (res.success) {
      setFeedback({ type: 'success', message: `Synced ${res.count ?? 0} wishlist games.` });
    } else {
      setFeedback({ type: 'error', message: res.error || 'Failed to sync wishlist.' });
    }
  };

  const handleSyncOwned = async () => {
    setLoadingAction('owned');
    setFeedback(null);
    const res = await syncSteamOwned();
    setLoadingAction(null);

    if (res.success) {
      setFeedback({ type: 'success', message: `Marked ${res.count ?? 0} existing logs as owned.` });
    } else {
      setFeedback({ type: 'error', message: res.error || 'Failed to sync owned status.' });
    }
  };

  const isBusy = loadingAction !== null;

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-4">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 border-b border-slate-800 pb-4">
        <div>
          <h2 className="text-lg font-bold text-white flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-cyan-400"></span>
            Steam Synchronization
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">
            {steamId ? `Linked Steam ID: ${steamId}` : 'No Steam account linked.'}
          </p>
        </div>

        {feedback && (
          <div
            className={`text-xs px-3 py-1.5 rounded-lg border font-medium ${
              feedback.type === 'success'
                ? 'bg-emerald-950/60 border-emerald-800 text-emerald-300'
                : 'bg-red-950/60 border-red-800 text-red-300'
            }`}
          >
            {feedback.message}
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Sync Played Games */}
        <div className="bg-slate-950/60 border border-slate-800/80 rounded-xl p-4 flex flex-col justify-between space-y-3">
          <div>
            <span className="text-xs font-bold text-purple-400 uppercase tracking-wider block">Option 1</span>
            <h3 className="text-sm font-bold text-white mt-1">Sync Played Games</h3>
            <p className="text-xs text-slate-400 mt-1">
              Imports played games with &gt;0 minutes playtime and sets status to <span className="text-slate-200">PLAYED</span>.
            </p>
          </div>
          <button
            onClick={handleSyncPlayed}
            disabled={isBusy || !steamId}
            className="w-full py-2 px-3 bg-purple-600 hover:bg-purple-500 disabled:bg-slate-800 text-white text-xs font-bold rounded-lg transition shadow disabled:cursor-not-allowed"
          >
            {loadingAction === 'played' ? 'Syncing...' : 'Sync Played Games'}
          </button>
        </div>

        {/* Sync Wishlist */}
        <div className="bg-slate-950/60 border border-slate-800/80 rounded-xl p-4 flex flex-col justify-between space-y-3">
          <div>
            <span className="text-xs font-bold text-pink-400 uppercase tracking-wider block">Option 2</span>
            <h3 className="text-sm font-bold text-white mt-1">Sync Wishlist</h3>
            <p className="text-xs text-slate-400 mt-1">
              Imports public Steam wishlist games and sets status to <span className="text-slate-200">WANT TO PLAY</span>.
            </p>
          </div>
          <button
            onClick={handleSyncWishlist}
            disabled={isBusy || !steamId}
            className="w-full py-2 px-3 bg-pink-600 hover:bg-pink-500 disabled:bg-slate-800 text-white text-xs font-bold rounded-lg transition shadow disabled:cursor-not-allowed"
          >
            {loadingAction === 'wishlist' ? 'Syncing...' : 'Sync Wishlist'}
          </button>
        </div>

        {/* Sync Owned Flag */}
        <div className="bg-slate-950/60 border border-slate-800/80 rounded-xl p-4 flex flex-col justify-between space-y-3">
          <div>
            <span className="text-xs font-bold text-emerald-400 uppercase tracking-wider block">Option 3</span>
            <h3 className="text-sm font-bold text-white mt-1">Flag Owned Games</h3>
            <p className="text-xs text-slate-400 mt-1">
              Marks <span className="text-slate-200">isOwned = true</span> on existing collection logs without adding new games.
            </p>
          </div>
          <button
            onClick={handleSyncOwned}
            disabled={isBusy || !steamId}
            className="w-full py-2 px-3 bg-emerald-600 hover:bg-emerald-500 disabled:bg-slate-800 text-white text-xs font-bold rounded-lg transition shadow disabled:cursor-not-allowed"
          >
            {loadingAction === 'owned' ? 'Syncing...' : 'Sync Owned Status'}
          </button>
        </div>
      </div>
    </div>
  );
}