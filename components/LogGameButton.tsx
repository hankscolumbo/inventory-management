// components/LogGameButton.tsx
'use client';

import { useState } from 'react';
import LogModal from './LogModal';

interface LogGameButtonProps {
  game: {
    id: number;
    name: string;
    coverUrl?: string | null;
    isSteamApp?: boolean;
  };
  initialLog?: {
    id?: string;
    status?: 'PLAYED' | 'PLAYING' | 'WANT TO PLAY';
    substatus?: string | null;
    rating?: number | null;
    playtimeHours?: number | null;
    platforms?: string[];
    isOwned?: boolean | null;
    review?: string | null;
  } | null;
  customTrigger?: React.ReactNode;
}

export default function LogGameButton({ game, initialLog, customTrigger }: LogGameButtonProps) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <>
      {customTrigger ? (
        <div
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            setIsOpen(true);
          }}
          className="inline-block cursor-pointer"
        >
          {customTrigger}
        </div>
      ) : (
        <button
          onClick={() => setIsOpen(true)}
          className="px-5 py-2.5 bg-purple-600 hover:bg-purple-500 text-white font-bold text-xs rounded-xl shadow-lg transition"
        >
          {initialLog ? 'Edit Your Log' : '+ Log Game'}
        </button>
      )}

      {isOpen && (
        <LogModal
          game={game}
          initialLog={initialLog ?? undefined}
          onClose={() => setIsOpen(false)}
        />
      )}
    </>
  );
}