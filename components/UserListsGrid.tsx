// components/UserListsGrid.tsx
'use client';

import Link from 'next/link';

export interface CustomList {
  id: string;
  title: string;
  description?: string | null;
  isPrivate: boolean;
  createdAt: Date;
  updatedAt: Date;
  _count?: {
    items?: number;
    listItems?: number;
  };
}

interface UserListsGridProps {
  lists: CustomList[];
  isOwner?: boolean;
}

export default function UserListsGrid({ lists, isOwner }: UserListsGridProps) {
  if (!lists || lists.length === 0) {
    return (
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-8 text-center text-slate-400 text-sm">
        {isOwner ? "You haven't created any custom lists yet." : "This user hasn't created any public lists."}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
      {lists.map((list) => {
        const itemQuantity = list._count?.items ?? list._count?.listItems ?? 0;

        return (
          <Link
            key={list.id}
            href={`/lists/${list.id}`}
            className="group bg-slate-900 border border-slate-800 rounded-2xl p-5 hover:border-purple-500 transition shadow-md flex flex-col justify-between space-y-4"
          >
            <div className="space-y-2">
              <div className="flex items-start justify-between gap-2">
                <h3 className="text-base font-bold text-white group-hover:text-purple-400 transition line-clamp-1">
                  {list.title}
                </h3>
                {list.isPrivate && (
                  <span className="shrink-0 text-[10px] uppercase font-bold px-2 py-0.5 bg-amber-950/80 border border-amber-800 text-amber-400 rounded-md">
                    Private
                  </span>
                )}
              </div>

              {list.description ? (
                <p className="text-xs text-slate-400 line-clamp-2 leading-relaxed">
                  {list.description}
                </p>
              ) : (
                <p className="text-xs text-slate-600 italic">No description provided.</p>
              )}
            </div>

            <div className="flex items-center justify-between text-[11px] font-semibold text-slate-500 border-t border-slate-800/80 pt-3">
              <span>{itemQuantity} {itemQuantity === 1 ? 'game' : 'games'}</span>
              <span className="text-purple-400 group-hover:translate-x-1 transition duration-200">
                View List →
              </span>
            </div>
          </Link>
        );
      })}
    </div>
  );
}