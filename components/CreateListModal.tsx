// components/CreateListModal.tsx
'use client';

import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useRouter } from 'next/navigation';
import { createList } from '@/app/actions/createList';

interface CreateListModalProps {
  onSuccess?: () => void;
}

export default function CreateListModal({ onSuccess }: CreateListModalProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [isPrivate, setIsPrivate] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [mounted, setMounted] = useState(false);

  const router = useRouter();

  // Ensure portal target exists on client render
  useEffect(() => {
    setMounted(true);
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;

    setLoading(true);
    setError(null);

    try {
      const res = await createList({
        title: title.trim(),
        description: description.trim(),
        isPrivate,
      });

      if (res?.error) {
        setError(res.error);
        setLoading(false);
        return;
      }

      setTitle('');
      setDescription('');
      setIsPrivate(false);
      setIsOpen(false);
      setLoading(false);

      router.refresh();
      if (onSuccess) onSuccess();
    } catch (err) {
      console.error('Error creating list:', err);
      setError('An unexpected error occurred while creating your list.');
      setLoading(false);
    }
  };

  const modalContent = isOpen ? (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-in fade-in duration-150">
      <div className="bg-slate-900 border border-slate-800 w-full max-w-md rounded-2xl p-6 shadow-2xl space-y-5 relative max-h-[85vh] overflow-y-auto">
        {/* Modal Header */}
        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
          <h3 className="text-lg font-extrabold text-white">Create New List</h3>
          <button
            type="button"
            onClick={() => setIsOpen(false)}
            className="text-slate-400 hover:text-white text-lg font-bold p-1"
          >
            ✕
          </button>
        </div>

        {/* Error Banner */}
        {error && (
          <div className="p-3 bg-red-950/60 border border-red-800 rounded-lg text-xs text-red-300 font-medium">
            {error}
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">
              List Title <span className="text-purple-400">*</span>
            </label>
            <input
              type="text"
              required
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Favorite RPGs of All Time"
              className="w-full bg-slate-950 border border-slate-800 text-white px-3.5 py-2 rounded-xl text-xs focus:outline-none focus:border-purple-500 transition"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">
              Description <span className="text-slate-500">(Optional)</span>
            </label>
            <textarea
              rows={3}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Add a brief description for this list..."
              className="w-full bg-slate-950 border border-slate-800 text-white px-3.5 py-2 rounded-xl text-xs focus:outline-none focus:border-purple-500 transition resize-none"
            />
          </div>

          <div className="flex items-center justify-between bg-slate-950 p-3 rounded-xl border border-slate-800/80">
            <div>
              <span className="text-xs font-semibold text-white block">Private List</span>
              <span className="text-[10px] text-slate-400">
                Only you will be able to view this list.
              </span>
            </div>
            <input
              type="checkbox"
              checked={isPrivate}
              onChange={(e) => setIsPrivate(e.target.checked)}
              className="w-4 h-4 accent-purple-600 rounded cursor-pointer"
            />
          </div>

          {/* Modal Actions */}
          <div className="flex items-center justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={() => setIsOpen(false)}
              className="px-4 py-2 text-xs font-semibold text-slate-400 hover:text-white transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading || !title.trim()}
              className="px-5 py-2 bg-purple-600 hover:bg-purple-500 disabled:bg-slate-800 text-white font-bold text-xs rounded-xl shadow-md transition disabled:cursor-not-allowed"
            >
              {loading ? 'Creating...' : 'Create List'}
            </button>
          </div>
        </form>
      </div>
    </div>
  ) : null;

  return (
    <>
      {/* Trigger Button */}
      <button
        type="button"
        onClick={() => setIsOpen(true)}
        className="px-4 py-2 bg-purple-600 hover:bg-purple-500 text-white font-bold text-xs rounded-xl shadow-md transition flex items-center gap-2"
      >
        <span className="text-base leading-none">+</span> Create Custom List
      </button>

      {/* Render via Portal outside parent clipping context */}
      {mounted && modalContent && createPortal(modalContent, document.body)}
    </>
  );
}
