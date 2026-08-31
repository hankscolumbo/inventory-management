// components/MergeModal.tsx
'use client';

import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useRouter } from 'next/navigation';
import { getUserGameLogs, SimpleGameLog } from '@/app/actions/getUserGameLogs';
import { mergeGameLogs } from '@/app/actions/mergeGameLogs';

interface MergeModalProps {
  currentLog: {
    id: string;
    gameTitle: string;
    coverUrl?: string | null;
  };
  onClose: () => void;
}

export default function MergeModal({ currentLog, onClose }: MergeModalProps) {
  const router = useRouter();
  const [mounted, setMounted] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [availableLogs, setAvailableLogs] = useState<SimpleGameLog[]>([]);
  const [selectedLog, setSelectedLog] = useState<SimpleGameLog | null>(null);
  const [primaryTarget, setPrimaryTarget] = useState<'current' | 'selected'>('current');
  const [loadingLogs, setLoadingLogs] = useState(false);
  const [isMerging, setIsMerging] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    setMounted(true);
    fetchLogs('');
  }, []);

  const fetchLogs = async (query: string) => {
    setLoadingLogs(true);
    const results = await getUserGameLogs(query, currentLog.id);
    setAvailableLogs(results);
    setLoadingLogs(false);
  };

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const q = e.target.value;
    setSearchQuery(q);
    fetchLogs(q);
  };

  const handleConfirmMerge = async () => {
    if (!selectedLog) return;

    const primaryId = primaryTarget === 'current' ? currentLog.id : selectedLog.id;
    const secondaryId = primaryTarget === 'current' ? selectedLog.id : currentLog.id;

    setIsMerging(true);
    setErrorMsg(null);

    const res = await mergeGameLogs(primaryId, secondaryId);
    setIsMerging(false);

    if (res.success) {
      router.refresh();
      onClose();
    } else {
      setErrorMsg(res.error || 'Failed to merge game logs.');
    }
  };

  const modalContent = (
    <div className="fixed inset-0 z-[9999] bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 w-full max-w-lg space-y-5 shadow-2xl max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex justify-between items-center border-b border-slate-800 pb-3">
          <div>
            <h2 className="text-base font-bold text-white">Merge Game Log</h2>
            <p className="text-xs text-slate-400">Combine playtime, status, and IDs into one entry.</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-slate-400 hover:text-white text-sm font-bold p-1"
          >
            ✕
          </button>
        </div>

        {errorMsg && (
          <div className="p-3 bg-red-950/60 border border-red-800 rounded-lg text-xs text-red-300 font-medium">
            {errorMsg}
          </div>
        )}

        {/* Current Log Display */}
        <div className="bg-slate-950 border border-slate-800 rounded-xl p-3 flex items-center gap-3">
          {currentLog.coverUrl ? (
            <img src={currentLog.coverUrl} alt={currentLog.gameTitle} className="w-10 h-14 object-cover rounded" />
          ) : (
            <div className="w-10 h-14 bg-slate-900 rounded flex items-center justify-center text-[10px] text-slate-500">
              No Cover
            </div>
          )}
          <div>
            <span className="text-[10px] font-semibold uppercase text-purple-400 tracking-wider">Source Log</span>
            <h4 className="text-sm font-bold text-white truncate">{currentLog.gameTitle}</h4>
          </div>
        </div>

        {/* Search Existing Logs */}
        <div className="space-y-2">
          <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider block">
            Select Log to Merge With
          </label>
          <input
            type="text"
            value={searchQuery}
            onChange={handleSearchChange}
            placeholder="Search your logged games..."
            className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-purple-500"
          />

          <div className="max-h-48 overflow-y-auto space-y-1.5 border border-slate-800/80 rounded-xl p-2 bg-slate-950/50">
            {loadingLogs ? (
              <p className="text-xs text-slate-500 text-center py-4">Loading logged games...</p>
            ) : availableLogs.length === 0 ? (
              <p className="text-xs text-slate-500 text-center py-4">No matching logged games found.</p>
            ) : (
              availableLogs.map((log) => {
                const isSelected = selectedLog?.id === log.id;
                return (
                  <button
                    key={log.id}
                    type="button"
                    onClick={() => setSelectedLog(log)}
                    className={`w-full text-left p-2 rounded-lg flex items-center justify-between transition border ${
                      isSelected
                        ? 'bg-purple-950/40 border-purple-500 text-white'
                        : 'bg-slate-900/60 border-slate-800/80 hover:border-slate-700 text-slate-300'
                    }`}
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      {log.coverUrl ? (
                        <img src={log.coverUrl} alt={log.gameTitle} className="w-7 h-10 object-cover rounded shrink-0" />
                      ) : (
                        <div className="w-7 h-10 bg-slate-800 rounded shrink-0" />
                      )}
                      <div className="min-w-0">
                        <p className="text-xs font-semibold truncate">{log.gameTitle}</p>
                        <p className="text-[10px] text-slate-400">
                          {log.status} • {log.playtimeHours ?? 0} hrs
                        </p>
                      </div>
                    </div>
                    {isSelected && <span className="text-purple-400 font-bold text-xs">✓</span>}
                  </button>
                );
              })
            )}
          </div>
        </div>

        {/* Primary Log Preference Selector */}
        {selectedLog && (
          <div className="space-y-2 bg-slate-950 p-3 rounded-xl border border-slate-800">
            <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider block">
              Which entry should be kept as the primary log?
            </label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setPrimaryTarget('current')}
                className={`p-2 rounded-lg text-xs font-medium border text-left truncate ${
                  primaryTarget === 'current'
                    ? 'bg-purple-600/20 border-purple-500 text-purple-300'
                    : 'bg-slate-900 border-slate-800 text-slate-400'
                }`}
              >
                Keep "{currentLog.gameTitle}"
              </button>
              <button
                type="button"
                onClick={() => setPrimaryTarget('selected')}
                className={`p-2 rounded-lg text-xs font-medium border text-left truncate ${
                  primaryTarget === 'selected'
                    ? 'bg-purple-600/20 border-purple-500 text-purple-300'
                    : 'bg-slate-900 border-slate-800 text-slate-400'
                }`}
              >
                Keep "{selectedLog.gameTitle}"
              </button>
            </div>
          </div>
        )}

        {/* Actions */}
        <div className="flex justify-end gap-2 pt-2 border-t border-slate-800/80">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-xs text-slate-400 hover:text-white transition"
          >
            Cancel
          </button>
          <button
            type="button"
            disabled={!selectedLog || isMerging}
            onClick={handleConfirmMerge}
            className="px-5 py-2 bg-purple-600 hover:bg-purple-500 disabled:opacity-50 text-white font-medium text-xs rounded-lg transition"
          >
            {isMerging ? 'Merging...' : 'Confirm Merge'}
          </button>
        </div>
      </div>
    </div>
  );

  return mounted ? createPortal(modalContent, document.body) : null;
}