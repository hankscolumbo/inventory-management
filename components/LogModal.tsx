'use client';

import { useState } from 'react';
import { logGame } from '@/app/actions/logGame';

interface IGDBGame {
  id: number;
  name: string;
  cover?: {
    url: string;
  };
  first_release_date?: number;
}

interface LogModalProps {
  game: IGDBGame | null;
  onClose: () => void;
}

export default function LogModal({ game, onClose }: LogModalProps) {
  if (!game) return null;

  const [rating, setRating] = useState<number>(4);
  const [review, setReview] = useState('');
  const [status, setStatus] = useState('PLAYED');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  const coverUrl = game.cover?.url
    ? `https:${game.cover.url.replace('t_thumb', 't_cover_big')}`
    : null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      await logGame({
        externalGameId: game.id,
        gameTitle: game.name,
        coverUrl: coverUrl || undefined,
        rating,
        review,
        status,
      });

      setSuccess(true);
      setTimeout(() => {
        setSuccess(false);
        onClose();
      }, 1200);
    } catch (err) {
      console.error('Failed to log game:', err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in">
      {/* Modal Container */}
      <div className="relative w-full max-w-xl bg-slate-900 border border-slate-700/80 rounded-xl shadow-2xl overflow-hidden">
        
        {/* Header & Close Button */}
        <div className="flex justify-between items-center p-4 border-b border-slate-800">
          <h2 className="text-lg font-bold text-white">Log Game</h2>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white text-xl font-bold p-1 rounded hover:bg-slate-800"
          >
            ✕
          </button>
        </div>

        {/* Modal Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          <div className="flex gap-4 items-start">
            {/* Game Cover Preview */}
            <div className="w-24 h-32 flex-shrink-0 bg-slate-800 rounded-md overflow-hidden border border-slate-700">
              {coverUrl ? (
                <img src={coverUrl} alt={game.name} className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-xs text-slate-500">
                  No Cover
                </div>
              )}
            </div>

            {/* Title & Metadata */}
            <div className="flex-1">
              <h3 className="text-xl font-bold text-white">{game.name}</h3>
              {game.first_release_date && (
                <p className="text-sm text-slate-400 mt-1">
                  {new Date(game.first_release_date * 1000).getFullYear()}
                </p>
              )}

              {/* Status Dropdown */}
              <div className="mt-4">
                <label className="block text-xs font-semibold text-slate-400 uppercase mb-1">
                  Status
                </label>
                <select
                  value={status}
                  onChange={(e) => setStatus(e.target.value)}
                  className="w-full bg-slate-800 border border-slate-700 text-white rounded-md px-3 py-1.5 text-sm focus:ring-2 focus:ring-indigo-500"
                >
                  <option value="PLAYED">Played</option>
                  <option value="PLAYING">Currently Playing</option>
                  <option value="BACKLOG">Backlog / Want to Play</option>
                  <option value="ABANDONED">Abandoned</option>
                </select>
              </div>
            </div>
          </div>

          {/* Star Rating Picker */}
          <div>
            <label className="block text-xs font-semibold text-slate-400 uppercase mb-2">
              Rating ({rating} / 5 Stars)
            </label>
            <div className="flex gap-2">
              {[1, 2, 3, 4, 5].map((star) => (
                <button
                  type="button"
                  key={star}
                  onClick={() => setRating(star)}
                  className={`text-2xl transition ${
                    star <= rating ? 'text-amber-400 scale-110' : 'text-slate-600'
                  }`}
                >
                  ★
                </button>
              ))}
            </div>
          </div>

          {/* Review Input */}
          <div>
            <label className="block text-xs font-semibold text-slate-400 uppercase mb-1">
              Review / Thoughts
            </label>
            <textarea
              rows={4}
              value={review}
              onChange={(e) => setReview(e.target.value)}
              placeholder="Add your review or notes..."
              className="w-full bg-slate-800 border border-slate-700 text-white rounded-md p-3 text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none"
            />
          </div>

          {/* Action Buttons */}
          <div className="flex justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm text-slate-300 hover:text-white transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading || success}
              className="bg-indigo-600 hover:bg-indigo-500 text-white font-medium text-sm px-6 py-2 rounded-md transition disabled:opacity-50"
            >
              {success ? 'Saved! ✓' : loading ? 'Saving...' : 'Save Log'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}