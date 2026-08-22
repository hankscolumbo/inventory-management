// components/AddGameToListModal.tsx
'use client';

import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useRouter } from 'next/navigation';
import { addGameToList } from '@/app/actions/manageListItems';

interface GameOption {
  gameTitle: string;
  coverUrl?: string | null;
  igdbId?: number | null;
  steamAppId?: number | null;
}

interface AddGameToListModalProps {
  customListId: string;
  userGames: GameOption[];
}

export default function AddGameToListModal({ customListId, userGames }: AddGameToListModalProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState<string | null>(null);
  const [mounted, setMounted] = useState(false);
  const router = useRouter();

  useEffect(() => {
    setMounted(true);
  }, []);

  const filteredGames = userGames.filter((g) =>
    g.gameTitle.toLowerCase().includes(query.toLowerCase())
  );

  const handleAdd = async (game: GameOption) => {
    setLoading(game.gameTitle);
    const res = await addGameToList({
      customListId,
      gameTitle: game.gameTitle,
      coverUrl: game.coverUrl,
      igdbId: game.igdbId,
      steamAppId: game.steamAppId,
    });
    setLoading(null);

    if (res.success) {
      router.refresh();
      setIsOpen(false);
    }
  };

  const modalContent = isOpen ? (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-in fade-in duration-150">
      <div className="bg-slate-900 border border-slate-800 w-full max-w-md rounded-2xl p-6 shadow-2xl space-y-4 max-h-[80vh] flex flex-col">
        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
          <h3 className="text-lg font-extrabold text-white">Add Game to List</h3>
          <button
            onClick={() => setIsOpen(false)}
            className="text-slate-400 hover:text-white font-bold"
          >
            ✕
          </button>
        </div>

        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Filter your collection..."
          className="w-full bg-slate-950 border border-slate-800 text-white text-xs px-3.5 py-2 rounded-xl focus:outline-none focus:border-purple-500"
        />

        <div className="overflow-y-auto flex-1 space-y-2 pr-1">
          {filteredGames.length === 0 ? (
            <p className="text-xs text-slate-500 text-center py-6">No matching games found.</p>
          ) : (
            filteredGames.map((game, i) => (
              <div
                key={i}
                className="flex items-center justify-between bg-slate-950 p-2 rounded-xl border border-slate-800/80"
              >
                <div className="flex items-center gap-3">
                  {game.coverUrl ? (
                    <img
                      src={game.coverUrl}
                      alt={game.gameTitle}
                      className="w-8 h-10 object-cover rounded-md"
                    />
                  ) : (
                    <div className="w-8 h-10 bg-slate-800 rounded-md flex items-center justify-center text-[10px] text-slate-500">
                      N/A
                    </div>
                  )}
                  <span className="text-xs font-bold text-white line-clamp-1">
                    {game.gameTitle}
                  </span>
                </div>

                <button
                  onClick={() => handleAdd(game)}
                  disabled={loading === game.gameTitle}
                  className="px-3 py-1.5 bg-purple-600 hover:bg-purple-500 disabled:bg-slate-800 text-white text-xs font-bold rounded-lg transition"
                >
                  {loading === game.gameTitle ? 'Adding...' : '+ Add'}
                </button>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  ) : null;

  return (
    <>
      <button
        onClick={() => setIsOpen(true)}
        className="px-4 py-2 bg-purple-600 hover:bg-purple-500 text-white font-bold text-xs rounded-xl shadow-md transition flex items-center gap-2"
      >
        <span>+</span> Add Game
      </button>

      {mounted && modalContent && createPortal(modalContent, document.body)}
    </>
  );
}
