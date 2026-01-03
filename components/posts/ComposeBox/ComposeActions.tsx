'use client';

import { RefObject } from 'react';
import { Image as ImageIcon } from 'lucide-react';

interface ComposeActionsProps {
  fileInputRef: RefObject<HTMLInputElement | null>;
  onImageSelect: (e: React.ChangeEvent<HTMLInputElement>) => void;
  isLoading: boolean;
  hasImage: boolean;
  contentLength: number;
  remainingChars: number;
  isOverLimit: boolean;
}

/**
 * Action bar with image button and character count
 */
export function ComposeActions({
  fileInputRef,
  onImageSelect,
  isLoading,
  hasImage,
  contentLength,
  remainingChars,
  isOverLimit,
}: ComposeActionsProps) {
  return (
    <div className="flex items-center justify-between mt-4 pt-3 border-t border-gray-200">
      <div className="flex items-center gap-2">
        <input
          ref={fileInputRef}
          type="file"
          accept="image/jpeg,image/png,image/gif,image/webp"
          onChange={onImageSelect}
          className="hidden"
        />
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          disabled={isLoading || hasImage}
          className="w-9 h-9 flex items-center justify-center rounded-full hover:bg-blue-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          aria-label="Add image"
          title="Add image"
        >
          <ImageIcon size={20} className="text-blue-500" />
        </button>
      </div>
      {contentLength > 0 && (
        <span className={`text-sm ${isOverLimit ? 'text-red-500' : 'text-gray-500'}`}>
          {remainingChars}
        </span>
      )}
    </div>
  );
}
