'use client';

import { useState } from 'react';
import Image from 'next/image';
import { User } from 'lucide-react';

interface AvatarProps {
  src?: string;
  alt: string;
  size?: 'small' | 'medium' | 'large' | 'xl';
  className?: string;
}

const sizeClasses = {
  small: 'w-8 h-8',
  medium: 'w-9 h-9',
  large: 'w-12 h-12',
  xl: 'w-16 h-16',
};

const imageSizes = { small: 32, medium: 36, large: 48, xl: 64 };
const iconSizes = { small: 16, medium: 18, large: 24, xl: 32 };

export default function Avatar({ src, alt, size = 'medium', className = '' }: AvatarProps) {
  const [isLoaded, setIsLoaded] = useState(false);
  const [hasError, setHasError] = useState(false);

  if (!src?.trim() || hasError) {
    return (
      <div
        className={`rounded-full bg-gray-200 flex items-center justify-center ${sizeClasses[size]} ${className}`}
      >
        <User size={iconSizes[size]} className="text-gray-500" />
      </div>
    );
  }

  return (
    <div className={`relative ${sizeClasses[size]} ${className}`}>
      {!isLoaded && <div className="absolute inset-0 rounded-full bg-gray-200 animate-pulse" />}
      <Image
        src={src}
        alt={alt}
        width={imageSizes[size]}
        height={imageSizes[size]}
        className={`rounded-full object-cover w-full h-full transition-opacity duration-200 ${
          isLoaded ? 'opacity-100' : 'opacity-0'
        }`}
        onLoad={() => setIsLoaded(true)}
        onError={() => setHasError(true)}
      />
    </div>
  );
}
