// components/AddToListModal.tsx
'use client';

import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useRouter } from 'next/navigation';
import { addGameToList } from '@/app/actions/manageListItems';

interface CustomListOption {
  id: string;
  title: string;
}

interface AddToListModalProps {
  game: {
    name: string;
    coverUrl?: string | null;
    igdbId?: number | null;
    steamAppId?: number | null;
  };
  userLists: { id: string; title: string }[];
  customTrigger?: React.ReactNode;
}

export default function AddToListModal({ game, userLists, customTrigger }: AddToListModalProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [selectedListId, setSelectedListId] = useState<string>(userLists[0]?.id || '');
  const [note, setNote] = useState('');
  const [loading, setLoading] = useState(false);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  const router = useRouter();

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (userLists.length > 0 && !selectedListId) {
      setSelectedListId(userLists[0]?.id || '');
    }
  }, [userLists, selectedListId]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedListId) return;

    setLoading(true);
    setFeedback(null);

    const res = await addGameToList({
      customListId: selectedListId,
      gameTitle: game.name,
      coverUrl: game.coverUrl,
      igdbId: game.igdbId,
      steamAppId: game.steamAppId,
      note: note.trim() || undefined,
    });

    setLoading(false);

    if (res.success) {
      setFeedback({ type: 'success', message: 'Added to list successfully!' });
      setTimeout(() => {
        setIsOpen(false);
        setFeedback(null);
        setNote('');
        router.refresh();
      }, 1000);
    } else {
      setFeedback({ type: 'error', message: res.error || 'Failed to add to list.' });
    }
  };

  const modalContent = isOpen ? (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-150">
      <div className="bg-slate-900 border border-slate-800 w-full max-w-md rounded-2xl p-6 shadow-2xl space-y-4">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
          <h3 className="text-base font-extrabold text-white truncate">
            Add "{game.name}" to List
          </h3>
          <button
            type="button"
            onClick={() => setIsOpen(false)}
            className="text-slate-400 hover:text-white font-bold text-sm p-1"
          >
            ✕
          </button>
        </div>

        {feedback && (
          <div
            className={`p-3 rounded-xl border text-xs font-semibold ${
              feedback.type === 'success'
                ? 'bg-emerald-950/60 border-emerald-800 text-emerald-300'
                : 'bg-red-950/60 border-red-800 text-red-300'
            }`}
          >
            {feedback.message}
          </div>
        )}

        {userLists.length === 0 ? (
          <div className="text-center py-6 space-y-3">
            <p className="text-xs text-slate-400">
              You haven't created any custom lists yet.
            </p>
            <button
              type="button"
              onClick={() => setIsOpen(false)}
              className="text-xs font-bold text-purple-400 hover:underline"
            >
              Close
            </button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* List Selection */}
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                Select Target List
              </label>
              <select
                value={selectedListId}
                onChange={(e) => setSelectedListId(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 text-white text-xs px-3 py-2.5 rounded-xl focus:outline-none focus:border-purple-500"
              >
                {userLists.map((list) => (
                  <option key={list.id} value={list.id}>
                    {list.title}
                  </option>
                ))}
              </select>
            </div>

            {/* Note Input */}
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                Custom Entry Note <span className="text-slate-500">(Optional)</span>
              </label>
              <textarea
                rows={3}
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder="e.g. Best soundtrack in the series, or rank thoughts..."
                className="w-full bg-slate-950 border border-slate-800 text-white text-xs p-3 rounded-xl focus:outline-none focus:border-purple-500 resize-none"
              />
            </div>

            {/* Actions */}
            <div className="flex items-center justify-end gap-3 pt-2 border-t border-slate-800/80">
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                className="px-4 py-2 text-xs font-semibold text-slate-400 hover:text-white transition"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={loading || !selectedListId}
                className="px-5 py-2 bg-purple-600 hover:bg-purple-500 disabled:bg-slate-800 text-white font-bold text-xs rounded-xl shadow-md transition"
              >
                {loading ? 'Adding...' : 'Add to List'}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  ) : null;

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
        type="button"
        onClick={() => setIsOpen(true)}
        className="px-4 py-2.5 bg-slate-800 hover:bg-slate-700 border border-slate-700 text-white font-bold text-xs rounded-xl shadow transition flex items-center gap-1.5"
      >
        <span>📋</span> Add to List
      </button>
    )}
    
      {mounted && modalContent && createPortal(modalContent, document.body)}
    </>
  );
}