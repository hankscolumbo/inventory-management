// app/settings/page.tsx
'use client';

import { useState, useTransition } from 'react';
import { syncSteamGames } from '@/app/actions/syncSteamPlayed';
import { saveSteamId } from '@/app/actions/saveSteamId';

export default function SettingsPage() {
  const [steamInput, setSteamInput] = useState('');
  const [message, setMessage] = useState<{ text: string; isError: boolean } | null>(null);
  const [isPending, startTransition] = useTransition();

  const handleSaveSteamId = () => {
    setMessage(null);
    startTransition(async () => {
      const res = await saveSteamId(steamInput);
      if (res.success) {
        setMessage({ text: `Steam ID linked successfully (${res.steamId})!`, isError: false });
        setSteamInput('');
      } else {
        setMessage({ text: res.error || 'Failed to save Steam ID.', isError: true });
      }
    });
  };

  const handleSyncGames = () => {
    setMessage(null);
    startTransition(async () => {
      const res = await syncSteamGames();
      if (res.success) {
        setMessage({ text: `Successfully synced ${res.count} games from your Steam library!`, isError: false });
      } else {
        setMessage({ text: res.error || 'Failed to sync Steam library.', isError: true });
      }
    });
  };

  return (
    <div className="max-w-2xl mx-auto px-4 py-8 space-y-6">
      <h1 className="text-2xl font-bold text-white">Account Settings</h1>

      {/* Steam Integration Card */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 space-y-4">
        <div>
          <h2 className="text-base font-bold text-white">Link Steam Account</h2>
          <p className="text-xs text-slate-400 mt-1">
            Enter your 17-digit Steam ID, custom vanity URL, or full profile link to sync your games and playtime.
          </p>
        </div>

        {message && (
          <div
            className={`p-3 text-xs rounded-lg ${
              message.isError
                ? 'bg-red-500/10 text-red-400 border border-red-500/20'
                : 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
            }`}
          >
            {message.text}
          </div>
        )}

        <div className="flex flex-col sm:flex-row gap-3">
          <input
            type="text"
            value={steamInput}
            onChange={(e) => setSteamInput(e.target.value)}
            placeholder="e.g. 76561198000000000 or customname"
            className="flex-1 bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-purple-500 transition"
          />
          <button
            onClick={handleSaveSteamId}
            disabled={isPending || !steamInput.trim()}
            className="bg-purple-600 hover:bg-purple-500 disabled:opacity-50 text-white font-bold text-xs px-4 py-2 rounded-lg transition shrink-0"
          >
            {isPending ? 'Saving...' : 'Link Steam'}
          </button>
        </div>

        <div className="border-t border-slate-800 pt-4 flex items-center justify-between">
          <span className="text-xs text-slate-400">
            Note: Your Steam <strong>Game Details</strong> must be set to <strong>Public</strong> in Steam privacy settings.
          </span>
          <button
            onClick={handleSyncGames}
            disabled={isPending}
            className="bg-slate-800 hover:bg-slate-700 disabled:opacity-50 text-slate-200 font-bold text-xs px-4 py-2 rounded-lg border border-slate-700 transition shrink-0"
          >
            {isPending ? 'Syncing...' : 'Sync Steam Library'}
          </button>
        </div>
      </div>
    </div>
  );
}