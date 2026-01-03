'use client';

import { useState, useCallback, useEffect, useRef } from 'react';
import imageCompression from 'browser-image-compression';
import { ALLOWED_IMAGE_TYPES, MAX_IMAGE_SIZE, AllowedImageType } from '@/lib/utils/image';
import { componentLogger } from '@/lib/logger';

interface ImageUploadError {
  message: string;
  type: 'validation' | 'compression' | 'upload' | 'timeout';
}

export interface UseImageUploadReturn {
  /** Selected and compressed image file */
  image: File | null;
  /** Blob URL for preview (auto-cleaned on unmount) */
  previewUrl: string | null;
  /** Error state */
  error: ImageUploadError | null;
  /** Select and compress an image file */
  selectImage: (file: File) => Promise<boolean>;
  /** Remove selected image and clean up preview URL */
  removeImage: () => void;
  /** Upload image to R2, returns public URL or null on error */
  uploadImage: () => Promise<string | null>;
  /** Clear error state */
  clearError: () => void;
  /** Reference to file input for programmatic clicks */
  fileInputRef: React.RefObject<HTMLInputElement | null>;
}

const COMPRESSION_OPTIONS = {
  maxSizeMB: 1,
  maxWidthOrHeight: 2048,
  useWebWorker: true,
  initialQuality: 0.85,
};

const PRESIGNED_URL_TIMEOUT = 30000;
const UPLOAD_TIMEOUT = 60000;

export function useImageUpload(): UseImageUploadReturn {
  const [image, setImage] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [error, setError] = useState<ImageUploadError | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // Auto-cleanup preview URL on unmount or when it changes
  useEffect(() => {
    return () => {
      if (previewUrl) {
        URL.revokeObjectURL(previewUrl);
      }
    };
  }, [previewUrl]);

  const clearError = useCallback(() => {
    setError(null);
  }, []);

  const removeImage = useCallback(() => {
    if (previewUrl) {
      URL.revokeObjectURL(previewUrl);
    }
    setImage(null);
    setPreviewUrl(null);
    setError(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  }, [previewUrl]);

  const selectImage = useCallback(
    async (file: File): Promise<boolean> => {
      setError(null);

      // Validate file type
      if (!ALLOWED_IMAGE_TYPES.includes(file.type as AllowedImageType)) {
        setError({
          message: 'Invalid file type. Please select a JPEG, PNG, GIF, or WebP image.',
          type: 'validation',
        });
        return false;
      }

      try {
        const options = {
          ...COMPRESSION_OPTIONS,
          fileType: file.type === 'image/png' ? 'image/png' : 'image/jpeg',
        };

        componentLogger.info(
          {
            originalSize: file.size,
            originalType: file.type,
          },
          'Starting image compression'
        );

        const compressedFile = await imageCompression(file, options);

        componentLogger.info(
          {
            originalSize: file.size,
            compressedSize: compressedFile.size,
            reduction: `${(((file.size - compressedFile.size) / file.size) * 100).toFixed(1)}%`,
          },
          'Image compressed successfully'
        );

        if (compressedFile.size > MAX_IMAGE_SIZE) {
          setError({
            message: 'Image is too large. Try a smaller image.',
            type: 'compression',
          });
          return false;
        }

        // Clean up old preview URL before setting new one
        if (previewUrl) {
          URL.revokeObjectURL(previewUrl);
        }

        setImage(compressedFile);
        const newPreviewUrl = URL.createObjectURL(compressedFile);
        setPreviewUrl(newPreviewUrl);
        return true;
      } catch (err) {
        componentLogger.error({ error: err }, 'Error processing image');
        setError({
          message: 'Failed to process image. Please try again.',
          type: 'compression',
        });
        return false;
      }
    },
    [previewUrl]
  );

  const uploadImage = useCallback(async (): Promise<string | null> => {
    if (!image) {
      return null;
    }

    setError(null);
    const abortController = new AbortController();
    let presignedTimeoutId: ReturnType<typeof setTimeout> | null = null;
    let uploadTimeoutId: ReturnType<typeof setTimeout> | null = null;

    try {
      // Get presigned URL
      presignedTimeoutId = setTimeout(() => abortController.abort(), PRESIGNED_URL_TIMEOUT);

      const presignedResponse = await fetch('/api/upload/presigned-url', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contentType: image.type,
          fileSize: image.size,
        }),
        signal: abortController.signal,
      });

      if (!presignedResponse.ok) {
        throw new Error('Failed to get upload URL');
      }

      const presignedData = await presignedResponse.json();

      if (!presignedData.uploadUrl || !presignedData.publicUrl) {
        throw new Error('Invalid response from upload service');
      }

      const { uploadUrl, publicUrl } = presignedData;

      // Upload to R2
      if (presignedTimeoutId) clearTimeout(presignedTimeoutId);
      uploadTimeoutId = setTimeout(() => abortController.abort(), UPLOAD_TIMEOUT);

      const uploadResponse = await fetch(uploadUrl, {
        method: 'PUT',
        body: image,
        headers: {
          'Content-Type': image.type,
        },
        signal: abortController.signal,
      });

      if (uploadTimeoutId) clearTimeout(uploadTimeoutId);

      if (!uploadResponse.ok) {
        const errorText = await uploadResponse.text().catch(() => 'Unknown error');
        componentLogger.error(
          {
            status: uploadResponse.status,
            statusText: uploadResponse.statusText,
            errorText,
          },
          'R2 upload failed'
        );
        throw new Error(
          `Failed to upload image: ${uploadResponse.status} ${uploadResponse.statusText}`
        );
      }

      // Verify upload (optional, non-blocking)
      try {
        const verifyResponse = await fetch('/api/upload/verify', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            publicUrl,
            expectedSize: image.size,
          }),
        });

        if (verifyResponse.ok) {
          componentLogger.info({ publicUrl }, 'Image uploaded and verified successfully');
        } else {
          componentLogger.warn({ publicUrl }, 'Image uploaded but verification failed');
        }
      } catch (verifyError) {
        componentLogger.warn({ publicUrl, verifyError }, 'Image uploaded but verification skipped');
      }

      return publicUrl;
    } catch (err) {
      if (presignedTimeoutId) clearTimeout(presignedTimeoutId);
      if (uploadTimeoutId) clearTimeout(uploadTimeoutId);

      const errorDetails = {
        message: err instanceof Error ? err.message : 'Unknown error',
        name: err instanceof Error ? err.name : 'Unknown',
      };

      componentLogger.error({ error: errorDetails }, 'Error uploading image');

      const isTimeout = err instanceof Error && err.name === 'AbortError';
      setError({
        message: isTimeout
          ? 'Upload timed out. Please try again.'
          : 'Failed to upload image. Please try again.',
        type: isTimeout ? 'timeout' : 'upload',
      });

      return null;
    }
  }, [image]);

  return {
    image,
    previewUrl,
    error,
    selectImage,
    removeImage,
    uploadImage,
    clearError,
    fileInputRef,
  };
}
