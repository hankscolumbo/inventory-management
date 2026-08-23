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
  initialLog?: any;
}

export default function LogGameButton({ game, initialLog }: LogGameButtonProps) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <>
      <button
        onClick={() => setIsOpen(true)}
        className="px-5 py-2.5 bg-purple-600 hover:bg-purple-500 text-white font-bold text-xs rounded-xl shadow-lg transition"
      >
        {initialLog ? 'Edit Your Log' : '+ Log Game'}
      </button>

      {isOpen && (
        <LogModal
          game={game}
          initialLog={initialLog}
          onClose={() => setIsOpen(false)}
        />
      )}
    </>
  );
}
