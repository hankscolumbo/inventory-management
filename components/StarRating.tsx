// components/StarRating.tsx
'use client';

import { useState } from 'react';

interface StarRatingProps {
  value?: number; // Selected value (e.g., 3.5)
  onChange?: (rating: number) => void; // Callback when user clicks
  readOnly?: boolean; // Set to true for static display
  maxStars?: number; // Defaults to 5
}

export default function StarRating({
  value = 0,
  onChange,
  readOnly = false,
  maxStars = 5,
}: StarRatingProps) {
  const [hoverValue, setHoverValue] = useState<number | null>(null);

  const displayValue = hoverValue !== null ? hoverValue : value;

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>, starIndex: number) => {
    if (readOnly) return;

    const rect = e.currentTarget.getBoundingClientRect();
    const width = rect.width;
    const mouseX = e.clientX - rect.left;

    // Left half of star = 0.5 rating, Right half = 1.0 rating
    const isHalf = mouseX < width / 2;
    const calculatedValue = isHalf ? starIndex + 0.5 : starIndex + 1;

    setHoverValue(calculatedValue);
  };

  const handleClick = () => {
    if (readOnly || !onChange || hoverValue === null) return;
    onChange(hoverValue);
  };

  return (
    <div
      className={`flex items-center gap-1 ${readOnly ? 'cursor-default' : 'cursor-pointer'}`}
      onMouseLeave={() => !readOnly && setHoverValue(null)}
    >
      {Array.from({ length: maxStars }).map((_, index) => {
        const starNumber = index + 1;
        const isFull = displayValue >= starNumber;
        const isHalf = displayValue >= index + 0.5 && displayValue < starNumber;

        return (
          <div
            key={index}
            className="relative w-6 h-6 select-none transition-transform active:scale-110"
            onMouseMove={(e) => handleMouseMove(e, index)}
            onClick={handleClick}
          >
            <svg
              viewBox="0 0 24 24"
              className="w-full h-full"
              fill={isFull ? '#f59e0b' : 'none'}
              stroke={isFull || isHalf ? '#f59e0b' : '#475569'}
              strokeWidth="1.5"
            >
              {isHalf && (
                <defs>
                  <linearGradient id={`half-star-${index}`}>
                    <stop offset="50%" stopColor="#f59e0b" />
                    <stop offset="50%" stopColor="transparent" />
                  </linearGradient>
                </defs>
              )}
              <path
                fill={isHalf ? `url(#half-star-${index})` : undefined}
                d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"
              />
            </svg>
          </div>
        );
      })}

      {/* Numeric Score Label */}
      {!readOnly && (
        <span className="ml-2 text-sm font-semibold text-amber-400 min-w-[2rem]">
          {displayValue > 0 ? displayValue.toFixed(1) : '0.0'}
        </span>
      )}
    </div>
  );
}