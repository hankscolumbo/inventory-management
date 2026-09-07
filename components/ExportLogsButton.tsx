// components/ExportLogsButton.tsx
'use client';

export default function ExportLogsButton() {
  return (
    <a
      href="/api/export/logs"
      download
      className="inline-flex items-center gap-2 px-4 py-2 bg-slate-900 hover:bg-slate-800 border border-slate-800 hover:border-slate-700 text-slate-200 text-xs font-bold rounded-xl transition shadow-sm cursor-pointer"
    >
      <span>📥</span>
      <span>Export Logs (.CSV)</span>
    </a>
  );
}
