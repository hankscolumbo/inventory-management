// components/GameDealsModal.tsx
'use client';

import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import GameDealsWidget from './GameDealsWidget';

interface GameDealsModalProps {
  gameTitle: string;
  steamAppId?: number | null;
  onClose: () => void;
}

export default function GameDealsModal({ gameTitle, steamAppId, onClose }: GameDealsModalProps) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) return null;

  return createPortal(
    <div className="fixed inset-0 z-[9999] bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-2xl p-6 shadow-2xl relative space-y-4 max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
          <div>
            <h2 className="text-lg font-extrabold text-white truncate">{gameTitle}</h2>
            <p className="text-xs text-slate-400 font-mono">Live Price Comparison</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-slate-400 hover:text-white font-bold p-1 text-sm"
          >
            ✕
          </button>
        </div>

        {/* Embedded Deals Grid */}
        <GameDealsWidget title={gameTitle} steamAppId={steamAppId} />
      </div>
    </div>,
    document.body
  );
}