// components/EditListModal.tsx
'use client';

import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useRouter } from 'next/navigation';
import { updateList, deleteList } from '@/app/actions/manageLists';

interface EditListModalProps {
  list: {
    id: string;
    title: string;
    description?: string | null;
    username?: string | null;
  };
}

export default function EditListModal({ list }: EditListModalProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [title, setTitle] = useState(list.title);
  const [description, setDescription] = useState(list.description || '');
  const [loading, setLoading] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  const router = useRouter();

  useEffect(() => {
    setMounted(true);
  }, []);

  const handleUpdate = async (e: React.SyntheticEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);
    setFeedback(null);

    const res = await updateList(list.id, { title, description });
    setLoading(false);

    if (res.success) {
      setFeedback({ type: 'success', message: 'List updated successfully!' });
      setTimeout(() => {
        setIsOpen(false);
        setFeedback(null);
        router.refresh();
      }, 800);
    } else {
      setFeedback({ type: 'error', message: res.error || 'Failed to update list.' });
    }
  };

  const handleDelete = async () => {
    setIsDeleting(true);
    setFeedback(null);

    const res = await deleteList(list.id);
    setIsDeleting(false);

    if (res.success) {
      setIsOpen(false);
      router.push(list.username ? `/u/${list.username}` : 'lists');
      router.refresh();
    } else {
      setFeedback({ type: 'error', message: res.error || 'Failed to delete list.' });
    }
  };

  const modalContent = isOpen ? (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-150">
      <div className="bg-slate-900 border border-slate-800 w-full max-w-md rounded-2xl p-6 shadow-2xl space-y-4">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
          <h3 className="text-base font-extrabold text-white">Edit List Settings</h3>
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

        {confirmDelete ? (
          /* Delete Confirmation View */
          <div className="space-y-4 py-2">
            <div className="p-3 bg-red-950/40 border border-red-800/80 rounded-xl space-y-1">
              <p className="text-xs font-bold text-red-300">Are you sure you want to delete this list?</p>
              <p className="text-[11px] text-red-400/90">
                "{list.title}" and all its saved items will be permanently removed.
              </p>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setConfirmDelete(false)}
                className="px-4 py-2 text-xs font-semibold text-slate-400 hover:text-white"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={isDeleting}
                onClick={handleDelete}
                className="px-4 py-2 bg-red-600 hover:bg-red-500 text-white font-bold text-xs rounded-xl shadow transition disabled:opacity-50"
              >
                {isDeleting ? 'Deleting...' : 'Yes, Delete List'}
              </button>
            </div>
          </div>
        ) : (
          /* Edit Form View */
          <form onSubmit={handleUpdate} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">List Title</label>
              <input
                type="text"
                required
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 text-white text-xs px-4 py-2.5 rounded-xl focus:outline-none focus:border-purple-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                Description <span className="text-slate-500">(Optional)</span>
              </label>
              <textarea
                rows={3}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="What is this list about?"
                className="w-full bg-slate-950 border border-slate-800 text-white text-xs p-3 rounded-xl focus:outline-none focus:border-purple-500 resize-none"
              />
            </div>

            <div className="flex items-center justify-between pt-3 border-t border-slate-800/80">
              <button
                type="button"
                onClick={() => setConfirmDelete(true)}
                className="text-xs font-bold text-red-400 hover:text-red-300 hover:underline"
              >
                🗑️ Delete List
              </button>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setIsOpen(false)}
                  className="px-3 py-1.5 text-xs font-semibold text-slate-400 hover:text-white"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loading || !title.trim()}
                  className="px-4 py-2 bg-purple-600 hover:bg-purple-500 disabled:opacity-50 text-white font-bold text-xs rounded-xl shadow transition"
                >
                  {loading ? 'Saving...' : 'Save Changes'}
                </button>
              </div>
            </div>
          </form>
        )}
      </div>
    </div>
  ) : null;

  return (
    <>
      <button
        type="button"
        onClick={() => setIsOpen(true)}
        className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200 text-xs font-semibold rounded-xl transition flex items-center gap-1.5"
      >
        <span>⚙️</span> Edit List
      </button>

      {mounted && modalContent && createPortal(modalContent, document.body)}
    </>
  );
}