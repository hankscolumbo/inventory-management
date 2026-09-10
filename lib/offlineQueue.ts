//lib/offlineQueue.ts

export interface QueuedLog {
  tempId: string;
  gameTitle: string;
  igdbId?: number | null;
  status: string;
  rating?: number | null;
  playtimeHours?: number;
  review?: string | null;
  createdAt: string;
}

const QUEUE_KEY = 'gamelog_offline_queue';

function notifyQueueChange() {
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new Event('offline-queue-updated'));
  }
}

export function getOfflineQueue(): QueuedLog[] {
  if (typeof window === 'undefined') return [];
  try {
    const data = localStorage.getItem(QUEUE_KEY);
    return data ? JSON.parse(data) : [];
  } catch {
    return [];
  }
}

export function saveToOfflineQueue(log: Omit<QueuedLog, 'tempId' | 'createdAt'>): QueuedLog {
  const current = getOfflineQueue();
  const newEntry: QueuedLog = {
    ...log,
    tempId: `offline_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
    createdAt: new Date().toISOString(),
  };

  localStorage.setItem(QUEUE_KEY, JSON.stringify([newEntry, ...current]));
  notifyQueueChange();
  return newEntry;
}

export function removeFromOfflineQueue(tempId: string) {
  const current = getOfflineQueue();
  const updated = current.filter((item) => item.tempId !== tempId);
  localStorage.setItem(QUEUE_KEY, JSON.stringify(updated));
  notifyQueueChange();
}

export function clearOfflineQueue() {
  localStorage.removeItem(QUEUE_KEY);
  notifyQueueChange();
}
