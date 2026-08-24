// components/CustomListItemsManager.tsx
'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { updateItemPositions, updateListItemNote, removeGameFromList } from '@/app/actions/manageListItems';

export interface ListItemData {
  id: string;
  gameTitle: string;
  coverUrl?: string | null;
  igdbId?: number | null;
  steamAppId?: number | null;
  note?: string | null;
  position: number;
}

interface ManagerProps {
  customListId: string;
  initialItems: ListItemData[];
  isOwner: boolean;
}

export default function CustomListItemsManager({ customListId, initialItems, isOwner }: ManagerProps) {
  const [items, setItems] = useState<ListItemData[]>(initialItems);
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);
  const [editingNoteId, setEditingNoteId] = useState<string | null>(null);
  const [noteText, setNoteText] = useState('');

  useEffect(() => {
    setItems(initialItems);
  }, [initialItems]);

  const handleDragStart = (index: number) => {
    if (!isOwner) return;
    setDraggedIndex(index);
  };

  const handleDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    if (draggedIndex === null || draggedIndex === index) return;

    const updated = [...items];
    const [draggedItem] = updated.splice(draggedIndex, 1);
    if (!draggedItem) return;
    updated.splice(index, 0, draggedItem);

    setDraggedIndex(index);
    setItems(updated);
  };

  const handleDrop = async () => {
    if (!isOwner || draggedIndex === null) return;
    setDraggedIndex(null);

    const reordered = items.map((item, idx) => ({ id: item.id, position: idx }));
    await updateItemPositions(customListId, reordered);
  };

  const handleSaveNote = async (itemId: string) => {
    await updateListItemNote(customListId, itemId, noteText);
    setItems((prev) =>
      prev.map((i) => (i.id === itemId ? { ...i, note: noteText } : i))
    );
    setEditingNoteId(null);
  };

  const handleRemove = async (itemId: string) => {
    setItems((prev) => prev.filter((i) => i.id !== itemId));
    await removeGameFromList(customListId, itemId);
  };

  if (items.length === 0) {
    return (
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-10 text-center text-slate-400 text-sm">
        No games have been added to this list yet.
      </div>
    );
  }

  return (
    <div className="flex flex-col space-y-3">
      {items.map((item, index) => {
        const href = item.igdbId
          ? `/game/${item.igdbId}`
          : item.steamAppId
          ? `/game/${item.steamAppId}?source=steam`
          : '#';

        return (
          <div
            key={item.id}
            draggable={isOwner}
            onDragStart={() => handleDragStart(index)}
            onDragOver={(e) => handleDragOver(e, index)}
            onDrop={handleDrop}
            className={`bg-slate-900 border border-slate-800 rounded-xl p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 transition shadow-md ${
              isOwner ? 'cursor-grab active:cursor-grabbing hover:border-slate-700' : ''
            } ${draggedIndex === index ? 'opacity-40 border-purple-500' : ''}`}
          >
            {/* Left Section: Drag handle, Rank, Cover & Title */}
            <div className="flex items-center gap-4 flex-1 w-full sm:w-auto">
              {isOwner && (
                <span className="text-slate-600 hover:text-slate-400 font-bold text-lg select-none">
                  ⋮⋮
                </span>
              )}

              <span className="text-sm font-extrabold text-purple-400 w-6 text-center">
                #{index + 1}
              </span>

              <Link href={href} className="shrink-0">
                {item.coverUrl ? (
                  <img
                    src={item.coverUrl}
                    alt={item.gameTitle}
                    className="w-12 h-16 object-cover rounded-lg border border-slate-800"
                  />
                ) : (
                  <div className="w-12 h-16 bg-slate-950 rounded-lg flex items-center justify-center text-[10px] text-slate-600">
                    N/A
                  </div>
                )}
              </Link>

              <div className="flex-1 min-w-0 space-y-1">
                <Link href={href} className="text-sm font-bold text-white hover:text-purple-400 truncate block">
                  {item.gameTitle}
                </Link>

                {/* Display or Edit Note */}
                {editingNoteId === item.id ? (
                  <div className="flex items-center gap-2 mt-1">
                    <input
                      type="text"
                      value={noteText}
                      onChange={(e) => setNoteText(e.target.value)}
                      placeholder="Add a note for this game..."
                      className="bg-slate-950 border border-slate-700 text-white text-xs px-2.5 py-1 rounded-lg focus:outline-none focus:border-purple-500 flex-1"
                    />
                    <button
                      type="button"
                      onClick={() => handleSaveNote(item.id)}
                      className="px-2.5 py-1 bg-purple-600 hover:bg-purple-500 text-white text-xs font-bold rounded-lg"
                    >
                      Save
                    </button>
                  </div>
                ) : (
                  <div className="flex items-center gap-2">
                    {item.note ? (
                      <p className="text-xs text-slate-400 italic">"{item.note}"</p>
                    ) : isOwner ? (
                      <button
                        type="button"
                        onClick={() => {
                          setEditingNoteId(item.id);
                          setNoteText(item.note || '');
                        }}
                        className="text-[11px] text-slate-500 hover:text-purple-400 underline"
                      >
                        + Add note
                      </button>
                    ) : null}

                    {item.note && isOwner && (
                      <button
                        type="button"
                        onClick={() => {
                          setEditingNoteId(item.id);
                          setNoteText(item.note || '');
                        }}
                        className="text-[10px] text-purple-400 hover:underline"
                      >
                        Edit
                      </button>
                    )}
                  </div>
                )}
              </div>
            </div>

            {/* Actions */}
            {isOwner && (
              <button
                type="button"
                onClick={() => handleRemove(item.id)}
                className="text-slate-500 hover:text-red-400 text-xs font-bold px-2 py-1 transition self-end sm:self-center"
                title="Remove game"
              >
                ✕
              </button>
            )}
          </div>
        );
      })}
    </div>
  );
}