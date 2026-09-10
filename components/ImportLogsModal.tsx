// components/ImportLogsModal.tsx
'use client';

import { useState, useTransition, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { importGameLogs, RawCsvLogRow } from '@/app/actions/importLogs';

function parseCsvLine(line: string): string[] {
  const result: string[] = [];
  let current = '';
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    if (char === '"') {
      inQuotes = !inQuotes;
    } else if (char === ',' && !inQuotes) {
      result.push(current.trim().replace(/^"(.*)"$/, '$1'));
      current = '';
    } else {
      current += char;
    }
  }
  result.push(current.trim().replace(/^"(.*)"$/, '$1'));
  return result;
}

function parseCsvText(text: string): Record<string, string>[] {
  const lines = text.split(/\r\n|\n/).filter((line) => line.trim().length > 0);
  const headerLine = lines[0];

  if (lines.length < 2 || !headerLine) return [];

  const headers = parseCsvLine(headerLine).map((h) => h.toLowerCase());
  const rows: Record<string, string>[] = [];

  for (let i = 1; i < lines.length; i++) {
    const currentLine = lines[i];
    if (!currentLine) continue;

    const values = parseCsvLine(currentLine);
    const row: Record<string, string> = {};

    headers.forEach((header, idx) => {
      row[header] = values[idx] ?? '';
    });
    rows.push(row);
  }
  return rows;
}

