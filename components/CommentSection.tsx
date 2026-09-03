// components/CommentSection.tsx
'use client';

import { useState, useTransition } from 'react';
import Link from 'next/link';
import { addComment, deleteComment, TargetType } from '@/app/actions/social';

interface CommentItem {
  id: string;
  text: string;
  createdAt: Date | string;
  user: {
    id: string;
    username: string | null;
    name: string | null;
    image: string | null;
  };
}

interface CommentSectionProps {
  targetId: string;
  targetType: TargetType;
  comments: CommentItem[];
  currentUserId?: string;
}

export default function CommentSection({
  targetId,
  targetType,
  comments,
  currentUserId,
}: CommentSectionProps) {
  const [text, setText] = useState('');
  const [isPending, startTransition] = useTransition();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!text.trim()) return;

    startTransition(async () => {
      const res = await addComment({ targetId, targetType, text });
      if (res.success) setText('');
    });
  };

  const handleDelete = (commentId: string) => {
    startTransition(async () => {
      await deleteComment(commentId, targetId, targetType);
    });
  };

  return (
    <div className="space-y-6 border-t border-slate-800 pt-6">
      <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">
        Comments ({comments.length})
      </h3>

      {currentUserId ? (
        <form onSubmit={handleSubmit} className="flex gap-3">
          <input
            type="text"
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="Write a comment..."
            maxLength={300}
            className="flex-1 bg-slate-950 border border-slate-800 rounded-xl px-4 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-purple-500 transition"
          />
          <button
            type="submit"
            disabled={isPending || !text.trim()}
            className="px-4 py-2 bg-purple-600 hover:bg-purple-500 disabled:opacity-50 text-white text-xs font-bold rounded-xl transition cursor-pointer"
          >
            Post
          </button>
        </form>
      ) : (
        <p className="text-xs text-slate-500 italic">Sign in to leave a comment.</p>
      )}

      <div className="space-y-3">
        {comments.map((comment) => {
          const name = comment.user.name || comment.user.username || 'User';
          const isAuthor = currentUserId === comment.user.id;

          return (
            <div
              key={comment.id}
              className="bg-slate-950/60 border border-slate-800/80 p-3.5 rounded-xl flex items-start justify-between gap-3"
            >
              <div className="flex items-start gap-3 min-w-0">
                <Link href={comment.user.username ? `/u/${comment.user.username}` : '#'}>
                  {comment.user.image ? (
                    <img
                      src={comment.user.image}
                      alt={name}
                      className="w-7 h-7 rounded-full object-cover shrink-0"
                    />
                  ) : (
                    <div className="w-7 h-7 rounded-full bg-purple-950 text-purple-300 font-bold text-[10px] flex items-center justify-center shrink-0">
                      {name.charAt(0).toUpperCase()}
                    </div>
                  )}
                </Link>

                <div className="space-y-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-slate-200 truncate">{name}</span>
                    <span className="text-[10px] text-slate-500 font-mono">
                      {new Date(comment.createdAt).toLocaleDateString('en-US', {
                        month: 'short',
                        day: 'numeric',
                      })}
                    </span>
                  </div>
                  <p className="text-xs text-slate-300 leading-relaxed break-words">
                    {comment.text}
                  </p>
                </div>
              </div>

              {isAuthor && (
                <button
                  type="button"
                  onClick={() => handleDelete(comment.id)}
                  disabled={isPending}
                  className="text-slate-500 hover:text-rose-400 text-xs font-bold transition p-1 cursor-pointer"
                >
                  ✕
                </button>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
