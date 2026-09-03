// components/ReactionsBar.tsx
'use client';

import { useTransition } from 'react';
import { toggleReaction, TargetType } from '@/app/actions/social';

const AVAILABLE_EMOJIS = ['❤️', '🔥', '👏', '🤣', '🤯', '💀'];

interface ReactionItem {
  emoji: string;
  userId: string;
}

interface ReactionsBarProps {
  targetId: string;
  targetType: TargetType;
  reactions: ReactionItem[];
  currentUserId?: string;
}

export default function ReactionsBar({
  targetId,
  targetType,
  reactions,
  currentUserId,
}: ReactionsBarProps) {
  const [isPending, startTransition] = useTransition();

  const handleToggle = (emoji: string) => {
    if (!currentUserId) return;
    startTransition(async () => {
      await toggleReaction({ targetId, targetType, emoji });
    });
  };

  return (
    <div className="flex flex-wrap items-center gap-2 pt-2">
      {AVAILABLE_EMOJIS.map((emoji) => {
        const matches = reactions.filter((r) => r.emoji === emoji);
        const count = matches.length;
        const hasReacted = currentUserId ? matches.some((r) => r.userId === currentUserId) : false;

        return (
          <button
            key={emoji}
            type="button"
            disabled={!currentUserId || isPending}
            onClick={() => handleToggle(emoji)}
            className={`flex items-center gap-1.5 px-2.5 py-1 rounded-xl text-xs font-mono font-bold transition border cursor-pointer ${
              hasReacted
                ? 'bg-purple-950/80 border-purple-500 text-purple-200'
                : 'bg-slate-950 border-slate-800 text-slate-400 hover:border-slate-700 hover:text-slate-200'
            } ${!currentUserId ? 'cursor-not-allowed opacity-70' : ''}`}
          >
            <span>{emoji}</span>
            {count > 0 && <span>{count}</span>}
          </button>
        );
      })}
    </div>
  );
}
