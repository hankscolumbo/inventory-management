'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { getOfflineQueue, clearOfflineQueue } from '@/lib/offlineQueue';
import { syncOfflineLogs } from '@/app/actions/syncOfflineLogs';
import { triggerHaptic } from '@/lib/haptics';

export default function OfflineSyncHandler() {
  const router = useRouter();
  const [syncingCount, setSyncingCount] = useState<number | null>(null);

  const processQueue = async () => {
    const queue = getOfflineQueue();
    if (queue.length === 0) return;

    setSyncingCount(queue.length);

    try {
      const res = await syncOfflineLogs(queue);
      if (res.success) {
        triggerHaptic('medium');
        clearOfflineQueue();
        router.refresh();
      }
    } catch (err) {
      console.error('Offline queue auto-sync failed:', err);
    } finally {
      setTimeout(() => setSyncingCount(null), 3000);
    }
  };

  useEffect(() => {
    if (navigator.onLine) {
      processQueue();
    }

    const handleOnline = () => processQueue();
    window.addEventListener('online', handleOnline);
    return () => window.removeEventListener('online', handleOnline);
  }, []);

  if (!syncingCount) return null;

  return (
    <div className="fixed bottom-20 left-4 right-4 md:left-auto md:right-4 z-50 max-w-sm bg-purple-950/90 border border-purple-500/40 text-purple-200 text-xs font-bold p-3 rounded-xl backdrop-blur-md shadow-2xl flex items-center justify-between animate-bounce">
      <div className="flex items-center gap-2">
        <div className="w-3.5 h-3.5 border-2 border-purple-300 border-t-transparent rounded-full animate-spin" />
        <span>Syncing {syncingCount} offline {syncingCount === 1 ? 'log' : 'logs'}...</span>
      </div>
    </div>
  );
}
