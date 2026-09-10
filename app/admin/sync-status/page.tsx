'use client';

import { useState, useEffect, useTransition } from 'react';
import { getSyncStats, getUnsyncedLogs, resetFailedLogs } from '@/app/actions/adminSync';
import { cleanupDuplicateLogs } from '@/app/actions/deduplicateLogs';
import LinkIgdbModal from '@/components/LinkIgdbModal';

interface Stats {
  total: number;
  synced: number;
  pending: number;
  failed: number;
}

interface LogItem {
  id: string;
  gameTitle: string;
  igdbId: number | null;
  createdAt: Date;
  user: { name: string | null; email: string | null };
}

export default function AdminSyncDashboard() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [logs, setLogs] = useState<LogItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [isSyncingBatch, setIsSyncingBatch] = useState(false);
  const [isPending, startTransition] = useTransition();

  const loadData = async () => {
    setLoading(true);
    try {
      const [statsData, logsData] = await Promise.all([getSyncStats(), getUnsyncedLogs()]);
      setStats(statsData);
      setLogs(logsData as LogItem[]);
    } catch (err) {
      console.error('Failed to load admin sync stats:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleResetFailed = () => {
    startTransition(async () => {
      await resetFailedLogs();
      await loadData();
    });
  };

  const handlePurgeDuplicates = () => {
    startTransition(async () => {
      const res = await cleanupDuplicateLogs();
      if (res.success) {
        alert(`Cleaned up ${res.removedCount} duplicate entries.`);
        await loadData();
      }
    });
  };

  const handleRunManualSyncBatch = async () => {
    setIsSyncingBatch(true);
    try {
      await fetch('/api/sync-imported-logs', { method: 'POST' });
      await loadData();
    } catch (err) {
      console.error('Manual batch trigger failed:', err);
    } finally {
      setIsSyncingBatch(false);
    }
  };

  if (loading) {
    return <div className="max-w-5xl mx-auto py-12 px-4 text-center text-slate-400 text-xs">Loading sync dashboard...</div>;
  }

  return (
    <div className="max-w-5xl mx-auto py-8 px-4 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-white">Sync Diagnostics Dashboard</h1>
          <p className="text-xs text-slate-400">Inspect IGDB cover sync progress and manage unmatched entries.</p>
        </div>
        <button
          type="button"
          onClick={loadData}
          className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold rounded-lg transition cursor-pointer"
        >
          🔄 Refresh
        </button>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-slate-900 border border-slate-800 p-4 rounded-xl">
          <p className="text-[11px] font-medium text-slate-400">Total Logs</p>
          <p className="text-xl font-extrabold text-white mt-1">{stats?.total ?? 0}</p>
        </div>
        <div className="bg-slate-900 border border-slate-800 p-4 rounded-xl">
          <p className="text-[11px] font-medium text-emerald-400">Synced</p>
          <p className="text-xl font-extrabold text-emerald-300 mt-1">{stats?.synced ?? 0}</p>
        </div>
        <div className="bg-slate-900 border border-slate-800 p-4 rounded-xl">
          <p className="text-[11px] font-medium text-amber-400">Pending</p>
          <p className="text-xl font-extrabold text-amber-300 mt-1">{stats?.pending ?? 0}</p>
        </div>
        <div className="bg-slate-900 border border-slate-800 p-4 rounded-xl">
          <p className="text-[11px] font-medium text-rose-400">Unmatched (-1)</p>
          <p className="text-xl font-extrabold text-rose-300 mt-1">{stats?.failed ?? 0}</p>
        </div>
      </div>

      <div className="bg-slate-900 border border-slate-800 p-4 rounded-xl flex flex-wrap gap-3 items-center justify-between">
        <span className="text-xs text-slate-400">Control Actions:</span>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={handlePurgeDuplicates}
            disabled={isPending}
            className="px-3 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold rounded-xl transition cursor-pointer"
          >
            🧹 Purge Duplicates
          </button>
          <button
            type="button"
            onClick={handleResetFailed}
            disabled={isPending || stats?.failed === 0}
            className="px-3 py-2 bg-amber-950/60 border border-amber-500/40 text-amber-200 text-xs font-bold rounded-xl transition cursor-pointer disabled:opacity-40"
          >
            Reset Failed Flags
          </button>
          <button
            type="button"
            onClick={handleRunManualSyncBatch}
            disabled={isSyncingBatch || stats?.pending === 0}
            className="px-4 py-2 bg-purple-600 hover:bg-purple-500 text-white text-xs font-bold rounded-xl transition cursor-pointer disabled:opacity-40"
          >
            {isSyncingBatch ? 'Running Batch...' : 'Trigger Sync Batch (5 Logs)'}
          </button>
        </div>
      </div>

      <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden">
        <div className="p-4 border-b border-slate-800">
          <h3 className="text-xs font-bold text-slate-200">Unsynced or Custom Entries ({logs.length})</h3>
        </div>
        {logs.length === 0 ? (
          <div className="p-6 text-center text-xs text-slate-500">All logs are successfully synced with IGDB!</div>
        ) : (
          <div className="divide-y divide-slate-800/60">
            {logs.map((log) => (
              <div key={log.id} className="p-3.5 flex items-center justify-between text-xs hover:bg-slate-800/40 transition">
                <div>
                  <p className="font-semibold text-slate-200">{log.gameTitle}</p>
                  <p className="text-[10px] text-slate-500">User: {log.user.name || log.user.email}</p>
                </div>
                <div className="flex items-center gap-3">
                  <span className={`px-2 py-0.5 text-[10px] font-bold rounded ${log.igdbId === -1 ? 'bg-rose-950/60 text-rose-300' : 'bg-amber-950/60 text-amber-300'}`}>
                    {log.igdbId === -1 ? 'Unmatched (-1)' : 'Pending (null)'}
                  </span>
                  <LinkIgdbModal logId={log.id} currentTitle={log.gameTitle} />
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
