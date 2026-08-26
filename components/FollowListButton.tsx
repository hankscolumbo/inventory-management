// components/FollowListButton.tsx
'use client';

import { useState } from 'react';
import { toggleFollowList } from '@/app/actions/toggleFollowList';

interface Props {
  customListId: string;
  initialIsFollowing: boolean;
  isOwner: boolean;
}

export default function FollowListButton({ customListId, initialIsFollowing, isOwner }: Props) {
  const [isFollowing, setIsFollowing] = useState(initialIsFollowing);
  const [loading, setLoading] = useState(false);

  // Owners do not need to follow their own lists
  if (isOwner) return null;

  const handleToggle = async () => {
    setLoading(true);
    const res = await toggleFollowList(customListId);
    if (res.success && res.isFollowing !== undefined) {
      setIsFollowing(res.isFollowing);
    }
    setLoading(false);
  };

  return (
    <button
      type="button"
      onClick={handleToggle}
      disabled={loading}
      className={`w-full py-2 px-3 rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5 border ${
        isFollowing
          ? 'bg-slate-800 hover:bg-red-950/40 border-slate-700 hover:border-red-800/60 text-slate-300 hover:text-red-400'
          : 'bg-purple-600 hover:bg-purple-500 border-purple-500 text-white'
      }`}
    >
      {loading ? (
        'Updating...'
      ) : isFollowing ? (
        <><span>✓</span> Following</>
      ) : (
        <><span>+</span> Follow List</>
      )}
    </button>
  );
}