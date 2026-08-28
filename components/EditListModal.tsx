// components/EditListModal.tsx
'use client';

import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { updateListDetails } from '@/app/actions/listActions';
import TipTapEditor from './TipTapEditor';

interface EditListModalProps {
  listId: string;
  initialTitle: string;
  initialDescription: string;
}

export default function EditListModal({
  listId,
  initialTitle,
  initialDescription,
}: EditListModalProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [title, setTitle] = useState(initialTitle);
  const [description, setDescription] = useState(initialDescription);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  // React 19 SubmitEvent typing for onSubmit handlers
  const handleSubmit = async (e: React.SubmitEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!title.trim()) {
      setError('Title is required');
      return;
    }

    setIsSubmitting(true);
    setError('');

    const res = await updateListDetails(listId, title, description);
    setIsSubmitting(false);

    if (res.success) {
      setIsOpen(false);
    } else {
      setError(res.error || 'Something went wrong');
    }
  };

  const modalMarkup = (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/75 backdrop-blur-md p-4">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 w-full max-w-md shadow-2xl relative z-[101]">
        <h2 className="text-lg font-bold text-white mb-4">Edit List Details</h2>

        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <div className="p-2.5 bg-red-950/60 border border-red-800 text-red-300 text-xs rounded-lg">
              {error}
            </div>
          )}

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">
              List Title
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Favorite RPGs of All Time"
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-purple-500"
              required
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">
              Description <span className="text-slate-500 font-normal">(Optional)</span>
            </label>
            <TipTapEditor
              content={description}
              onChange={setDescription}
            />
          </div>

          <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-800">
            <button
              type="button"
              onClick={() => setIsOpen(false)}
              className="px-4 py-2 text-xs text-slate-400 hover:text-white transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-4 py-2 bg-purple-600 hover:bg-purple-500 text-white text-xs font-bold rounded-xl transition disabled:opacity-50"
            >
              {isSubmitting ? 'Saving...' : 'Save Changes'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );

  return (
    <>
      <button
        type="button"
        onClick={() => setIsOpen(true)}
        title="Edit list details"
        aria-label="Edit list details"
        className="p-1.5 text-slate-400 hover:text-white bg-slate-950/60 hover:bg-slate-800 border border-slate-800 hover:border-slate-700 rounded-lg transition"
      >
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth="2"
            d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z"
          />
        </svg>
      </button>

      {mounted && isOpen && createPortal(modalMarkup, document.body)}
    </>
  );
}


