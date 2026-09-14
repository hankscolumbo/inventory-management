// components/DlcSelectorSection.tsx
'use client';

import { useState, useEffect } from 'react';
import { getGameDlcs, DlcItem } from '@/app/actions/getGameDlcs';

interface DlcSelectorSectionProps {
  igdbId?: number | null;
  gameTitle: string;
  logId?: string;
  onSelectionChange: (selected: DlcItem[]) => void;
}

export default function DlcSelectorSection({
  igdbId,
  gameTitle,
  logId,
  onSelectionChange,
}: DlcSelectorSectionProps) {
  const [availableDlcs, setAvailableDlcs] = useState<DlcItem[]>([]);
  const [selectedMap, setSelectedMap] = useState<Map<number, DlcItem>>(new Map());
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!igdbId && !gameTitle) return;

    setLoading(true);
    getGameDlcs(igdbId, logId, gameTitle)
      .then((dlcs) => {
        setAvailableDlcs(dlcs);
        const initialSelected = new Map<number, DlcItem>();
        dlcs.forEach((d) => {
          if (d.isLogged) initialSelected.set(d.igdbId, d);
        });
        setSelectedMap(initialSelected);
        onSelectionChange(Array.from(initialSelected.values()));
      })
      .finally(() => setLoading(false));
  }, [igdbId, gameTitle, logId]);

  const toggleDlc = (dlc: DlcItem) => {
    const next = new Map(selectedMap);
    if (next.has(dlc.igdbId)) {
      next.delete(dlc.igdbId);
    } else {
      next.set(dlc.igdbId, dlc);
    }
    setSelectedMap(next);
    onSelectionChange(Array.from(next.values()));
  };

  if (loading) {
    return (
      <div className="py-2 text-xs text-slate-500 flex items-center gap-2">
        <div className="w-3 h-3 border-2 border-purple-500 border-t-transparent rounded-full animate-spin" />
        Checking available expansions...
      </div>
    );
  }

  if (availableDlcs.length === 0) return null;

  return (
    <div className="space-y-2 border-t border-slate-800/80 pt-3 mt-3">
      <label className="block text-xs font-semibold text-slate-300">
        Attach Expansions / DLCs <span className="text-slate-500">(Optional)</span>
      </label>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-40 overflow-y-auto pr-1">
        {availableDlcs.map((dlc) => {
          const isSelected = selectedMap.has(dlc.igdbId);

          return (
            <div
              key={dlc.igdbId}
              onClick={() => toggleDlc(dlc)}
              className={`flex items-center gap-2.5 p-2 rounded-xl border transition cursor-pointer select-none ${
                isSelected
                  ? 'bg-purple-950/40 border-purple-500/60 text-white'
                  : 'bg-slate-950/60 border-slate-800 text-slate-400 hover:border-slate-700 hover:text-slate-200'
              }`}
            >
              <input
                type="checkbox"
                checked={isSelected}
                onChange={() => {}} // Controlled via parent div click
                className="w-3.5 h-3.5 accent-purple-600 rounded cursor-pointer"
              />

              {dlc.coverUrl ? (
                <img
                  src={dlc.coverUrl}
                  alt={dlc.name}
                  className="w-6 h-8 object-cover rounded border border-slate-800 shrink-0"
                />
              ) : (
                <div className="w-6 h-8 bg-slate-800 rounded flex items-center justify-center text-[8px] text-slate-500 shrink-0">
                  🧩
                </div>
              )}

              <div className="flex-1 min-w-0">
                <p className="text-[11px] font-semibold truncate leading-tight">{dlc.name}</p>
                {dlc.releaseYear && (
                  <p className="text-[9px] text-slate-500">{dlc.releaseYear}</p>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

