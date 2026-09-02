// components/LogModal.tsx
'use client';

import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useRouter } from 'next/navigation';
import { logGame, deleteGameLog } from '@/app/actions/logGame';
import StarRating from '@/components/StarRating';
import { SUBSTATUS_OPTIONS } from '@/lib/constants';

const AVAILABLE_PLATFORMS = [
  'PC',
  'Steam Deck',
  'Playstation 5',
  'Playstation Portal',
  'Playstation 4',
  //'Playstation 3',
  //'Playstation 2',
  //'Playstation',
  'Xbox Series X/S',
  //'Xbox One',
  //'Xbox 360',
  //'XBOX',
  'Nintendo Switch 2',
  'Nintendo Switch',
  //'Wii U',
  //'Wii',
  //'N64',
  //'Super Nintendo / Famicom',
  //'Nintendo Entertainment System',
  'Nintendo 2DS / 3DS',
  'Nintendo DS / DSi',
  //'Playstation Vita',
  //'PSP',
  //'Sega Genesis',
  //'Game Gear',
  'VR',
  'Mobile',
  //'Analogue Pocket',
  'Playdate',
];

interface LogModalProps {
  game: {
    id: number;
    name: string;
    coverUrl?: string | null;
    first_release_date?: number;
    isSteamApp?: boolean;
  };
  initialLog?: {
    id?: string,
    status?: 'PLAYED' | 'PLAYING' | 'WANT TO PLAY';
    substatus?: string | null;
    rating?: number | null;
    playtimeHours?: number | null;
    platforms?: string[];
    isOwned?: boolean | null;
    review?: string | null;
    playedOn?: Date | string | null;
  };
  onClose: () => void;
}

function formatDateForInput(date?: Date | string | null): string {
  if (!date) return '';
  const d = new Date(date);
  return isNaN(d.getTime()) ? '' : d.toISOString().slice(0, 10);
}

