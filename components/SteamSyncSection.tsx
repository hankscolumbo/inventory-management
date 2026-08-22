// app/u/[username]/SteamSyncSection.tsx
'use client';

import { useState } from 'react';
import { syncSteamGames } from '@/app/actions/syncSteam';
import { syncSteamWishlist } from '@/app/actions/syncSteamWishlist';
import { syncSteamOwned } from '@/app/actions/syncSteamOwned';
import { updateSteamId } from '@/app/actions/updateSteamId';

interface SteamSyncSectionProps {
  steamId?: string | null;
  isOwner: boolean;
}

export default function SteamSyncSection({ steamId, isOwner }: SteamSyncSectionProps) {
  const [currentSteamId, setCurrentSteamId] = useState<string>(steamId || '');
  const [inputSteamId, setInputSteamId] = useState<string>(steamId || '');
  const [isEditing, setIsEditing] = useState<boolean>(!steamId);
  const [savingId, setSavingId] = useState<boolean>(false);

  const [loadingAction, setLoadingAction] = useState<'played' | 'wishlist' | 'owned' | null>(null);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  if (!isOwner) return null;

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

  const isBusy = loadingAction !== null || savingId;

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-4">
      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 border-b border-slate-800 pb-4">
        <div>
          <h2 className="text-lg font-bold text-white flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-cyan-400"></span>
            Steam Synchronization
          </h2>
          {!isEditing && (
            <div className="flex items-center gap-2 mt-0.5">
              <p className="text-xs text-slate-400">
                {currentSteamId ? `Linked Steam ID: ${currentSteamId}` : 'No Steam account linked.'}
              </p>
              <button
                type="button"
                onClick={() => setIsEditing(true)}
                className="text-[11px] font-semibold text-purple-400 hover:text-purple-300 underline"
              >
                {currentSteamId ? 'Edit ID' : 'Link Account'}
              </button>
            </div>
          )}
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

      {/* Steam ID Form */}
      {isEditing && (
        <form
          onSubmit={async (e) => {
            e.preventDefault();
            setSavingId(true);
            setFeedback(null);

            const res = await updateSteamId(inputSteamId);
            setSavingId(false);

            if (res.success && res.steamId) {
              setCurrentSteamId(res.steamId);
              setIsEditing(false);
              setFeedback({ type: 'success', message: 'Steam ID saved successfully!' });
            } else {
              setFeedback({ type: 'error', message: res.error || 'Failed to save Steam ID.' });
            }
          }}
          className="bg-slate-950/80 border border-slate-800 rounded-xl p-4 space-y-2"
        >
          <label className="text-xs font-semibold text-slate-300 block">
            SteamID64 (17-digit ID)
          </label>
          <div className="flex items-center gap-2">
            <input
              type="text"
              value={inputSteamId}
              onChange={(e) => setInputSteamId(e.target.value)}
              placeholder="e.g. 76561198000000000"
              className="bg-slate-900 border border-slate-700 text-white text-xs px-3 py-2 rounded-lg focus:outline-none focus:border-purple-500 flex-1 font-mono"
            />
            <button
              type="submit"
              disabled={savingId || !inputSteamId.trim()}
              className="px-4 py-2 bg-purple-600 hover:bg-purple-500 disabled:bg-slate-800 text-white font-bold text-xs rounded-lg transition"
            >
              {savingId ? 'Saving...' : 'Save Steam ID'}
            </button>
            {currentSteamId && (
              <button
                type="button"
                onClick={() => {
                  setInputSteamId(currentSteamId);
                  setIsEditing(false);
                }}
                className="px-3 py-2 text-xs text-slate-400 hover:text-white font-semibold"
              >
                Cancel
              </button>
            )}
          </div>
          <p className="text-[10px] text-slate-400">
            Find your 17-digit Steam ID at{' '}
            <a
              href="https://steamid.io"
              target="_blank"
              rel="noreferrer"
              className="text-purple-400 underline hover:text-purple-300"
            >
              steamid.io
            </a>
            . Make sure your Steam Profile & Game Details privacy are set to <strong>Public</strong>.
          </p>
        </form>
      )}

      {/* Sync Options Grid */}
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
            disabled={isBusy || !currentSteamId}
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
            disabled={isBusy || !currentSteamId}
            className="w-full py-2 px-3 bg-pink-600 hover:bg-pink-500 disabled:bg-slate-800 text-white text-xs font-bold rounded-lg transition shadow disabled:cursor-not-allowed"
          >
            {loadingAction === 'wishlist' ? 'Syncing...' : 'Sync Wishlist'}
          </button>
        </div>

        {/* Sync Owned Flag 
        <div className="bg-slate-950/60 border border-slate-800/80 rounded-xl p-4 flex flex-col justify-between space-y-3">
          <div>
            <span className="text-xs font-bold text-emerald-400 uppercase tracking-wider block">Option 3</span>
            <h3 className="text-sm font-bold text-white mt-1">Flag Owned Games</h3>
            <p className="text-xs text-slate-400 mt-1">
              Check Steam library and marks <span className="text-slate-200">isOwned = true</span> on existing collection logs without adding new games.
            </p>
          </div>
          <button
            onClick={handleSyncOwned}
            disabled={isBusy || !currentSteamId}
            className="w-full py-2 px-3 bg-emerald-600 hover:bg-emerald-500 disabled:bg-slate-800 text-white text-xs font-bold rounded-lg transition shadow disabled:cursor-not-allowed"
          >
            {loadingAction === 'owned' ? 'Syncing...' : 'Sync Owned Status'}
          </button>
        </div>
        */}
      </div>
    </div>
  );
}
