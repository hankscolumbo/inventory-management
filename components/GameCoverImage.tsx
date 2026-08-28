// components/GameCoverImage.tsx
'use client';

import { useState } from 'react';

interface GameCoverImageProps {
  src?: string | null;
  alt: string;
  steamAppId?: number | null;
  className?: string;
}

export default function GameCoverImage({ src, alt, steamAppId, className = '' }: GameCoverImageProps) {
  const [imgSrc, setImgSrc] = useState<string | null>(src || null);
  const [hasError, setHasError] = useState(false);

  const handleError = () => {
    // If 600x900 poster fails, fall back to Steam header banner
    if (steamAppId && imgSrc?.includes('library_600x900')) {
      setImgSrc(`https://cdn.cloudflare.steamstatic.com/steam/apps/${steamAppId}/header.jpg`);
    } else {
      setHasError(true);
    }
  };

  if (hasError || !imgSrc) {
    return (
      <div className={`bg-slate-800 border border-slate-700 flex items-center justify-center p-2 text-center text-[10px] text-slate-400 font-semibold rounded ${className}`}>
        {alt}
      </div>
    );
  }

  return (
    <img
      src={imgSrc}
      alt={alt}
      onError={handleError}
      className={`object-cover ${className}`}
    />
  );
}
