'use client';

import { useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { triggerHaptic } from '@/lib/haptics';

export default function PullToRefresh({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const [pullDistance, setPullDistance] = useState(0);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const touchStartRef = useRef(0);
  const pullThreshold = 75;

  const handleTouchStart = (e: React.TouchEvent) => {
    const touch = e.touches?.[0];
    if (!touch) return;

    if (window.scrollY === 0) {
      touchStartRef.current = touch.clientY;
    }
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (window.scrollY !== 0 || isRefreshing) return;

    const touch = e.touches?.[0];
    if (!touch) return;

    const currentY = touch.clientY;
    const distance = currentY - touchStartRef.current;

    if (distance > 0) {
      const dampedDistance = Math.min(distance * 0.4, 110);
      setPullDistance(dampedDistance);
    }
  };

  const handleTouchEnd = async () => {
    if (pullDistance >= pullThreshold && !isRefreshing) {
      triggerHaptic('medium');
      setIsRefreshing(true);
      setPullDistance(50);

      router.refresh();

      setTimeout(() => {
        setIsRefreshing(false);
        setPullDistance(0);
      }, 800);
    } else {
      setPullDistance(0);
    }
  };

  return (
    <div
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
      className="relative min-h-screen"
    >
      <div
        className="fixed top-12 left-0 right-0 z-30 flex justify-center pointer-events-none transition-transform duration-100 ease-out"
        style={{
          transform: `translateY(${pullDistance - 40}px)`,
          opacity: pullDistance > 10 ? 1 : 0,
        }}
      >
        <div className="w-8 h-8 rounded-full bg-slate-900 border border-slate-700 shadow-xl flex items-center justify-center">
          {isRefreshing ? (
            <div className="w-4 h-4 border-2 border-purple-400 border-t-transparent rounded-full animate-spin" />
          ) : (
            <span
              className="text-xs text-purple-400 transition-transform duration-150"
              style={{
                transform: `rotate(${Math.min(pullDistance * 2.5, 180)}deg)`,
              }}
            >
              ↓
            </span>
          )}
        </div>
      </div>

      <div
        style={{
          transform: `translateY(${pullDistance * 0.3}px)`,
          transition: pullDistance === 0 ? 'transform 0.2s cubic-bezier(0,0,0.2,1)' : 'none',
        }}
      >
        {children}
      </div>
    </div>
  );
}