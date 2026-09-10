//hooks/useOfflineLogs.ts

'use client';

import { useState, useEffect } from 'react';
import { getOfflineQueue, QueuedLog } from '@/lib/offlineQueue';

export function useOfflineLogs() {
  const [offlineLogs, setOfflineLogs] = useState<QueuedLog[]>([]);

  useEffect(() => {
    setOfflineLogs(getOfflineQueue());

    const handleUpdate = () => {
      setOfflineLogs(getOfflineQueue());
    };

    window.addEventListener('offline-queue-updated', handleUpdate);
    window.addEventListener('storage', handleUpdate);

    return () => {
      window.removeEventListener('offline-queue-updated', handleUpdate);
      window.removeEventListener('storage', handleUpdate);
    };
  }, []);

  return offlineLogs;
}
