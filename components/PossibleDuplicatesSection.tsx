// app/u/[username]/PossibleDuplicatesSection.tsx
'use client';

import { useState } from 'react';
import { GameLog } from '@prisma/client';
import { findPossibleDuplicates, DuplicatePair } from '@/lib/duplicateDetector';
import { mergeGameLogs } from '@/app/actions/mergeGameLogs';

interface PossibleDuplicatesSectionProps {
  userGames: GameLog[];
  isOwner: boolean;
}

export default function PossibleDuplicatesSection({ userGames, isOwner }: PossibleDuplicatesSectionProps) {
  const [pairs, setPairs] = useState<DuplicatePair[]>(() => findPossibleDuplicates(userGames));
  const [mergingId, setMergingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  if (!isOwner || pairs.length === 0) return null;

  const handleMergePair = async (pair: DuplicatePair) => {
    setMergingId(pair.id);
    setError(null);

    // Determine primary record automatically (prefer record with IGDB ID, cover art, or higher playtime)
    const primary =
      pair.gameA.igdbId || pair.gameA.coverUrl || (pair.gameA.playtimeHours ?? 0) >= (pair.gameB.playtimeHours ?? 0)
        ? pair.gameA
        : pair.gameB;

    const secondary = primary.id === pair.gameA.id ? pair.gameB : pair.gameA;

    const res = await mergeGameLogs(primary.id, secondary.id);
    setMergingId(null);

    if (res.success) {
      // Remove pair and any referencing entries from UI state immediately
      setPairs((prev) =>
        prev.filter((p) => p.id !== pair.id && p.gameA.id !== secondary.id && p.gameB.id !== secondary.id)
      );
    } else {
      setError(res.error || 'Failed to merge entries.');
    }
  };

  const handleDismissPair = (pairId: string) => {
    setPairs((prev) => prev.filter((p) => p.id !== pairId));
  };

  return (
    <div className="bg-slate-900 border border-amber-500/30 rounded-2xl p-6 shadow-xl space-y-4">
      <div className="flex items-center justify-between border-b border-slate-800 pb-3">
        <div>
          <h2 className="text-lg font-bold text-white flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-amber-400 animate-pulse"></span>
            Possible Duplicates ({pairs.length})
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">
            Matching titles detected across your accounts. Merge them to combine playtime, platforms, and metadata.
          </p>
        </div>
      </div>

      {error && (
        <div className="text-xs p-3 rounded-lg bg-red-950/60 border border-red-800 text-red-300">
          {error}
        </div>
      )}

      <div className="grid grid-cols-1 gap-4">
        {pairs.map((pair) => {
          const isBusy = mergingId === pair.id;

          return (
            <div
              key={pair.id}
              className="bg-slate-950/80 border border-slate-800 rounded-xl p-4 flex flex-col md:flex-row items-center justify-between gap-4"
            >
              <div className="flex-1 grid grid-cols-1 sm:grid-cols-2 gap-3 w-full">
                {/* Game A Summary */}
                <div className="flex items-center gap-3 bg-slate-900/60 p-3 rounded-lg border border-slate-800">
                  {pair.gameA.coverUrl ? (
                    <img
                      src={pair.gameA.coverUrl}
                      alt={pair.gameA.gameTitle}
                      className="w-10 h-14 object-cover rounded shadow"
                    />
                  ) : (
                    <div className="w-10 h-14 bg-slate-800 rounded flex items-center justify-center text-[9px] text-slate-500">
                      No Art
                    </div>
                  )}
                  <div className="min-w-0 flex-1">
                    <h4 className="text-xs font-bold text-white truncate">{pair.gameA.gameTitle}</h4>
                    <div className="flex items-center gap-2 mt-1">
                      <span className="text-[10px] px-1.5 py-0.5 rounded bg-purple-950 text-purple-300 border border-purple-800 font-mono">
                        {pair.gameA.platforms.join(', ') || 'N/A'}
                      </span>
                      <span className="text-[10px] text-slate-400">{pair.gameA.playtimeHours ?? 0} hrs</span>
                    </div>
                  </div>
                </div>

                {/* Game B Summary */}
                <div className="flex items-center gap-3 bg-slate-900/60 p-3 rounded-lg border border-slate-800">
                  {pair.gameB.coverUrl ? (
                    <img
                      src={pair.gameB.coverUrl}
                      alt={pair.gameB.gameTitle}
                      className="w-10 h-14 object-cover rounded shadow"
                    />
                  ) : (
                    <div className="w-10 h-14 bg-slate-800 rounded flex items-center justify-center text-[9px] text-slate-500">
                      No Art
                    </div>
                  )}
                  <div className="min-w-0 flex-1">
                    <h4 className="text-xs font-bold text-white truncate">{pair.gameB.gameTitle}</h4>
                    <div className="flex items-center gap-2 mt-1">
                      <span className="text-[10px] px-1.5 py-0.5 rounded bg-cyan-950 text-cyan-300 border border-cyan-800 font-mono">
                        {pair.gameB.platforms.join(', ') || 'N/A'}
                      </span>
                      <span className="text-[10px] text-slate-400">{pair.gameB.playtimeHours ?? 0} hrs</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Single Merge Action */}
              <div className="flex items-center gap-2 w-full md:w-auto justify-end">
                <button
                  type="button"
                  onClick={() => handleDismissPair(pair.id)}
                  className="px-3 py-2 text-xs text-slate-400 hover:text-slate-200 font-semibold transition"
                >
                  Ignore
                </button>
                <button
                  onClick={() => handleMergePair(pair)}
                  disabled={isBusy}
                  className="px-4 py-2 bg-purple-600 hover:bg-purple-500 disabled:bg-slate-800 text-white text-xs font-bold rounded-lg transition shadow flex items-center gap-2 whitespace-nowrap"
                >
                  {isBusy ? 'Merging...' : 'Merge Records'}
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
