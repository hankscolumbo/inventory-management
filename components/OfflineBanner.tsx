'use client';

import { useState, useEffect } from 'react';
import { triggerHaptic } from '@/lib/haptics';

export default function OfflineBanner() {
  const [isOffline, setIsOffline] = useState(false);
  const [showBackOnline, setShowBackOnline] = useState(false);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      setIsOffline(!navigator.onLine);
    }

    const handleOffline = () => {
      setIsOffline(true);
      setShowBackOnline(false);
      triggerHaptic('heavy');
    };

    const handleOnline = () => {
      setIsOffline(false);
      setShowBackOnline(true);
      triggerHaptic('light');

      const timer = setTimeout(() => {
        setShowBackOnline(false);
      }, 3000);

      return () => clearTimeout(timer);
    };

    window.addEventListener('offline', handleOffline);
    window.addEventListener('online', handleOnline);

    return () => {
      window.removeEventListener('offline', handleOffline);
      window.removeEventListener('online', handleOnline);
    };
  }, []);

  if (!isOffline && !showBackOnline) return null;

  return (
    <div
      className={`fixed top-0 left-0 right-0 z-50 text-xs font-bold text-center py-2 px-4 shadow-xl backdrop-blur-md transition-all duration-300 pt-[calc(env(safe-area-inset-top)+0.5rem)] ${
        isOffline
          ? 'bg-rose-950/90 border-b border-rose-800/80 text-rose-200'
          : 'bg-emerald-950/90 border-b border-emerald-800/80 text-emerald-200'
      }`}
    >
      {isOffline ? (
        <div className="flex items-center justify-center gap-2">
          <span className="w-2 h-2 rounded-full bg-rose-500 animate-pulse" />
          <span>You are currently offline. Showing cached library data.</span>
        </div>
      ) : (
        <div className="flex items-center justify-center gap-2">
          <span className="w-2 h-2 rounded-full bg-emerald-500" />
          <span>Back online! Connection restored.</span>
        </div>
      )}
    </div>
  );
}
