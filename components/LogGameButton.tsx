// components/LogGameButton.tsx
'use client';

import { useState } from 'react';
import LogModal from '@/components/LogModal';
import { useRouter } from 'next/navigation';

interface LogGameButtonProps {
  game: {
    id: number;
    name: string;
    coverUrl?: string | null;
  };
}

export default function LogGameButton({ game }: LogGameButtonProps) {
  const [isOpen, setIsOpen] = useState(false);
  const router = useRouter();

  return (
    <>
      <button
        onClick={() => setIsOpen(true)}
        className="w-full max-w-48 bg-purple-600 hover:bg-purple-500 text-white font-medium py-2.5 rounded-lg text-sm transition shadow-lg"
      >
        + Log This Game
      </button>

      {isOpen && (
        <LogModal
          game={game}
          onClose={() => setIsOpen(false)}
          onSuccess={() => {
            // Refresh server data to show the new review immediately
            router.refresh();
          }}
        />
      )}
    </>
  );
}