export default function ImportLogsModal() {
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [parsedPreview, setParsedPreview] = useState<RawCsvLogRow[]>([]);
  const [isPending, startTransition] = useTransition();
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  
  // New state for automatic background sync
  const [syncProgress, setSyncProgress] = useState<{ total: number; remaining: number } | null>(null);
  
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (!selectedFile) return;

    setFile(selectedFile);
    setMessage(null);

    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      if (!content) return;

      const rawRows = parseCsvText(content);
      const mappedRows: RawCsvLogRow[] = rawRows.map((r) => ({
        title: r['game title'] || r['title'] || r['game'] || r['name'] || '',
        status: r['status'] || r['log status'] || r['list'] || '',
        rating: r['rating'] || r['score'] || r['stars'] || '',
        playtime: r['playtime hours'] || r['playtime'] || r['hours'] || '',
        review: r['review'] || r['notes'] || r['comment'] || '',
      }));

      setParsedPreview(mappedRows.filter((r) => r.title));
    };
    reader.readAsText(selectedFile);
  };

  // The automatic sync loop
  const runAutoSync = async (initialCount: number) => {
    let currentRemaining = initialCount;
    setSyncProgress({ total: initialCount, remaining: currentRemaining });

    try {
      while (currentRemaining > 0) {
        const res = await fetch('/api/sync-imported-logs', { method: 'POST' });
        
        if (!res.ok) {
          console.error('Sync failed or rate limited, pausing...');
          break;
        }

        const data = await res.json();
        currentRemaining = data.remaining;
        
        setSyncProgress((prev) => prev ? { ...prev, remaining: currentRemaining } : null);
        router.refresh(); // Refresh the page so covers appear in real-time

        if (currentRemaining === 0) break;
      }
    } catch (err) {
      console.error('Auto-sync interrupted:', err);
    } finally {
      setSyncProgress(null);
      setMessage({ type: 'success', text: 'Import and cover sync complete!' });
      
      // Auto-close modal after 2 seconds
      setTimeout(() => {
        setIsOpen(false);
        setMessage(null);
      }, 2000);
    }
  };

  const handleImport = () => {
    if (parsedPreview.length === 0) return;

    startTransition(async () => {
      const res = await importGameLogs(parsedPreview);
      if (res.success && res.count) {
        setMessage({ type: 'success', text: `Successfully imported ${res.count} logs. Fetching game covers...` });
        
        // Clear file input state
        setParsedPreview([]);
        setFile(null);
        if (fileInputRef.current) fileInputRef.current.value = '';

        // Automatically trigger the background sync loop!
        runAutoSync(res.count);
      } else {
        setMessage({ type: 'error', text: res.error || 'Import failed.' });
      }
    });
  };

  return (
    <>
      <button
        type="button"
        onClick={() => setIsOpen(true)}
        className="inline-flex items-center gap-2 px-4 py-2 bg-purple-600 hover:bg-purple-500 text-white text-xs font-bold rounded-xl transition shadow-sm cursor-pointer"
      >
        <span>📤</span>
        <span>Import CSV</span>
      </button>

      {isOpen && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-lg w-full p-6 space-y-5 shadow-2xl relative">
            
            <div className="flex items-center justify-between border-b border-slate-800 pb-4">
              <h3 className="text-base font-bold text-white">Import Game Logs (.CSV)</h3>
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                disabled={syncProgress !== null} // Prevent closing while syncing
                className="text-slate-400 hover:text-white text-sm font-bold disabled:opacity-30"
              >
                ✕
              </button>
            </div>

            {message && (
              <div
                className={`p-3 rounded-xl text-xs font-semibold ${
                  message.type === 'success'
                    ? 'bg-emerald-950/80 border border-emerald-500/40 text-emerald-200'
                    : 'bg-rose-950/80 border border-rose-500/40 text-rose-200'
                }`}
              >
                {message.text}
              </div>
            )}

            {/* Sync Progress Bar */}
            {syncProgress && (
              <div className="space-y-2">
                <div className="flex justify-between text-xs text-slate-300 font-medium">
                  <span>Downloading covers from IGDB...</span>
                  <span>{syncProgress.total - syncProgress.remaining} / {syncProgress.total}</span>
                </div>
                <div className="w-full bg-slate-800 rounded-full h-2 overflow-hidden relative">
                  <div 
                    className="bg-purple-500 h-2 rounded-full transition-all duration-300 ease-out"
                    style={{ width: `${Math.max(5, ((syncProgress.total - syncProgress.remaining) / syncProgress.total) * 100)}%` }}
                  />
                </div>
              </div>
            )}

            {/* Only show file input if we aren't currently syncing */}
            {!syncProgress && (
              <>
                <div className="space-y-3">
                  <label className="block text-xs font-medium text-slate-400">
                    Select a CSV file containing columns like <code className="text-purple-400">Title</code>, <code className="text-purple-400">Rating</code>, <code className="text-purple-400">Status</code>, <code className="text-purple-400">Playtime</code>:
                  </label>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".csv"
                    onChange={handleFileChange}
                    className="block w-full text-xs text-slate-400 file:mr-4 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-xs file:font-bold file:bg-slate-800 file:text-purple-300 hover:file:bg-slate-700 cursor-pointer"
                  />
                </div>

                {parsedPreview.length > 0 && (
                  <div className="space-y-2">
                    <div className="flex justify-between items-center text-xs text-slate-400">
                      <span>Detected Logs: <strong className="text-white">{parsedPreview.length}</strong></span>
                    </div>
                    <div className="max-h-40 overflow-y-auto bg-slate-950 rounded-xl p-3 border border-slate-800 space-y-2 divide-y divide-slate-800/60">
                      {parsedPreview.slice(0, 5).map((row, idx) => (
                        <div key={idx} className="pt-1.5 first:pt-0 flex justify-between text-xs">
                          <span className="font-semibold text-slate-200 truncate max-w-[200px]">{row.title}</span>
                          <span className="text-slate-500">{row.status || 'PLAYED'}</span>
                        </div>
                      ))}
                      {parsedPreview.length > 5 && (
                        <p className="text-[10px] text-slate-500 pt-1 italic">
                          + {parsedPreview.length - 5} more entries...
                        </p>
                      )}
                    </div>
                  </div>
                )}
              </>
            )}

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                disabled={syncProgress !== null}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 disabled:opacity-50 text-slate-300 text-xs font-bold rounded-xl transition cursor-pointer"
              >
                Cancel
              </button>
              
              {!syncProgress && (
                <button
                  type="button"
                  onClick={handleImport}
                  disabled={isPending || parsedPreview.length === 0}
                  className="px-5 py-2 bg-purple-600 hover:bg-purple-500 disabled:opacity-50 text-white text-xs font-bold rounded-xl transition cursor-pointer flex items-center gap-2"
                >
                  {isPending ? 'Importing...' : `Import ${parsedPreview.length} Logs`}
                </button>
              )}
            </div>

          </div>
        </div>
      )}
    </>
  );
}