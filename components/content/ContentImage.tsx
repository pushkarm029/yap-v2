'use client';

import { useState } from 'react';
import Image from 'next/image';
import { ImageOff } from 'lucide-react';

interface ContentImageProps {
  imageUrl: string;
  /** Alt text is required for accessibility. Use empty string ("") for decorative images. */
  alt: string;
  className?: string;
  maxHeight?: string;
  /** Set to true for above-the-fold images to prioritize loading */
  priority?: boolean;
}

export default function ContentImage({
  imageUrl,
  alt,
  className = '',
  maxHeight = '500px',
  priority = false,
}: ContentImageProps) {
  const [isLoaded, setIsLoaded] = useState(false);
  const [hasError, setHasError] = useState(false);

  if (hasError) {
    return (
      <div
        className={`mt-3 rounded-2xl border border-gray-200 bg-gray-50 flex items-center justify-center ${className}`}
        style={{ minHeight: '120px' }}
      >
        <div className="flex flex-col items-center gap-2 text-gray-400">
          <ImageOff size={24} />
          <span className="text-sm">Failed to load image</span>
        </div>
      </div>
    );
  }

  return (
    <div
      className={`mt-3 rounded-2xl overflow-hidden border border-gray-200 w-full relative ${className}`}
    >
      {!isLoaded && <div className="absolute inset-0 bg-gray-100 animate-pulse min-h-[200px]" />}
      <Image
        src={imageUrl}
        alt={alt}
        width={800}
        height={600}
        className={`w-full h-auto object-contain block transition-opacity duration-200 ${
          isLoaded ? 'opacity-100' : 'opacity-0'
        }`}
        style={{ maxHeight }}
        sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
        priority={priority}
        onLoad={() => setIsLoaded(true)}
        onError={() => setHasError(true)}
      />
    </div>
  );
}
