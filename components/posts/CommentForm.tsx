'use client';

import { useState, useEffect, useRef } from 'react';
import Image from 'next/image';
import { X, Image as ImageIcon } from 'lucide-react';
import imageCompression from 'browser-image-compression';
import { APP_CONFIG } from '@/constants';
import { componentLogger } from '@/lib/logger';
import Avatar from '../ui/Avatar';
import { ALLOWED_IMAGE_TYPES, MAX_IMAGE_SIZE, AllowedImageType } from '@/lib/utils/image';
import { useLimitsQuery, useCreateComment, InviteRequiredError } from '@/hooks/queries';
import { useUIStore } from '@/stores/uiStore';

interface CommentFormProps {
  postId: string;
  parentCommentId?: string | null;
  userAvatar?: string;
  onCommentPosted: () => void;
}

export default function CommentForm({
  postId,
  parentCommentId: _parentCommentId,
  userAvatar,
  onCommentPosted,
}: CommentFormProps) {
  // TanStack Query for limits and mutations
  const { data: limitsData } = useLimitsQuery();
  const createCommentMutation = useCreateComment();
  const openInviteModal = useUIStore((state) => state.openInviteModal);

  const [content, setContent] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [selectedImage, setSelectedImage] = useState<File | null>(null);
  const [imagePreviewUrl, setImagePreviewUrl] = useState<string | null>(null);
  const [isUploadingImage, setIsUploadingImage] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Derive states from mutation and local state
  const remainingLimit = limitsData?.total?.remaining ?? null;
  const isSubmitting = createCommentMutation.isPending || isUploadingImage;

  useEffect(() => {
    return () => {
      if (imagePreviewUrl) {
        URL.revokeObjectURL(imagePreviewUrl);
      }
    };
  }, [imagePreviewUrl]);

  const handleImageSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!ALLOWED_IMAGE_TYPES.includes(file.type as AllowedImageType)) {
      setError('Invalid file type. Please select a JPEG, PNG, GIF, or WebP image.');
      return;
    }

    try {
      let fileType: string;
      if (file.type === 'image/png') {
        fileType = 'image/png';
      } else if (file.type === 'image/webp') {
        fileType = 'image/webp';
      } else {
        fileType = 'image/jpeg';
        if (file.type === 'image/gif') {
          setError('GIF images will be converted to JPEG (animation and transparency may be lost)');
        }
      }

      const options = {
        maxSizeMB: 1,
        maxWidthOrHeight: 2048,
        useWebWorker: true,
        fileType,
        initialQuality: 0.85,
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
        setError('Image is too large. Try a smaller image.');
        return;
      }

      setSelectedImage(compressedFile);
      const previewUrl = URL.createObjectURL(compressedFile);
      setImagePreviewUrl(previewUrl);
    } catch (error) {
      componentLogger.error({ error }, 'Error processing image');
      setError('Failed to process image. Please try again.');
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleImageRemove = () => {
    if (imagePreviewUrl) {
      URL.revokeObjectURL(imagePreviewUrl);
    }
    setSelectedImage(null);
    setImagePreviewUrl(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const trimmedContent = content.trim();
    if (!trimmedContent) {
      setError('Comment cannot be empty');
      return;
    }

    if (trimmedContent.length > APP_CONFIG.TWEET_MAX_LENGTH) {
      setError(`Comment must be ${APP_CONFIG.TWEET_MAX_LENGTH} characters or less`);
      return;
    }

    setError(null);

    try {
      let imageUrl: string | null = null;

      // Handle image upload first (before mutation)
      if (selectedImage) {
        setIsUploadingImage(true);
        const abortController = new AbortController();
        let timeoutId: ReturnType<typeof setTimeout> | null = null;
        let uploadTimeoutId: ReturnType<typeof setTimeout> | null = null;

        try {
          timeoutId = setTimeout(() => abortController.abort(), 30000);

          const presignedResponse = await fetch('/api/upload/presigned-url', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              contentType: selectedImage.type,
              fileSize: selectedImage.size,
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

          if (timeoutId) clearTimeout(timeoutId);
          uploadTimeoutId = setTimeout(() => abortController.abort(), 60000);

          const uploadResponse = await fetch(uploadUrl, {
            method: 'PUT',
            body: selectedImage,
            headers: {
              'Content-Type': selectedImage.type,
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

          try {
            const verifyResponse = await fetch('/api/upload/verify', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                publicUrl,
                expectedSize: selectedImage.size,
              }),
            });

            if (verifyResponse.ok) {
              componentLogger.info({ publicUrl }, 'Image uploaded and verified successfully');
            } else {
              componentLogger.warn({ publicUrl }, 'Image uploaded but verification failed');
            }
          } catch (verifyError) {
            componentLogger.warn(
              { publicUrl, verifyError },
              'Image uploaded but verification skipped'
            );
          }

          imageUrl = publicUrl;
        } catch (error) {
          if (timeoutId) clearTimeout(timeoutId);
          if (uploadTimeoutId) clearTimeout(uploadTimeoutId);

          componentLogger.error(
            {
              error,
              message: error instanceof Error ? error.message : String(error),
              name: error instanceof Error ? error.name : 'Unknown',
            },
            'Error uploading image'
          );

          handleImageRemove();

          const errorMessage =
            error instanceof Error && error.name === 'AbortError'
              ? 'Upload timed out. Please try again.'
              : 'Failed to upload image. Please try again.';

          setError(errorMessage);
          setIsUploadingImage(false);
          return;
        } finally {
          setIsUploadingImage(false);
        }
      }

      // Use TanStack mutation for comment creation
      createCommentMutation.mutate(
        {
          postId,
          content: trimmedContent,
          image_url: imageUrl,
        },
        {
          onSuccess: () => {
            setContent('');
            handleImageRemove();
            setError(null);
            onCommentPosted();
          },
          onError: (error) => {
            if (error instanceof InviteRequiredError) {
              openInviteModal();
              return;
            }
            componentLogger.error({ error, postId }, 'Error posting comment');
            setError(error.message || 'Failed to post comment');
          },
        }
      );
    } catch (error) {
      componentLogger.error({ error, postId }, 'Error in comment submission');
      setError('Failed to post comment');
    }
  };

  const charCount = content.length;
  const isOverLimit = charCount > APP_CONFIG.TWEET_MAX_LENGTH;

  return (
    <form onSubmit={handleSubmit} className="px-5 py-3 border-b border-gray-200">
      {error && (
        <div className="mb-3 px-3 py-2 bg-red-50 text-red-600 text-sm rounded-lg">{error}</div>
      )}

      <div className="flex gap-3">
        <Avatar src={userAvatar} alt="Your avatar" size="small" />

        <div className="flex-1">
          <textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder="Post your reply"
            className="w-full px-0 py-2 border-0 focus:outline-none resize-none text-sm placeholder-gray-500"
            rows={2}
            disabled={isSubmitting}
          />

          {imagePreviewUrl && (
            <div className="mt-3 relative rounded-2xl overflow-hidden border border-gray-200 w-full max-w-full min-w-0">
              <Image
                src={imagePreviewUrl}
                alt="Selected image preview"
                width={800}
                height={600}
                className="w-full h-auto max-h-96 object-contain max-w-full block"
                sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
              />
              <button
                type="button"
                onClick={handleImageRemove}
                disabled={isUploadingImage}
                className={`absolute top-2 right-2 w-8 h-8 bg-black/60 rounded-full flex items-center justify-center transition-colors ${
                  isUploadingImage
                    ? 'opacity-50 cursor-not-allowed'
                    : 'hover:bg-black/80 cursor-pointer'
                }`}
                aria-label="Remove image"
              >
                <X size={16} className="text-white" />
              </button>
            </div>
          )}

          <div className="flex items-center justify-between mt-1 pt-2 border-t border-gray-100">
            <div className="flex items-center gap-1">
              <input
                ref={fileInputRef}
                type="file"
                accept="image/jpeg,image/png,image/gif,image/webp"
                onChange={handleImageSelect}
                className="hidden"
              />
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={isUploadingImage || !!selectedImage}
                className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-blue-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                aria-label="Add image"
                title="Add image"
              >
                <ImageIcon size={18} className="text-blue-500" />
              </button>
              <div className="text-xs text-gray-400 ml-1">
                <span className={isOverLimit ? 'text-red-500 font-medium' : ''}>
                  {charCount}/{APP_CONFIG.TWEET_MAX_LENGTH}
                </span>
              </div>
            </div>

            <button
              type="submit"
              disabled={
                isSubmitting ||
                !content.trim() ||
                isOverLimit ||
                remainingLimit === 0 ||
                isUploadingImage
              }
              className="px-4 py-1.5 bg-blue-500 text-white text-sm font-semibold rounded-full hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors active:scale-95"
            >
              {isUploadingImage ? 'Uploading...' : isSubmitting ? 'Posting...' : 'Reply'}
            </button>
          </div>
        </div>
      </div>
    </form>
  );
}
