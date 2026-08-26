// components/EditableAvatar.tsx
'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { updateAvatar } from '@/app/actions/updateAvatar';

interface Props {
  currentImage?: string | null;
  username: string;
  isOwner?: boolean;
}

export default function EditableAvatar({ currentImage, username, isOwner = false }: Props) {
  const [image, setImage] = useState<string | null>(currentImage || null);
  const [uploading, setUploading] = useState(false);
  const router = useRouter();

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Instant local image preview
    setImage(URL.createObjectURL(file));
    setUploading(true);

    const formData = new FormData();
    formData.append('avatar', file);

    const res = await updateAvatar(formData);

    if (res.success && res.url) {
      setImage(res.url);
      router.refresh(); // Refresh page & navbar avatar
    } else {
      alert(res.error || 'Failed to update avatar.');
      setImage(currentImage || null);
    }

    setUploading(false);
  };

  // If viewing someone else's profile, render standard non-clickable avatar
  if (!isOwner) {
    return (
      <div className="w-24 h-24 sm:w-32 sm:h-32 rounded-full overflow-hidden border-2 border-purple-500/50 bg-slate-900 flex items-center justify-center text-3xl font-bold text-white uppercase shadow-lg">
        {image ? (
          <img src={image} alt={username} className="w-full h-full object-cover" />
        ) : (
          username[0] || 'U'
        )}
      </div>
    );
  }

  // Interactive Avatar with Camera Icon Overlay
  return (
    <label className="relative group w-24 h-24 sm:w-32 sm:h-32 rounded-full overflow-hidden border-2 border-purple-500/50 bg-slate-900 flex items-center justify-center cursor-pointer shadow-lg">
      {/* Current Image or Initials */}
      {image ? (
        <img src={image} alt={username} className="w-full h-full object-cover" />
      ) : (
        <span className="text-3xl sm:text-4xl font-bold text-white uppercase">
          {username[0] || 'U'}
        </span>
      )}

      {/* Hover Camera Overlay */}
      <div className="absolute inset-0 bg-slate-950/70 flex flex-col items-center justify-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
        <svg
          xmlns="http://www.w3.org/2000/svg"
          fill="none"
          viewBox="0 0 24 24"
          strokeWidth={1.5}
          stroke="currentColor"
          className="w-6 h-6 text-white"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M6.827 6.175A2.31 2.31 0 015.186 7.23c-.38.054-.757.112-1.134.175C2.999 7.58 2.25 8.507 2.25 9.574V18a2.25 2.25 0 002.25 2.25h15A2.25 2.25 0 0021.75 18V9.574c0-1.067-.75-1.994-1.802-2.169a47.865 47.865 0 00-1.134-.175 2.31 2.31 0 01-1.64-1.055l-.822-1.316a2.192 2.192 0 00-1.736-1.039 48.774 48.774 0 00-5.232 0 2.192 2.192 0 00-1.736 1.039l-.821 1.316z"
          />
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M16.5 12.75a4.5 4.5 0 11-9 0 4.5 4.5 0 019 0z"
          />
        </svg>
        <span className="text-[10px] font-semibold text-slate-200">
          {uploading ? 'Uploading...' : 'Change'}
        </span>
      </div>

      {/* Hidden File Input */}
      <input
        type="file"
        accept="image/*"
        onChange={handleFileChange}
        disabled={uploading}
        className="hidden"
      />
    </label>
  );
}