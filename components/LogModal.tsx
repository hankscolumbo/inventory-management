'use client';

import { useState } from 'react';
import { logGame } from '@/app/actions/logGame';
import StarRating from '@/components/StarRating';

interface LogModalProps {
  game: {
    id: number;
    name: string;
    coverUrl?: string | null;
    first_release_date?: number;
  };
  onClose: () => void;
  onSuccess?: () => void;
}

export default function LogModal({ game, onClose, onSuccess }: LogModalProps) {
  if (!game) return null;

  const [rating, setRating] = useState<number>(0);
  const [review, setReview] = useState('');
  const [status, setStatus] = useState<'PLAYED' | 'PLAYING' | 'BACKLOG'>('PLAYED');
  const [loading, setLoading] = useState(false);
  //const [success, setSuccess] = useState(false);
/*
  const coverUrl = game.cover?.url
    ? `https:${game.cover.url.replace('t_thumb', 't_cover_big')}`
    : null;
*/
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
        // call existing logGame server action or API route
        const res = await logGame({
            externalGameId: Number(game.id),
            gameTitle: game.name,
            coverUrl: game.coverUrl ?? undefined,
            rating,
            review,
            status,
        });

        if (res.success) {
            onClose();
        } else {
            alert(res.error || 'Failed to save log');
        }
    } catch (error) {
        console.error('Failed to log game:', error);
        alert('An error occured while saving.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 z-50">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 w-full max-w-md space-y-5 shadow-2xl">
        <div className="flex justify-between items-center border-b border-slate-800 pb-3">
          <h2 className="text-lg font-bold text-white truncate">Log "{game.name}"</h2>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white text-sm"
          >
            ✕
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Status Selector */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
              Status
            </label>
            <div className="grid grid-cols-3 gap-2">
              {(['PLAYED', 'PLAYING', 'BACKLOG'] as const).map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => setStatus(s)}
                  className={`py-2 rounded-lg text-xs font-medium border transition ${
                    status === s
                      ? 'bg-purple-600/20 border-purple-500 text-purple-300'
                      : 'bg-slate-950 border-slate-800 text-slate-400 hover:border-slate-700'
                  }`}
                >
                  {s}
                </button>
              ))}
            </div>
          </div>

          {/* Rating */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
              Rating
            </label>
            <StarRating value={rating} onChange={(val) => setRating(val)} />
          </div>

          {/* Review Textarea */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
              Review (Optional)
            </label>
            <textarea
              placeholder="What did you think of this game?"
              value={review}
              onChange={(e) => setReview(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-purple-500 h-24 resize-none"
            />
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs text-slate-400 hover:text-white transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-5 py-2 bg-purple-600 hover:bg-purple-500 disabled:opacity-50 text-white font-medium text-xs rounded-lg transition"
            >
              {loading ? 'Saving...' : 'Save Log'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}