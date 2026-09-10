// components/DeleteListButton.tsx
'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { triggerHaptic } from '@/lib/haptics';

interface DeleteListButtonProps {
  listId: string;
  listTitle: string;
  username?: string;
}

export default function DeleteListButton({ listId, listTitle, username }: DeleteListButtonProps) {
  const router = useRouter();
  const [isDeleting, setIsDeleting] = useState(false);

  const handleDelete = async () => {
    if (!confirm(`Are you sure you want to delete "${listTitle}"? This cannot be undone.`)) {
      return;
    }

    triggerHaptic('medium');
    setIsDeleting(true);

    try {
      const res = await fetch(`/api/list/${listId}`, {
        method: 'DELETE',
      });

      if (res.ok) {
        const redirectPath = username ? `/u/${username}` : '/profile';
        router.push(redirectPath);
        router.refresh();
      } else {
        const data = await res.json().catch(() => ({}));
        alert(data.error || 'Failed to delete list.');
      }
    } catch (error) {
      console.error('Delete list error:', error);
      alert('An error occurred while deleting the list.');
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <button
      type="button"
      onClick={handleDelete}
      disabled={isDeleting}
      className="p-1.5 text-rose-400 hover:text-rose-300 hover:bg-rose-500/10 border border-rose-500/20 rounded-lg transition text-xs font-bold flex items-center justify-center cursor-pointer disabled:opacity-50"
      title="Delete list"
    >
      <span>🗑️</span>
    </button>
  );
}
