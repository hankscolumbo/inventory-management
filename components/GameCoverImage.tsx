
// components/GameCoverImage.tsx
'use client';

import { useState, useEffect } from 'react';

interface GameCoverImageProps {
  src?: string | null;
  alt: string;
  steamAppId?: number | null;
  className?: string;
}

export default function GameCoverImage({
  src,
  alt,
  steamAppId,
  className = '',
}: GameCoverImageProps) {
  const [imgSrc, setImgSrc] = useState<string | null>(src || null);
  const [fallbackStage, setFallbackStage] = useState<number>(0);

  useEffect(() => {
    setImgSrc(src || null);
    setFallbackStage(0);
  }, [src, steamAppId]);

  const handleError = () => {
    if (steamAppId && fallbackStage === 0) {
      // Stage 1: Fall back to Steam Store Header (mandatory on all Steam store entries)
      setFallbackStage(1);
      setImgSrc(
        `https://shared.cloudflare.steamstatic.com/store_item_assets/steam/apps/${steamAppId}/header.jpg`
      );
    } else {
      // Stage 2: Fall back to placeholder state if header also fails
      setFallbackStage(2);
      setImgSrc(null);
    }
  };

  if (!imgSrc || fallbackStage === 2) {
    return (
      <div
        className={`w-full h-full flex flex-col items-center justify-center bg-slate-950 text-slate-500 text-[10px] p-2 text-center border border-slate-800 ${className}`}
      >
        <span className="text-base mb-1">🎮</span>
        <span className="line-clamp-2 font-medium">{alt}</span>
      </div>
    );
  }

  return (
    <img
      src={imgSrc}
      alt={alt}
      onError={handleError}
      className={className}
    />
  );
}

