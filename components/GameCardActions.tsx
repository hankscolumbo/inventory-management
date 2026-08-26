// components/GameCardActions.tsx
'use client';

import { useState } from 'react';
import LogModal from './LogModal';
import AddToListModal from './AddToListModal';

interface GameItem {
  gameTitle: string;
  coverUrl?: string | null;
  igdbId?: number | null;
  steamAppId?: number | null;
}

interface GameCardActionsProps {
  item: GameItem;
  userLists?: { id: string; title: string }[];
}

export default function GameCardActions({ item, userLists = [] }: GameCardActionsProps) {
  const [showLogModal, setShowLogModal] = useState(false);

  // Format item to match LogModal's expected game object structure
  const logModalGame = {
    id: item.igdbId || item.steamAppId || 0,
    name: item.gameTitle,
    coverUrl: item.coverUrl,
    isSteamApp: Boolean(!item.igdbId && item.steamAppId),
  };

  // Format item to match AddToListModal's expected game object structure
  const addToListGame = {
    name: item.gameTitle,
    coverUrl: item.coverUrl,
    igdbId: item.igdbId,
    steamAppId: item.steamAppId,
  };

  return (
    <>
      <div className="grid grid-cols-2 gap-1.5 pt-2 border-t border-slate-800/80 mt-2">
        {/* Trigger for LogModal */}
        <button
          type="button"
          onClick={() => setShowLogModal(true)}
          className="px-2 py-1 bg-purple-600/20 hover:bg-purple-600/40 text-purple-300 text-[10px] font-bold rounded-md border border-purple-500/30 transition flex items-center justify-center gap-1"
        >
          <span>+ Log</span>
        </button>

        {/* Trigger for AddToListModal using customTrigger */}
        <AddToListModal
          game={addToListGame}
          userLists={userLists}
          customTrigger={
            <div className="w-full px-2 py-1 bg-slate-800 hover:bg-slate-700 text-slate-300 text-[10px] font-bold rounded-md border border-slate-700 transition flex items-center justify-center gap-1">
              <span>+ List</span>
            </div>
          }
        />
      </div>

      {/* Render LogModal conditionally */}
      {showLogModal && (
        <LogModal
          game={logModalGame}
          onClose={() => setShowLogModal(false)}
        />
      )}
    </>
  );
}