export default function LogModal({ game, initialLog, onClose }: LogModalProps) {
  if (!game) return null;

  const [mounted, setMounted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Initialize state with initialLog defaults
  const [rating, setRating] = useState<number | ''>(initialLog?.rating ?? '');
  const [review, setReview] = useState<string>(initialLog?.review ?? '');
  const [status, setStatus] = useState<'PLAYED' | 'PLAYING' | 'WANT TO PLAY'>(
    initialLog?.status as any || 'PLAYED'
  );
  const [substatus, setSubstatus] = useState<string | null>(initialLog?.substatus || null);
  const [isOwned, setIsOwned] = useState<boolean>(
    initialLog?.isOwned ?? (initialLog?.status ? initialLog.status !== 'WANT TO PLAY' : true)
  );
  const [playtimeHours, setPlaytimeHours] = useState<number | ''>(
    initialLog?.playtimeHours ?? ''
  );
  const [selectedPlatforms, setSelectedPlatforms] = useState<string[]>(
    initialLog?.platforms || []
  );
  const [playedOn, setPlayedOn] = useState<string>(
    formatDateForInput(initialLog?.playedOn)
  );

  const router = useRouter();

  useEffect(() => {
    setMounted(true);
  }, []);

  // Sync state whenever initialLog updates or component receives new log data
  useEffect(() => {
    if (initialLog) {
      setRating(initialLog.rating ?? '');
      setReview(initialLog.review ?? '');
      if (initialLog.status) {
        setStatus(initialLog.status as any);
      }
      setSubstatus(initialLog.substatus ?? null);
      setIsOwned(
        initialLog.isOwned ?? (initialLog.status ? initialLog.status !== 'WANT TO PLAY' : true)
      );
      setPlaytimeHours(initialLog.playtimeHours ?? '');
      setSelectedPlatforms(initialLog.platforms || []);
    }
  }, [initialLog]);

  const normalizedStatusKey = (status || '').toUpperCase().trim();
  const currentSubstatusOptions = SUBSTATUS_OPTIONS[normalizedStatusKey] || SUBSTATUS_OPTIONS[status] || [];

  const handleStatusChange = (selectedStatus: 'PLAYED' | 'PLAYING' | 'WANT TO PLAY') => {
    setStatus(selectedStatus);
    const validSubstatuses = SUBSTATUS_OPTIONS[selectedStatus] || [];

    if (substatus && !validSubstatuses.includes(substatus)) {
      setSubstatus(null);
    }

    if (selectedStatus === 'WANT TO PLAY') {
      setIsOwned(false);
    } else {
      setIsOwned(true);
    }
  };

  const togglePlatform = (platform: string) => {
    setSelectedPlatforms((prev) =>
      prev.includes(platform) ? prev.filter((p) => p !== platform) : [...prev, platform]
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setErrorMsg(null);

    const numericGameId = Number(game.id);

    const playedOnDate = playedOn && playedOn.trim() !== '' ? new Date(playedOn) : null;

    const res = await logGame({
      logId: initialLog?.id,
      gameId: numericGameId,
      gameTitle: game.name,
      coverUrl: game.coverUrl,
      status,
      substatus,
      rating: rating !== '' ? Number(rating) : null,
      review,
      isOwned,
      isSteamApp: game.isSteamApp ?? false,
      playtimeHours: playtimeHours !== '' ? Number(playtimeHours) : null,
      platforms: selectedPlatforms,
      playedOn: playedOnDate,
    });

    setLoading(false);

    if (res.success) {
      router.refresh();
      onClose();
    } else {
      setErrorMsg(res.error || 'Failed to save log');
    }
  };

  const handleDelete = async () => {
    if (!window.confirm(`Are you sure you want to remove your log for "${game.name}"?`)) {
      return;
    }

    setIsDeleting(true);
    setErrorMsg(null);

    const numericGameId = Number(game.id);
    const res = await deleteGameLog(numericGameId);

    setIsDeleting(false);

    if (res.success) {
      router.refresh();
      onClose();
    } else {
      setErrorMsg(res.error || 'Failed to delete log');
    }
  };

  const modalContent = (
    <div className="fixed inset-0 z-[9999] bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 w-full max-w-lg space-y-5 shadow-2xl max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex justify-between items-center border-b border-slate-800 pb-3">
          <h2 className="text-md font-bold text-white truncate">
            {initialLog ? `Edit Log for "${game.name}"` : `Log "${game.name}"`}
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="text-slate-400 hover:text-white text-sm font-bold p-1"
          >
            ✕
          </button>
        </div>

        {errorMsg && (
          <div className="p-3 bg-red-950/60 border border-red-800 rounded-lg text-xs text-red-300 font-medium">
            {errorMsg}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-3">
            {/* Primary Status Selector */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider block">
                Status
              </label>
              <div className="grid grid-cols-3 gap-2">
                {(['PLAYED', 'PLAYING', 'WANT TO PLAY'] as const).map((s) => (
                  <button
                    key={s}
                    type="button"
                    onClick={() => handleStatusChange(s)}
                    className={`py-2 rounded-lg text-xs font-medium border transition ${status === s
                        ? 'bg-purple-600/20 border-purple-500 text-purple-300'
                        : 'bg-slate-950 border-slate-800 text-slate-400 hover:border-slate-700'
                      }`}
                  >
                    {s}
                  </button>
                ))}
              </div>
            </div>

            {/* Dependent Substatus Selector */}
            {currentSubstatusOptions.length > 0 && (
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider block">
                  Substatus
                </label>
                <div className="flex flex-wrap gap-1.5">
                  {currentSubstatusOptions.map((sub) => {
                    const isSelected = substatus?.trim().toUpperCase() === sub.trim().toUpperCase();
                    return (
                      <button
                        key={sub}
                        type="button"
                        onClick={() => setSubstatus(isSelected ? null : sub)}
                        className={`px-2.5 py-1 rounded-lg text-[11px] font-medium border transition ${isSelected
                            ? 'bg-purple-600 border-purple-500 text-white'
                            : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-white hover:border-slate-700'
                          }`}
                      >
                        {isSelected ? `✓ ${sub}` : sub}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
          </div>

          {/* Rating, Playtime Hours, and Last Played Date */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider block">
                Rating
              </label>
              <StarRating
                value={rating !== '' ? Number(rating) : undefined}
                onChange={(val) => setRating(val)}
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider block">
                Playtime (Hours)
              </label>
              <input
                type="number"
                min="0"
                step="0.1"
                placeholder="e.g. 12.5"
                value={playtimeHours}
                onChange={(e) =>
                  setPlaytimeHours(e.target.value === '' ? '' : Number(e.target.value))
                }
                className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-purple-500"
              />
            </div>

            {/* 🔽 Date Last Played Field */} 
            <div> 
              <label className="text-xs font-bold text-slate-400 uppercase tracking-wider block mb-1"> 
                Date Last Played 
                </label> 
              <input 
                type="date" 
                value={playedOn} 
                onChange={(e) => setPlayedOn(e.target.value)} 
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-purple-500 color-scheme-dark" 
                /> 
            </div>
          </div>

          {/* Platforms Multi-Select */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider block">
              Platform(s) Played On
            </label>
            <div className="max-h-36 overflow-y-auto p-2 bg-slate-950 border border-slate-800 rounded-xl flex flex-wrap gap-1.5">
              {AVAILABLE_PLATFORMS.map((platform) => {
                const isSelected = selectedPlatforms.includes(platform);
                return (
                  <button
                    key={platform}
                    type="button"
                    onClick={() => togglePlatform(platform)}
                    className={`px-2.5 py-1 rounded-lg text-[11px] font-medium transition border ${isSelected
                        ? 'bg-purple-600 border-purple-500 text-white shadow-sm'
                        : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-white hover:border-slate-700'
                      }`}
                  >
                    {isSelected ? `✓ ${platform}` : `+ ${platform}`}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Review Textarea */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider block">
              Review
            </label>
            <textarea
              placeholder="What did you think of this game?"
              value={review}
              onChange={(e) => setReview(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-purple-500 h-20 resize-none"
            />
          </div>

          {/* "I Own This Game" Checkbox */}
          <div className="flex items-center gap-3 pt-1">
            <input
              type="checkbox"
              id="isOwnedCheckbox"
              checked={isOwned}
              onChange={(e) => setIsOwned(e.target.checked)}
              className="w-4 h-4 rounded bg-slate-950 border-slate-800 text-purple-600 focus:ring-purple-500 accent-purple-600 cursor-pointer"
            />
            <label
              htmlFor="isOwnedCheckbox"
              className="text-xs font-medium text-slate-300 cursor-pointer select-none"
            >
              I own a copy of this game
            </label>
          </div>

          {/* Actions Bar */}
          <div className="flex items-center justify-between pt-2 border-t border-slate-800/80">
            <div>
              {initialLog && (
                <button
                  type="button"
                  disabled={isDeleting || loading}
                  onClick={handleDelete}
                  className="px-3 py-2 text-xs font-semibold text-rose-400 hover:text-rose-300 bg-rose-950/30 hover:bg-rose-950/60 border border-rose-900/50 rounded-lg transition disabled:opacity-50"
                >
                  {isDeleting ? 'Deleting...' : 'Delete Log'}
                </button>
              )}
            </div>

            <div className="flex gap-2">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-xs text-slate-400 hover:text-white transition"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={loading || isDeleting}
                className="px-5 py-2 bg-purple-600 hover:bg-purple-500 disabled:opacity-50 text-white font-medium text-xs rounded-lg transition"
              >
                {loading ? 'Saving...' : 'Save Log'}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );

  return mounted ? createPortal(modalContent, document.body) : null;
}