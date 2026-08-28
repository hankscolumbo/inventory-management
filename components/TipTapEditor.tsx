// components/TipTapEditor.tsx
'use client';

import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Link from '@tiptap/extension-link';

interface TipTapEditorProps {
  content: string;
  onChange: (html: string) => void;
}

export default function TipTapEditor({ content, onChange }: TipTapEditorProps) {
  const editor = useEditor({
    extensions: [
      StarterKit,
      Link.configure({
        openOnClick: false,
        HTMLAttributes: {
          class: 'text-purple-400 underline hover:text-purple-300',
        },
      }),
    ],
    content,
    immediatelyRender: false, // Prevents Next.js SSR hydration mismatches
    onUpdate: ({ editor }) => {
      onChange(editor.getHTML());
    },
    editorProps: {
      attributes: {
        class:
          'prose prose-invert prose-xs max-w-none focus:outline-none min-h-[100px] p-3 text-slate-200 text-xs leading-relaxed',
      },
    },
  });

  if (!editor) return null;

  const setLink = () => {
    const previousUrl = editor.getAttributes('link').href;
    const url = window.prompt('Enter URL:', previousUrl);

    if (url === null) return;
    if (url === '') {
      editor.chain().focus().extendMarkRange('link').unsetLink().run();
      return;
    }

    editor.chain().focus().extendMarkRange('link').setLink({ href: url }).run();
  };

  return (
    <div className="border border-slate-800 rounded-xl bg-slate-950 overflow-hidden focus-within:border-purple-500 transition">
      {/* Formatting Toolbar */}
      <div className="flex flex-wrap items-center gap-1 p-1.5 border-b border-slate-800 bg-slate-900/60">
        <button
          type="button"
          onClick={() => editor.chain().focus().toggleBold().run()}
          className={`px-2 py-1 text-xs font-bold rounded transition ${
            editor.isActive('bold')
              ? 'bg-purple-600 text-white'
              : 'text-slate-400 hover:bg-slate-800 hover:text-slate-200'
          }`}
        >
          B
        </button>
        <button
          type="button"
          onClick={() => editor.chain().focus().toggleItalic().run()}
          className={`px-2 py-1 text-xs italic rounded transition ${
            editor.isActive('italic')
              ? 'bg-purple-600 text-white'
              : 'text-slate-400 hover:bg-slate-800 hover:text-slate-200'
          }`}
        >
          I
        </button>
        <button
          type="button"
          onClick={() => editor.chain().focus().toggleBulletList().run()}
          className={`px-2 py-1 text-xs rounded transition ${
            editor.isActive('bulletList')
              ? 'bg-purple-600 text-white'
              : 'text-slate-400 hover:bg-slate-800 hover:text-slate-200'
          }`}
        >
          • List
        </button>
        <button
          type="button"
          onClick={() => editor.chain().focus().toggleOrderedList().run()}
          className={`px-2 py-1 text-xs rounded transition ${
            editor.isActive('orderedList')
              ? 'bg-purple-600 text-white'
              : 'text-slate-400 hover:bg-slate-800 hover:text-slate-200'
          }`}
        >
          1. List
        </button>
        <button
          type="button"
          onClick={setLink}
          className={`px-2 py-1 text-xs rounded transition ${
            editor.isActive('link')
              ? 'bg-purple-600 text-white'
              : 'text-slate-400 hover:bg-slate-800 hover:text-slate-200'
          }`}
        >
          Link
        </button>
      </div>

      {/* Editor Content Box */}
      <EditorContent editor={editor} />
    </div>
  );
}

