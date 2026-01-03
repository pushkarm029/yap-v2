'use client';

import Image from 'next/image';
import { X } from 'lucide-react';

interface ImagePreviewProps {
  previewUrl: string;
  onRemove: () => void;
}

/**
 * Image preview with remove button
 */
export function ImagePreview({ previewUrl, onRemove }: ImagePreviewProps) {
  return (
    <div className="mt-3 relative rounded-2xl overflow-hidden border border-gray-200 w-full max-w-full min-w-0">
      <Image
        src={previewUrl}
        alt="Selected image preview"
        width={800}
        height={600}
        className="w-full h-auto max-h-96 object-contain max-w-full block"
        sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
      />
      <button
        type="button"
        onClick={onRemove}
        className="absolute top-2 right-2 w-8 h-8 bg-black/60 hover:bg-black/80 rounded-full flex items-center justify-center transition-colors"
        aria-label="Remove image"
      >
        <X size={16} className="text-white" />
      </button>
    </div>
  );
}
