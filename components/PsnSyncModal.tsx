// components/PsnSyncModal.tsx
'use client';

import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useRouter } from 'next/navigation';
import { syncPsnAccount } from '@/app/actions/syncPsn';

interface PsnSyncModalProps {
  psnNpsso?: string | null;
  psnOnlineId?: string | null;
  isOwner: boolean;
}

export default function PsnSyncModal({ psnNpsso, psnOnlineId, isOwner }: PsnSyncModalProps) {
  if (!isOwner) return null;

  const [isOpen, setIsOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [npsso, setNpsso] = useState(psnNpsso || '');
  const [loading, setLoading] = useState(false);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  const router = useRouter();

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (psnNpsso) setNpsso(psnNpsso);
  }, [psnNpsso]);

  const handleSync = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setFeedback(null);

    const res = await syncPsnAccount(npsso);
    setLoading(false);

    if (res.success) {
      setFeedback({
        type: 'success',
        message: `Successfully synced ${res.count} PlayStation games!`,
      });
      setTimeout(() => {
        setIsOpen(false);
        setFeedback(null);
        router.refresh();
      }, 1500);
    } else {
      setFeedback({
        type: 'error',
        message: res.error || 'Failed to sync PlayStation account.',
      });
    }
  };

  const modalContent = isOpen ? (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-150">
      <div className="bg-slate-900 border border-slate-800 w-full max-w-md rounded-2xl p-6 shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
          <div className="flex items-center gap-2">
            <span className="text-blue-500 font-bold text-base">🎮</span>
            <h3 className="text-base font-extrabold text-white">Sync PlayStation Network</h3>
          </div>
          <button
            type="button"
            onClick={() => setIsOpen(false)}
            className="text-slate-400 hover:text-white font-bold text-sm p-1"
          >
            ✕
          </button>
        </div>

        {/* Step-by-Step NPSSO Retrieval Guide */}
        <div className="bg-slate-950/80 border border-slate-800 p-3.5 rounded-xl text-xs space-y-2">
          <span className="font-bold text-blue-400 block uppercase tracking-wider text-[10px]">
            How to get your NPSSO Code:
          </span>
          <ol className="list-decimal list-inside text-slate-300 space-y-1 leading-relaxed">
            <li>Log into your account at <a href="https://www.playstation.com/" target="_blank" rel="noreferrer" className="text-blue-400 underline">playstation.com</a></li>
            <li>In the same browser, visit <a href="https://ca.account.sony.com/api/v1/ssocookie" target="_blank" rel="noreferrer" className="text-blue-400 underline truncate inline-block max-w-[200px] align-bottom">ca.account.sony.com/api/v1/ssocookie</a></li>
            <li>Copy the 64-character <code className="bg-slate-900 px-1 py-0.5 rounded text-purple-300">npsso</code> value from the response.</li>
          </ol>
        </div>

        {feedback && (
          <div
            className={`p-3 rounded-xl border text-xs font-semibold ${
              feedback.type === 'success'
                ? 'bg-emerald-950/60 border-emerald-800 text-emerald-300'
                : 'bg-red-950/60 border-red-800 text-red-300'
            }`}
          >
            {feedback.message}
          </div>
        )}

        <form onSubmit={handleSync} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1.5">
              NPSSO Token
            </label>
            <input
              type="password"
              value={npsso}
              onChange={(e) => setNpsso(e.target.value)}
              placeholder="Paste 64-character NPSSO token..."
              required
              className="w-full bg-slate-950 border border-slate-800 text-white text-xs px-3 py-2.5 rounded-xl focus:outline-none focus:border-blue-500 font-mono"
            />
          </div>

          <div className="flex items-center justify-end gap-3 pt-2 border-t border-slate-800/80">
            <button
              type="button"
              onClick={() => setIsOpen(false)}
              className="px-4 py-2 text-xs font-semibold text-slate-400 hover:text-white transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading || !npsso.trim()}
              className="px-5 py-2 bg-blue-600 hover:bg-blue-500 disabled:bg-slate-800 text-white font-bold text-xs rounded-xl shadow-md transition"
            >
              {loading ? 'Syncing PSN...' : 'Sync Games'}
            </button>
          </div>
        </form>
      </div>
    </div>
  ) : null;

  return (
    <>
      <button
        type="button"
        onClick={() => setIsOpen(true)}
        className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 border border-slate-700 text-blue-400 font-bold text-xs rounded-xl transition flex items-center gap-1.5 shadow"
      >
        <span>🎮</span>
        {psnOnlineId ? `PSN: @${psnOnlineId}` : 'Sync PSN'}
      </button>

      {mounted && modalContent && createPortal(modalContent, document.body)}
    </>
  );
}