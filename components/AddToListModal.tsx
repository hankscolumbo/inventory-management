// components/AddToListModal.tsx
'use client';

import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useRouter } from 'next/navigation';
import { addGameToList } from '@/app/actions/manageListItems';
import { createList } from '@/app/actions/createList';

interface CustomListOption {
  id: string;
  title?: string;
  name?: string;
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

  const [localUserLists, setLocalUserLists] = useState<CustomListOption[]>(userLists);
  const [selectedListId, setSelectedListId] = useState<string>(userLists[0]?.id || '');
  const [isCreatingNewList, setIsCreatingNewList] = useState(false);
  const [newListTitle, setNewListTitle] = useState('');

  const [note, setNote] = useState('');
  const [loading, setLoading] = useState(false);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  const router = useRouter();

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    setLocalUserLists(userLists);
    if (userLists.length > 0) {
        if (!selectedListId) setSelectedListId(userLists[0]?.id || '');
    } else {
        // Default to create mode if user has no lists
        setIsCreatingNewList(true);
    }
  }, [userLists]);

 const handleSubmit = async (e: React.SyntheticEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);
    setFeedback(null);

    let targetListId: string | null = null;

    // 1. Handle Inline List Creation
    if (isCreatingNewList) {
      const trimmedTitle = newListTitle.trim();
      if (!trimmedTitle) {
        setFeedback({ type: 'error', message: 'Please enter a title for the new list.' });
        setLoading(false);
        return;
      }

      // Support both object { title } and string arguments for createList
      let createRes: any;
      try {
        createRes = await createList({ title: trimmedTitle });
      } catch {
        createRes = await createList(trimmedTitle as any);
      }

      // Extract new list ID across all possible server response shapes
      const createdId =
        createRes?.listId ||
        createRes?.id ||
        createRes?.list?.id ||
        createRes?.data?.id ||
        createRes?.customList?.id;

      if ((createRes && 'success' in createRes && !createRes.success) || !createdId) {
        setFeedback({
          type: 'error',
          message: createRes?.error || 'Failed to retrieve ID for new list.',
        });
        setLoading(false);
        return;
      }

      targetListId = createdId;
      setSelectedListId(createdId);
      setLocalUserLists((prev) => [
        ...prev,
        { id: createdId, title: trimmedTitle },
      ]);
    } else {
      targetListId = selectedListId;
    }

    if (!targetListId) {
      setFeedback({ type: 'error', message: 'Please select or create a list.' });
      setLoading(false);
      return;
    }

    // 2. Add Game to verified target list ID
    try {
      const res = await addGameToList({
        customListId: targetListId,
        gameTitle: game.name,
        coverUrl: game.coverUrl,
        igdbId: game.igdbId ? Number(game.igdbId) : null,
        steamAppId: game.steamAppId ? Number(game.steamAppId) : null,
        note: note.trim() || undefined,
      });

      setLoading(false);

      if (res?.success) {
        setFeedback({ type: 'success', message: 'Added to list successfully!' });
        setTimeout(() => {
          setIsOpen(false);
          setFeedback(null);
          setNote('');
          setNewListTitle('');
          setIsCreatingNewList(false);
          router.refresh();
        }, 1000);
      } else {
        setFeedback({
          type: 'error',
          message: res?.error || 'Failed to add game to list.',
        });
      }
    } catch (err) {
      console.error('Error adding game to list:', err);
      setLoading(false);
      setFeedback({ type: 'error', message: 'An unexpected error occurred.' });
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

        <form onSubmit={handleSubmit} className="space-y-4">
            {/* Target List Field (Select or Create Input) */}
            <div>
                <div className="flex items-center justify-between mb-1.5">
                    <label className="block text-xs font-semibold text-slate-300">
                        {isCreatingNewList ? 'New List Title' : 'Select Target List'}
                    </label>

                    {localUserLists.length > 0 && (
                        <button
                        type="button"
                        onClick={() => {
                            setIsCreatingNewList(!isCreatingNewList);
                            setFeedback(null);
                        }}
                        className="text-[11px] font-bold text-purple-400 hover:underline"
                        >
                        {isCreatingNewList ? '← Select existing list' : '+ Create new list'}
                        </button>
                    )}
                </div>

                {isCreatingNewList ? (
                    <input
                        type="text"
                        value={newListTitle}
                        onChange={(e) => setNewListTitle(e.target.value)}
                        placeholder="e.g. My Favorite RPGs of All Time"
                        autoFocus
                        className="w-full bg-slate-950 border border-slate-800 text-white text-xs px-3 py-2.5 rounded-xl focus:outline-none focus:border-purple-500"
                        />
                ) : (
                    <select
                        value={selectedListId}
                        onChange={(e) => setSelectedListId(e.target.value)}
                        className="w-full bg-slate-950 border border-slate-800 text-white text-xs px-3 py-2.5 rounded-xl focus:outline-none focus:border-purple-500"
                        >
                            {localUserLists.map((list) => (
                                <option key={list.id} value={list.id}>
                                    { list.title || list.name || 'Untitled List' }
                                </option>
                            ))}
                        </select>
                )}
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
                disabled={loading || (!isCreatingNewList && !selectedListId)}
                className="px-5 py-2 bg-purple-600 hover:bg-purple-500 disabled:bg-slate-800 text-white font-bold text-xs rounded-xl shadow-md transition"
              >
                {loading
                 ? 'Processing...'
                : isCreatingNewList
                ? 'Create & Add'
                : 'Add to List'}
              </button>
            </div>
          </form>
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
        className="inline-block cursor-pointer w-full"
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