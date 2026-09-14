'use client';

import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { getGameDlcs, DlcItem } from '@/app/actions/getGameDlcs';
import { toggleDlcLog } from '@/app/actions/toggleDlcLog';
import { triggerHaptic } from '@/lib/haptics';

interface DLCGridModalProps {
  parentIgdbId?: number | null;
  parentGameTitle: string;
  parentCoverUrl?: string | null;
  gameLogId?: string;
  customTrigger?: React.ReactNode;
}

export default function DLCGridModal({
  parentIgdbId,
  parentGameTitle,
  parentCoverUrl,
  gameLogId,
  customTrigger,
}: DLCGridModalProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [dlcs, setDlcs] = useState<DlcItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [togglingIgdbId, setTogglingIgdbId] = useState<number | null>(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (isOpen) {
      setLoading(true);
      getGameDlcs(parentIgdbId, gameLogId, parentGameTitle)
        .then((data) => setDlcs(data))
        .catch((err) => console.error('Error fetching DLCs:', err))
        .finally(() => setLoading(false));
    }
  }, [isOpen, parentIgdbId, gameLogId, parentGameTitle]);

  const handleToggle = async (dlc: DlcItem) => {
    if (!gameLogId) return;

    triggerHaptic('light');
    setTogglingIgdbId(dlc.igdbId);

    setDlcs((prev) =>
      prev.map((item) =>
        item.igdbId === dlc.igdbId ? { ...item, isLogged: !item.isLogged } : item
      )
    );

    const res = await toggleDlcLog({
      gameLogId,
      parentIgdbId: parentIgdbId || dlc.igdbId,
      parentGameTitle,
      parentCoverUrl,
      dlc: {
        igdbId: dlc.igdbId,
        name: dlc.name,
        coverUrl: dlc.coverUrl,
        releaseYear: dlc.releaseYear,
      },
    });

    if (!res.success) {
      setDlcs((prev) =>
        prev.map((item) =>
          item.igdbId === dlc.igdbId ? { ...item, isLogged: dlc.isLogged } : item
        )
      );
    }

    setTogglingIgdbId(null);
  };

  const modalContent = isOpen ? (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-in fade-in duration-150">
      <div className="bg-slate-900 border border-slate-800 w-full max-w-3xl rounded-2xl p-5 sm:p-6 shadow-2xl flex flex-col max-h-[85vh]">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-800 pb-3 mb-4 shrink-0">
          <div>
            <h3 className="text-base font-extrabold text-white truncate">
              DLC & Expansions
            </h3>
            <p className="text-xs text-slate-400 truncate mt-0.5">
              {parentGameTitle}
            </p>
          </div>
          <button
            type="button"
            onClick={() => setIsOpen(false)}
            className="p-1.5 text-slate-400 hover:text-white font-bold text-sm rounded-lg hover:bg-slate-800 transition cursor-pointer"
          >
            ✕
          </button>
        </div>

        {/* Content Area */}
        <div className="flex-1 overflow-y-auto pr-1 min-h-0">
          {loading ? (
            <div className="py-16 text-center text-xs text-slate-400 flex items-center justify-center gap-2">
              <div className="w-4 h-4 border-2 border-purple-500 border-t-transparent rounded-full animate-spin" />
              Loading DLCs...
            </div>
          ) : dlcs.length === 0 ? (
            <div className="py-16 text-center text-xs text-slate-500">
              No DLC or expansion content found for this game.
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3.5">
              {dlcs.map((dlc) => {
                const isToggling = togglingIgdbId === dlc.igdbId;

                return (
                  <div
                    key={dlc.igdbId}
                    onClick={() => gameLogId && handleToggle(dlc)}
                    className={`group relative bg-slate-950 border rounded-xl overflow-hidden flex flex-col justify-between p-2 transition-all duration-200 ${
                      gameLogId ? 'cursor-pointer hover:border-purple-500/80' : ''
                    } ${
                      dlc.isLogged
                        ? 'border-emerald-500/60 bg-emerald-950/20 shadow-lg shadow-emerald-500/5'
                        : 'border-slate-800'
                    }`}
                  >
                    <div className="relative aspect-[3/4] bg-slate-900 rounded-lg overflow-hidden mb-2">
                      {dlc.coverUrl ? (
                        <img
                          src={dlc.coverUrl}
                          alt={dlc.name}
                          className={`w-full h-full object-cover transition-transform duration-200 ${
                            gameLogId ? 'group-hover:scale-105' : ''
                          }`}
                          loading="lazy"
                        />
                      ) : (
                        <div className="w-full h-full flex flex-col items-center justify-center text-slate-600 text-xs">
                          🧩 No Cover
                        </div>
                      )}

                      {dlc.isLogged && (
                        <div className="absolute top-1.5 left-1.5 bg-emerald-950/90 border border-emerald-500/50 text-emerald-400 text-[9px] font-extrabold px-1.5 py-0.5 rounded backdrop-blur shadow">
                          ✓ LOGGED
                        </div>
                      )}

                      {isToggling && (
                        <div className="absolute inset-0 bg-slate-950/60 backdrop-blur-sm flex items-center justify-center">
                          <div className="w-4 h-4 border-2 border-purple-400 border-t-transparent rounded-full animate-spin" />
                        </div>
                      )}
                    </div>

                    <div className="flex flex-col gap-0.5">
                      <h4 className="text-[11px] font-bold text-slate-200 line-clamp-2 leading-snug">
                        {dlc.name}
                      </h4>
                      {dlc.releaseYear && (
                        <span className="text-[9px] text-slate-500 font-semibold">
                          {dlc.releaseYear}
                        </span>
                      )}
                    </div>

                    {gameLogId && (
                      <button
                        type="button"
                        disabled={isToggling}
                        onClick={(e) => {
                          e.stopPropagation();
                          handleToggle(dlc);
                        }}
                        className={`mt-2 w-full py-1 text-[10px] font-bold rounded-lg border transition cursor-pointer ${
                          dlc.isLogged
                            ? 'bg-emerald-950/80 border-emerald-500/40 text-emerald-300 hover:bg-emerald-900/80'
                            : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-white hover:border-purple-500/50'
                        }`}
                      >
                        {dlc.isLogged ? 'Completed' : '+ Mark as Logged'}
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  ) : null;

  return (
    <>
      {customTrigger ? (
        <div
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            setIsOpen(true);
          }}
          className="inline-block cursor-pointer"
        >
          {customTrigger}
        </div>
      ) : (
        <button
          type="button"
          onClick={() => setIsOpen(true)}
          className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200 font-semibold text-xs rounded-xl shadow transition flex items-center gap-1.5 cursor-pointer"
        >
          <span>🧩</span> View DLC
        </button>
      )}

      {mounted && modalContent && createPortal(modalContent, document.body)}
    </>
  );
}

