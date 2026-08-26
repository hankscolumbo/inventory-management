// components/ListProgressSummary.tsx
interface Props {
  playedCount: number;
  unplayedCount: number;
  totalCount: number;
  percentage: number;
}

export default function ListProgressSummary({
  playedCount,
  unplayedCount,
  totalCount,
  percentage,
}: Props) {
  return (
    <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 mb-8 space-y-4">
      <div className="flex items-center justify-between">
        <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
          Your Progress
        </span>
        <span className="text-sm font-extrabold text-purple-400">
          {percentage}% Complete
        </span>
      </div>

      {/* Dynamic Progress Bar */}
      <div className="w-full bg-slate-950 rounded-full h-3 border border-slate-800 overflow-hidden">
        <div
          className="bg-gradient-to-r from-purple-600 to-indigo-500 h-full transition-all duration-500 rounded-full"
          style={{ width: `${percentage}%` }}
        />
      </div>

      {/* Breakdown Metrics */}
      <div className="grid grid-cols-3 gap-3 text-center pt-1">
        <div className="bg-slate-950/60 p-3 rounded-xl border border-slate-800/80">
          <div className="text-lg font-bold text-emerald-400">{playedCount}</div>
          <div className="text-[10px] font-semibold text-slate-400 uppercase">Played</div>
        </div>

        <div className="bg-slate-950/60 p-3 rounded-xl border border-slate-800/80">
          <div className="text-lg font-bold text-slate-400">{unplayedCount}</div>
          <div className="text-[10px] font-semibold text-slate-400 uppercase">Unplayed</div>
        </div>

        <div className="bg-slate-950/60 p-3 rounded-xl border border-slate-800/80">
          <div className="text-lg font-bold text-white">{totalCount}</div>
          <div className="text-[10px] font-semibold text-slate-400 uppercase">Total</div>
        </div>
      </div>
    </div>
  );
}