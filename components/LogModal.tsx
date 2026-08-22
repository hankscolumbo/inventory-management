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
        isSteamApp?: boolean;
    };
    initialLog?: {
        status?: 'PLAYED' | 'PLAYING' | 'WANT TO PLAY' ;
        rating?: number | null;
        playtimeHours?: number | null;
        isOwned?: boolean | null;
    };
    onClose: () => void;
}

export default function LogModal({ game, initialLog, onClose }: LogModalProps) {
    if (!game) return null;
    const [loading, setLoading] = useState(false);
    const [errorMsg, setErrorMsg] = useState<string | null>(null);

    const [rating, setRating] = useState<number | ''>(initialLog?.rating ?? '');
    const [review, setReview] = useState('');
    const [status, setStatus] = useState<'PLAYED' | 'PLAYING' | 'WANT TO PLAY' >(initialLog?.status || 'PLAYED');
    const [isOwned, setIsOwned] = useState<boolean>(initialLog?.isOwned ?? status !== 'WANT TO PLAY');
    const [playtimeHours, setPlaytimeHours] = useState<number | ''>(initialLog?.playtimeHours ?? '');

    const handleStatusChange = (selectedStatus: 'PLAYED' | 'PLAYING' | 'WANT TO PLAY' ) => {
        setStatus(selectedStatus);

        // Automatically uncheck "I own this game" for Wishlist items
        if (selectedStatus === 'WANT TO PLAY') {
            setIsOwned(false);
        } else {
            // Automatically re-check when switching to an owned state like PLAYED, PLAYING, or BACKLOG
            setIsOwned(true);
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

                <form
                    onSubmit={async (e) => {
                        e.preventDefault()
                        setLoading(true);
                        setErrorMsg(null);

                        const numericGameId = Number(game.id);

                        const res = await logGame({
                            gameId: numericGameId,
                            gameTitle: game.name,
                            coverUrl: game.coverUrl,
                            status,
                            rating: rating !== '' ? Number(rating) : null,
                            review,
                            isOwned,
                            isSteamApp: game.isSteamApp ?? false,
                            playtimeHours: playtimeHours !== '' ? Number(playtimeHours) : null,
                        });

                        setLoading(false);

                        if (res.success) {
                            onClose();
                        } else {
                            setErrorMsg(res.error || 'Failed to save log');
                        }
                    }}
                    className="space-y-4"
                >
                    {/* Status Selector */}
                    <div className="space-y-1.5">
                        <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
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

                    {/* Rating */}
                    <div className="space-y-1.5">
                        <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                            Rating
                        </label>
                        <StarRating
                            value={rating !== '' ? Number(rating) : undefined}
                            onChange={(val) => setRating(val)}
                        />
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

                    {/* ✅ "I Own This Game" Checkbox */}
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