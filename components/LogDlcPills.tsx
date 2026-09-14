'use client';

export interface DlcItemInput {
  id?: string;
  igdbId?: number;
  name: string;
}

interface LogDlcPillsProps {
  dlcs?: DlcItemInput[] | string[] | string | null;
  variant?: 'pills' | 'badge';
}

export default function LogDlcPills({ dlcs, variant = 'pills' }: LogDlcPillsProps) {
  if (!dlcs) return null;

  // Safely normalize input into a uniform array of objects
  let items: DlcItemInput[] = [];

  if (Array.isArray(dlcs)) {
    items = dlcs.map((item, index) =>
      typeof item === 'string'
        ? { id: `dlc-${index}`, name: item }
        : item
    );
  } else if (typeof dlcs === 'string') {
    try {
      const parsed = JSON.parse(dlcs);
      if (Array.isArray(parsed)) {
        items = parsed.map((item, index) =>
          typeof item === 'string'
            ? { id: `dlc-${index}`, name: item }
            : item
        );
      } else {
        items = [{ id: 'dlc-0', name: dlcs }];
      }
    } catch {
      items = [{ id: 'dlc-0', name: dlcs }];
    }
  }

  if (items.length === 0) return null;

  if (variant === 'badge') {
    return (
      <span className="inline-flex items-center gap-1 bg-purple-950/80 border border-purple-500/40 text-purple-300 text-[10px] font-extrabold px-2 py-0.5 rounded-md shadow-sm">
        <span>🧩</span>
        <span>+{items.length} {items.length === 1 ? 'DLC' : 'DLCs'}</span>
      </span>
    );
  }

  return (
    <div className="flex flex-wrap items-center gap-1.5 mt-1.5">
      {items.map((item, idx) => (
        <span
          key={item.id || item.igdbId || idx}
          className="inline-flex items-center gap-1 bg-purple-950/60 border border-purple-500/40 text-purple-300 text-[10px] font-semibold px-2 py-0.5 rounded-full backdrop-blur-sm"
        >
          <span className="text-[9px]">🧩</span>
          <span className="truncate max-w-[140px]">{item.name}</span>
        </span>
      ))}
    </div>
  );
}

