'use client';

import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useRouter } from 'next/navigation';
import { getGameDlcs, DlcItem } from '@/app/actions/getGameDlcs';
import { toggleDlcLog } from '@/app/actions/toggleDlcLog';
import { triggerHaptic } from '@/lib/haptics';

interface ManageLogDlcsModalProps {
  gameLogId: string;
  parentIgdbId?: number | null;
  parentGameTitle: string;
  parentCoverUrl?: string | null;
  customTrigger?: React.ReactNode;
}

export default function ManageLogDlcsModal({
  gameLogId,
  parentIgdbId,
  parentGameTitle,
  parentCoverUrl,
  customTrigger,
}: ManageLogDlcsModalProps) {
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [dlcs, setDlcs] = useState<DlcItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [togglingIgdbId, setTogglingIgdbId] = useState<number | null>(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Fetch available expansions when modal opens
  useEffect(() => {
    if (isOpen) {
      setLoading(true);
      getGameDlcs(parentIgdbId, gameLogId, parentGameTitle)
        .then((data) => setDlcs(data))
        .catch((err) => console.error('Failed to load DLCs:', err))
        .finally(() => setLoading(false));
    }
  }, [isOpen, parentIgdbId, gameLogId, parentGameTitle]);

  const handleClose = () => {
    setIsOpen(false);
    router.refresh();
  };

  const handleToggle = async (dlc: DlcItem) => {
    triggerHaptic('light');
    setTogglingIgdbId(dlc.igdbId);

    // Optimistic toggle
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
      // Revert optimism if server call fails
      setDlcs((prev) =>
        prev.map((item) =>
          item.igdbId === dlc.igdbId ? { ...item, isLogged: dlc.isLogged } : item
        )
      );
    }

    setTogglingIgdbId(null);
  };

  const loggedCount = dlcs.filter((d) => d.isLogged).length;

  const modalContent = isOpen ? (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-md animate-in fade-in duration-150">
      <div className="bg-slate-900 border border-slate-800 w-full max-w-xl rounded-2xl p-5 sm:p-6 shadow-2xl flex flex-col max-h-[85vh]">
        {/* Modal Header */}
        <div className="flex items-center justify-between border-b border-slate-800 pb-3 mb-4 shrink-0">
          <div className="flex items-center gap-3">
            {parentCoverUrl && (
              <img
                src={parentCoverUrl}
                alt={parentGameTitle}
                className="w-8 h-10 object-cover rounded-md border border-slate-800 shrink-0"
              />
            )}
            <div>
              <h3 className="text-sm font-bold text-white truncate">
                Manage DLCs & Expansions
              </h3>
              <p className="text-xs text-slate-400 truncate">
                {parentGameTitle} {dlcs.length > 0 && `• (${loggedCount}/${dlcs.length} Logged)`}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={handleClose}
            className="p-1.5 text-slate-400 hover:text-white font-bold text-xs rounded-lg hover:bg-slate-800 transition cursor-pointer"
          >
            ✕
          </button>
        </div>

        {/* DLC List Area */}
        <div className="flex-1 overflow-y-auto pr-1 min-h-0 space-y-2">
          {loading ? (
            <div className="py-12 text-center text-xs text-slate-400 flex items-center justify-center gap-2">
              <div className="w-4 h-4 border-2 border-purple-500 border-t-transparent rounded-full animate-spin" />
              Fetching DLC list...
            </div>
          ) : dlcs.length === 0 ? (
            <div className="py-12 text-center text-xs text-slate-500">
              No official DLCs or expansions found for this game.
            </div>
          ) : (
            <div className="space-y-2">
              {dlcs.map((dlc) => {
                const isToggling = togglingIgdbId === dlc.igdbId;

                return (
                  <div
                    key={dlc.igdbId}
                    onClick={() => handleToggle(dlc)}
                    className={`flex items-center justify-between p-3 rounded-xl border transition cursor-pointer select-none ${
                      dlc.isLogged
                        ? 'bg-purple-950/30 border-purple-500/50 text-white'
                        : 'bg-slate-950/60 border-slate-800/80 text-slate-400 hover:border-slate-700 hover:text-slate-200'
                    }`}
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <input
                        type="checkbox"
                        checked={dlc.isLogged ?? false}
                        onChange={() => {}} // Handled by parent container click
                        className="w-4 h-4 accent-purple-600 rounded cursor-pointer shrink-0"
                      />

                      {dlc.coverUrl ? (
                        <img
                          src={dlc.coverUrl}
                          alt={dlc.name}
                          className="w-8 h-11 object-cover rounded-md border border-slate-800 shrink-0"
                        />
                      ) : (
                        <div className="w-8 h-11 bg-slate-900 border border-slate-800 rounded-md flex items-center justify-center text-xs shrink-0">
                          🧩
                        </div>
                      )}

                      <div className="min-w-0">
                        <p className="text-xs font-bold text-slate-200 truncate">
                          {dlc.name}
                        </p>
                        {dlc.releaseYear && (
                          <p className="text-[10px] text-slate-500 font-medium">
                            Released {dlc.releaseYear}
                          </p>
                        )}
                      </div>
                    </div>

                    <button
                      type="button"
                      disabled={isToggling}
                      className={`px-3 py-1 text-[11px] font-semibold rounded-lg border transition shrink-0 ml-2 ${
                        dlc.isLogged
                          ? 'bg-emerald-950/80 border-emerald-500/40 text-emerald-300'
                          : 'bg-slate-900 border-slate-700 text-slate-300 hover:border-purple-500'
                      }`}
                    >
                      {isToggling ? 'Updating...' : dlc.isLogged ? '✓ Logged' : '+ Add DLC'}
                    </button>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="border-t border-slate-800 pt-3 mt-4 flex justify-end shrink-0">
          <button
            type="button"
            onClick={handleClose}
            className="px-5 py-2 bg-purple-600 hover:bg-purple-500 text-white font-bold text-xs rounded-xl shadow transition cursor-pointer"
          >
            Done
          </button>
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
          className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-300 font-semibold text-[11px] rounded-lg shadow-sm transition flex items-center gap-1 cursor-pointer"
        >
          <span>🧩</span>
          <span>Add DLC</span>
        </button>
      )}

      {mounted && modalContent && createPortal(modalContent, document.body)}
    </>
  );
}

