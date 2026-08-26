// components/AvatarUpload.tsx
'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { updateAvatar } from '@/app/actions/updateAvatar';

export default function AvatarUpload({ currentImage }: { currentImage?: string | null }) {
  const [preview, setPreview] = useState<string | null>(currentImage || null);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ type: 'error' | 'success'; text: string } | null>(null);
  const router = useRouter();

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Local instant image preview
    setPreview(URL.createObjectURL(file));
    setLoading(true);
    setMessage(null);

    const formData = new FormData();
    formData.append('avatar', file);

    const res = await updateAvatar(formData);

    if (res.success && res.url) {
      setPreview(res.url);
      setMessage({ type: 'success', text: 'Avatar updated!' });
      router.refresh(); // Refresh page to update Navbar avatar
    } else {
      setMessage({ type: 'error', text: res.error || 'Upload failed.' });
    }

    setLoading(false);
  };

  return (
    <div className="flex flex-col items-center gap-4 p-6 bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-sm">
      <div className="relative w-24 h-24 rounded-full overflow-hidden border-2 border-purple-500/50 bg-slate-950 flex items-center justify-center">
        {preview ? (
          <img src={preview} alt="Avatar" className="w-full h-full object-cover" />
        ) : (
          <span className="text-3xl font-bold text-slate-500">?</span>
        )}
        {loading && (
          <div className="absolute inset-0 bg-slate-950/70 flex items-center justify-center text-xs font-semibold text-purple-400">
            Uploading...
          </div>
        )}
      </div>

      <label className="cursor-pointer px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white text-xs font-semibold rounded-xl border border-slate-700 transition">
        Choose New Photo
        <input
          type="file"
          accept="image/*"
          onChange={handleFileChange}
          disabled={loading}
          className="hidden"
        />
      </label>

      {message && (
        <span
          className={`text-xs ${
            message.type === 'success' ? 'text-green-400' : 'text-red-400'
          }`}
        >
          {message.text}
        </span>
      )}
    </div>
  );
}