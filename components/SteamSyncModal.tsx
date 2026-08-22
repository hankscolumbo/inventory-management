// components/SteamSyncModal.tsx
'use client';

import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { syncSteamGames } from '@/app/actions/syncSteam';
import { syncSteamWishlist } from '@/app/actions/syncSteamWishlist';
import { updateSteamId } from '@/app/actions/updateSteamId';

interface SteamSyncModalProps {
  steamId?: string | null;
  isOwner: boolean;
}

export default function SteamSyncModal({ steamId, isOwner }: SteamSyncModalProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [mounted, setMounted] = useState(false);

  const [currentSteamId, setCurrentSteamId] = useState<string>(steamId || '');
  const [inputSteamId, setInputSteamId] = useState<string>(steamId || '');
  const [isEditing, setIsEditing] = useState<boolean>(!steamId);
  const [savingId, setSavingId] = useState<boolean>(false);

  const [loadingAction, setLoadingAction] = useState<'played' | 'wishlist' | null>(null);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  useEffect(() => {
    setMounted(true);
  }, []);

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

  const isBusy = loadingAction !== null || savingId;

  const modalContent = isOpen ? (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-in fade-in duration-150">
      <div className="bg-slate-900 border border-slate-800 w-full max-w-2xl rounded-2xl p-6 shadow-2xl space-y-5 relative max-h-[90vh] overflow-y-auto">
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

          <button
            type="button"
            onClick={() => setIsOpen(false)}
            className="text-slate-400 hover:text-white font-bold p-1"
          >
            ✕
          </button>
        </div>

        {/* Feedback Alert */}
        {feedback && (
          <div
            className={`text-xs px-3 py-2 rounded-lg border font-medium ${
              feedback.type === 'success'
                ? 'bg-emerald-950/60 border-emerald-800 text-emerald-300'
                : 'bg-red-950/60 border-red-800 text-red-300'
            }`}
          >
            {feedback.message}
          </div>
        )}

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
              . Ensure profile & game details are set to <strong>Public</strong>.
            </p>
          </form>
        )}

        {/* Sync Options Grid (Played & Wishlist Only) */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
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
              type="button"
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
              type="button"
              onClick={handleSyncWishlist}
              disabled={isBusy || !currentSteamId}
              className="w-full py-2 px-3 bg-pink-600 hover:bg-pink-500 disabled:bg-slate-800 text-white text-xs font-bold rounded-lg transition shadow disabled:cursor-not-allowed"
            >
              {loadingAction === 'wishlist' ? 'Syncing...' : 'Sync Wishlist'}
            </button>
          </div>
        </div>
      </div>
    </div>
  ) : null;

  return (
    <>
      <button
        type="button"
        onClick={() => setIsOpen(true)}
        className="px-4 py-2 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-bold text-xs rounded-xl shadow-md transition flex items-center gap-2"
      >
        <span>🔄</span> Steam Sync
      </button>

      {mounted && modalContent && createPortal(modalContent, document.body)}
    </>
  );
}