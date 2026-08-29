// app/list/[id]/EditableListGrid.tsx
'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import GameCardActions from '@/components/GameCardActions';
import AddGamesToListModal from '@/components/AddGamesToListModal';
import { reorderListItems, updateListItemNote, deleteListEntry } from '@/app/actions/listActions';

interface ListItem {
  id: string;
  gameTitle: string;
  coverUrl: string | null;
  igdbId: number | null;
  steamAppId: number | null;
  note: string | null;
  position: number;
  isPlayed: boolean;
}

interface Props {
  listId: string;
  items: ListItem[];
  isOwner: boolean;
  session: any;
  userLists: { id: string; title: string }[];
}

export default function EditableListGrid({
  listId,
  items: initialItems,
  isOwner,
  session,
  userLists,
}: Props) {
  const [items, setItems] = useState<ListItem[]>(initialItems);
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);
  const [editingNoteId, setEditingNoteId] = useState<string | null>(null);
  const [noteText, setNoteText] = useState<string>('');
  const [isSaving, setIsSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  // Sync state whenever server revalidation passes updated initialItems
  useEffect(() => {
    setItems(initialItems);
  }, [initialItems]);

  // Drag and Drop Handlers
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

  const handleDragEnd = async () => {
    setDraggedIndex(null);
    if (!isOwner) return;

    const orderedIds = items.map((item) => item.id);
    await reorderListItems(listId, orderedIds);
  };

  // Note Edit Handlers
  const startEditingNote = (item: ListItem) => {
    setEditingNoteId(item.id);
    setNoteText(item.note || '');
  };

  const saveNote = async (itemId: string) => {
    setIsSaving(true);
    const res = await updateListItemNote(itemId, listId, noteText);
    setIsSaving(false);

    if (res.success) {
      setItems((prev) =>
        prev.map((i) => (i.id === itemId ? { ...i, note: noteText.trim() } : i))
      );
      setEditingNoteId(null);
    }
  };

  // Delete Entry Handler
  const handleDelete = async (entryId: string) => {
    if (!window.confirm('Are you sure you want to remove this item from your list?')) {
      return;
    }

    setDeletingId(entryId);
    const res = await deleteListEntry(entryId, listId);
    setDeletingId(null);

    if (res?.success) {
      setItems((prev) => prev.filter((i) => i.id !== entryId));
    } else {
      alert(res?.error || 'Failed to delete entry.');
    }
  };

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
      {items.map((item, index) => {
        const rank = index + 1;
        const isEditingThisNote = editingNoteId === item.id;

        return (
          <div
            key={item.id}
            draggable={isOwner}
            onDragStart={() => handleDragStart(index)}
            onDragOver={(e) => handleDragOver(e, index)}
            onDragEnd={handleDragEnd}
            className={`relative bg-slate-900 border border-slate-800 rounded-xl overflow-hidden flex flex-col justify-between transition ${
              isOwner ? 'cursor-grab active:cursor-grabbing' : ''
            } ${
              draggedIndex === index
                ? 'opacity-40 border-purple-500 scale-95'
                : 'hover:border-slate-700'
            }`}
          >
            {/* Top Bar: Position Rank (Left), Played Status (Center), Delete Button (Right) */}
            <div className="absolute top-2 left-2 right-2 z-10 flex items-center justify-between pointer-events-none">
              <span className="px-2 py-0.5 bg-slate-950/90 text-purple-300 text-[10px] font-extrabold rounded-md border border-purple-800/80 shadow backdrop-blur-sm pointer-events-auto select-none">
                #{rank}
              </span>

              {session && (
                <div className="absolute left-1/2 -translate-x-1/2 pointer-events-auto">
                  {item.isPlayed ? (
                    <span className="px-2 py-0.5 bg-emerald-500/90 text-white text-[10px] font-bold rounded-full shadow backdrop-blur-sm whitespace-nowrap select-none">
                      ✓ Played
                    </span>
                  ) : (
                    <span className="px-2 py-0.5 bg-slate-950/80 text-slate-400 text-[10px] font-semibold rounded-full border border-slate-700/80 backdrop-blur-sm whitespace-nowrap select-none">
                      Unplayed
                    </span>
                  )}
                </div>
              )}

              {isOwner && (
                <button
                  type="button"
                  disabled={deletingId === item.id}
                  onClick={(e) => {
                    e.stopPropagation();
                    handleDelete(item.id);
                  }}
                  title="Remove from list"
                  aria-label="Remove item"
                  className="pointer-events-auto p-1.5 text-slate-300 hover:text-white bg-slate-950/80 hover:bg-red-950/90 border border-slate-700/60 hover:border-red-600 rounded-lg backdrop-blur-sm transition disabled:opacity-50"
                >
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth="2"
                      d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                    />
                  </svg>
                </button>
              )}
            </div>

            {/* Game Cover */}
            <Link
              href={
                item.igdbId
                  ? `/game/${item.igdbId}`
                  : item.steamAppId
                  ? `/game/steam-${item.steamAppId}`
                  : `/game/${encodeURIComponent(item.gameTitle)}`
              }
              className="aspect-[3/4] bg-slate-950 relative block overflow-hidden group/cover"
            >
              <img
                src={item.coverUrl || '/placeholder.png'}
                alt={item.gameTitle}
                className={`w-full h-full object-cover transition ${
                  item.isPlayed ? 'opacity-100' : 'opacity-75 group-hover/cover:opacity-100'
                }`}
              />
            </Link>

            {/* Game Details, Editable Note & Actions */}
            <div className="p-3 flex-1 flex flex-col justify-between space-y-2">
              <div>
                <h3 className="text-xs font-semibold text-white truncate">{item.gameTitle}</h3>

                {/* Inline Note Editing */}
                {isEditingThisNote ? (
                  <div className="mt-2 space-y-1.5" onClick={(e) => e.stopPropagation()}>
                    <textarea
                      autoFocus
                      value={noteText}
                      onChange={(e) => setNoteText(e.target.value)}
                      onFocus={(e) =>
                        e.currentTarget.setSelectionRange(
                          e.currentTarget.value.length,
                          e.currentTarget.value.length
                        )
                      }
                      placeholder="Add entry note..."
                      className="w-full bg-slate-950 border border-purple-500 rounded-lg p-2 text-[11px] text-slate-200 focus:outline-none resize-none h-16"
                    />
                    <div className="flex items-center justify-end gap-1">
                      <button
                        type="button"
                        onClick={() => setEditingNoteId(null)}
                        className="px-2 py-1 text-[10px] text-slate-400 hover:text-white"
                      >
                        Cancel
                      </button>
                      <button
                        type="button"
                        disabled={isSaving}
                        onClick={() => saveNote(item.id)}
                        className="px-2 py-1 bg-purple-600 hover:bg-purple-500 text-white text-[10px] font-bold rounded"
                      >
                        {isSaving ? '...' : 'Save'}
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="mt-1">
                    {item.note ? (
                      <div
                        onClick={() => isOwner && startEditingNote(item)}
                        className={`bg-slate-950/80 border border-slate-800 p-2 rounded-lg text-[11px] text-slate-300 leading-tight italic ${
                          isOwner ? 'hover:border-purple-500 cursor-pointer' : ''
                        }`}
                        title={isOwner ? 'Click to edit note' : undefined}
                      >
                        "{item.note}"
                      </div>
                    ) : (
                      isOwner && (
                        <button
                          type="button"
                          onClick={() => startEditingNote(item)}
                          className="text-[10px] text-purple-400 hover:text-purple-300 font-medium underline mt-1"
                        >
                          + Add note
                        </button>
                      )
                    )}
                  </div>
                )}
              </div>

              <GameCardActions item={item} userLists={userLists} />
            </div>
          </div>
        );
      })}

      {/* Incorporated "Add Game" Slot for List Owners */}
      {isOwner && (
        <div className="border-2 border-dashed border-slate-800 hover:border-purple-500/60 rounded-xl min-h-[260px] p-4 flex flex-col items-center justify-center text-center transition bg-slate-900/30 hover:bg-slate-900/60">
          <AddGamesToListModal customListId={listId} />
        </div>
      )}
    </div>
  );
}
