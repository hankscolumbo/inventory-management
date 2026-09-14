'use client';

import ManageLogDlcsModal from '@/components/ManageLogDlcsModal';

export interface LoggedDlc {
  id: string;
  igdbId: number;
  name: string;
  coverUrl?: string | null;
  releaseYear?: number | null;
}

interface LoggedDlcsDisplayProps {
  gameLogId: string;
  parentIgdbId?: number | null;
  parentGameTitle: string;
  parentCoverUrl?: string | null;
  dlcs?: LoggedDlc[];
  isOwner?: boolean;
}

export default function LoggedDlcsDisplay({
  gameLogId,
  parentIgdbId,
  parentGameTitle,
  parentCoverUrl,
  dlcs = [],
  isOwner = false,
}: LoggedDlcsDisplayProps) {
  const hasDlcs = dlcs.length > 0;

  return (
    <div className="bg-slate-900/60 border border-slate-800/80 rounded-2xl p-4 sm:p-5 space-y-3.5 backdrop-blur-sm">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-base">🧩</span>
          <h4 className="text-xs font-bold text-slate-200 uppercase tracking-wider">
            Logged DLC & Expansions {hasDlcs && `(${dlcs.length})`}
          </h4>
        </div>

        {/* Edit / Add Button Trigger */}
        {isOwner && (
          <ManageLogDlcsModal
            gameLogId={gameLogId}
            parentIgdbId={parentIgdbId}
            parentGameTitle={parentGameTitle}
            parentCoverUrl={parentCoverUrl}
            customTrigger={
              <button
                type="button"
                className="text-[11px] font-bold text-purple-400 hover:text-purple-300 hover:underline transition cursor-pointer"
              >
                {hasDlcs ? '⚙ Manage DLCs' : '+ Add DLC'}
              </button>
            }
          />
        )}
      </div>

      {/* Grid Display of Logged DLCs */}
      {hasDlcs ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2.5">
          {dlcs.map((dlc) => (
            <div
              key={dlc.id || dlc.igdbId}
              className="group relative bg-slate-950/80 border border-emerald-500/30 rounded-xl p-2 flex items-center gap-2.5 shadow-sm hover:border-emerald-500/60 transition"
            >
              {/* Mini Cover */}
              {dlc.coverUrl ? (
                <img
                  src={dlc.coverUrl}
                  alt={dlc.name}
                  className="w-8 h-11 object-cover rounded-md border border-slate-800 shrink-0"
                />
              ) : (
                <div className="w-8 h-11 bg-slate-900 border border-slate-800 rounded-md flex items-center justify-center text-xs shrink-0 text-slate-600">
                  🧩
                </div>
              )}

              {/* Title & Badge */}
              <div className="min-w-0 flex-1">
                <p className="text-[11px] font-bold text-slate-200 truncate leading-snug">
                  {dlc.name}
                </p>
                <div className="flex items-center gap-1.5 mt-0.5">
                  <span className="text-[9px] font-extrabold text-emerald-400 bg-emerald-950/80 border border-emerald-500/40 px-1 py-0.2 rounded">
                    ✓ LOGGED
                  </span>
                  {dlc.releaseYear && (
                    <span className="text-[9px] text-slate-500 font-semibold">
                      {dlc.releaseYear}
                    </span>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        /* Empty State */
        <div className="py-4 text-center border border-dashed border-slate-800 rounded-xl bg-slate-950/40">
          <p className="text-xs text-slate-500">No expansions logged for this entry yet.</p>
          {isOwner && (
            <ManageLogDlcsModal
              gameLogId={gameLogId}
              parentIgdbId={parentIgdbId}
              parentGameTitle={parentGameTitle}
              parentCoverUrl={parentCoverUrl}
              customTrigger={
                <button
                  type="button"
                  className="mt-2 text-xs font-bold text-purple-400 hover:text-purple-300 transition cursor-pointer"
                >
                  + Add DLC / Expansions
                </button>
              }
            />
          )}
        </div>
      )}
    </div>
  );
}