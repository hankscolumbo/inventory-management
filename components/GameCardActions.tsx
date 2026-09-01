// components/GameCardActions.tsx
'use client';


import { useState, useEffect } from 'react';
import { UserLogItem } from '@/components/HomeSectionGrid';
import LogModal from './LogModal';
import AddToListModal from './AddToListModal';
import MergeModal from './MergeModal';


interface GameItem {
  id?: string;
  gameTitle: string;
  coverUrl?: string | null;
  igdbId?: number | null;
  steamAppId?: number | null;
  status?: string;
  substatus?: string | null;
  rating?: number | null;
  review?: string | null;
  playtimeHours?: number | null;
  platforms?: string[];
  isOwned?: boolean;
}


interface GameCardActionsProps {
  item: GameItem;
  initialLog?: UserLogItem | null;
  userLists?: { id: string; title: string }[];
}


export default function GameCardActions({ item, initialLog = null, userLists = [] }: GameCardActionsProps) {
  const [showLogModal, setShowLogModal] = useState(false);
  const [showMergeModal, setShowMergeModal] = useState(false);


  const [logState, setLogState] = useState<UserLogItem | null>(initialLog);


  // Sync logState when initialLog prop changes asynchronously
  useEffect(() => {
    setLogState(initialLog);
  }, [initialLog]);


  // Merge logState and item to derive active log data
  const activeLog = logState || (item.id || item.status ? item : null);
  const hasExistingLog = Boolean(activeLog?.id || activeLog?.status);


  const logModalGame = {
    id: item.igdbId || item.steamAppId || 0,
    name: item.gameTitle,
    coverUrl: item.coverUrl,
    isSteamApp: Boolean(!item.igdbId && item.steamAppId),
  };


  const addToListGame = {
    name: item.gameTitle,
    coverUrl: item.coverUrl,
    igdbId: item.igdbId,
    steamAppId: item.steamAppId,
  };


  return (
    <>
      <div className={`grid ${activeLog?.id ? 'grid-cols-3' : 'grid-cols-2'} gap-1.5`}>
        {/* 1. Left: List Button */}
        <AddToListModal
          game={addToListGame}
          userLists={userLists}
          customTrigger={
            <div className="w-full py-1.5 bg-cyan-600/20 hover:bg-cyan-600/40 text-cyan-300 text-[10px] font-bold rounded-md border border-cyan-500/30 transition flex items-center justify-center gap-1">
              <span>📋 LIST</span>
            </div>
          }
        />


        {/* 2. Middle: Merge Button (Renders when log exists in DB) */}
        {activeLog?.id && (
          <button
            type="button"
            onClick={() => setShowMergeModal(true)}
            className="w-full py-1.5 bg-fuchsia-500/20 hover:bg-fuchsia-500/40 text-fuchsia-300 text-[10px] font-bold rounded-md border border-fuchsia-400/40 transition flex items-center justify-center gap-1"
            title="Merge duplicate log"
          >
            <span>MERGE</span>
          </button>
        )}


        {/* 3. Right: Log Button */}
        <button
          type="button"
          onClick={() => setShowLogModal(true)}
          className="w-full py-1.5 bg-purple-600/20 hover:bg-purple-600/40 text-purple-300 text-[10px] font-bold rounded-md border border-purple-500/30 transition flex items-center justify-center gap-1"
        >
          <span>{hasExistingLog ? '✏️ LOG' : '➕ LOG'}</span>
        </button>
      </div>


      {showLogModal && (
        <LogModal
          key={activeLog?.id || 'new-log'} // Forces LogModal state to re-initialize on open
          game={logModalGame}
          initialLog={
            hasExistingLog && activeLog
              ? {
                  id: activeLog.id,
                  status: activeLog.status as any,
                  substatus: activeLog.substatus,
                  rating: activeLog.rating,
                  review: activeLog.review,
                  playtimeHours: activeLog.playtimeHours,
                  platforms: activeLog.platforms,
                  isOwned: activeLog.isOwned,
                }
              : undefined
          }
          onClose={() => setShowLogModal(false)}
        />
      )}


      {showMergeModal && activeLog?.id && (
        <MergeModal
          currentLog={{
            id: activeLog.id,
            gameTitle: item.gameTitle,
            coverUrl: item.coverUrl,
          }}
          onClose={() => setShowMergeModal(false)}
        />
      )}
    </>
  );
}