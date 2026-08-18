// components/SyncSteamButton.tsx
'use client';

import { useState, useTransition } from 'react';
import { syncSteamGames } from '@/app/actions/syncSteam';

export default function SyncSteamButton() {
  const [isPending, startTransition] = useTransition();
  const [feedback, setFeedback] = useState<string | null>(null);

  const handleSync = () => {
    setFeedback(null);
    startTransition(async () => {
      const res = await syncSteamGames();
      if (res.success) {
        setFeedback(`Synced ${res.count} games!`);
        setTimeout(() => setFeedback(null), 4000);
      } else {
        setFeedback(res.error || 'Sync failed.');
        setTimeout(() => setFeedback(null), 4000);
      }
    });
  };

  return (
    <div className="flex flex-col items-end gap-1">
      <button
        onClick={handleSync}
        disabled={isPending}
        className="flex items-center gap-2 bg-slate-800 hover:bg-slate-700 disabled:opacity-50 text-slate-200 font-bold text-xs px-3.5 py-2 rounded-lg border border-slate-700 transition shadow-sm"
      >
        <svg
          className={`w-3.5 h-3.5 text-purple-400 ${isPending ? 'animate-spin' : ''}`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
          />
        </svg>
        {isPending ? 'Syncing...' : 'Sync Steam'}
      </button>

      {feedback && (
        <span className="text-[11px] font-medium text-purple-400 animate-pulse">
          {feedback}
        </span>
      )}
    </div>
  );
}