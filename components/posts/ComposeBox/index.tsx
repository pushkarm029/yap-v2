'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { useSession } from 'next-auth/react';
import { X } from 'lucide-react';
import Avatar from '@/components/ui/Avatar';
import MentionAutocomplete from '../MentionAutocomplete';
import Toast from '@/components/ui/Toast';
import { APP_CONFIG } from '@/constants';
import { componentLogger } from '@/lib/logger';
import { useToast } from '@/hooks/useToast';
import { useImageUpload } from '@/hooks/useImageUpload';
import { useCreatePost, useLimitsQuery } from '@/hooks/queries';
import { useUIStore } from '@/stores/uiStore';

import { ImagePreview } from './ImagePreview';
import { ComposeActions } from './ComposeActions';
import { ComposeBar } from './ComposeBar';

// Submission status union type - prevents invalid state combinations
type SubmitStatus = 'idle' | 'uploading' | 'posting';

export default function ComposeBox() {
  const { data: session, status } = useSession();

  // Zustand UI store - compose state
  const isComposeOpen = useUIStore((state) => state.isComposeOpen);
  const composeContent = useUIStore((state) => state.composeContent);
  const closeCompose = useUIStore((state) => state.closeCompose);
  const clearComposeContent = useUIStore((state) => state.clearComposeContent);
  const openInviteModal = useUIStore((state) => state.openInviteModal);
  const openCompose = useUIStore((state) => state.openCompose);

  // Essential form state
  const [content, setContent] = useState('');
  const [textareaHeight, setTextareaHeight] = useState('auto');
  const [submitStatus, setSubmitStatus] = useState<SubmitStatus>('idle');

  // Custom hooks
  const { data: limitsData } = useLimitsQuery();
  const createPostMutation = useCreatePost();
  const { toast, showError, hideToast } = useToast();
  const {
    image,
    previewUrl,
    error: imageError,
    selectImage,
    removeImage,
    uploadImage,
    clearError: clearImageError,
    fileInputRef,
  } = useImageUpload();

  // Refs
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const maxLength = APP_CONFIG.TWEET_MAX_LENGTH;
  const maxTextareaHeight = 200;

  // Derived state
  const isLoading = submitStatus !== 'idle' || createPostMutation.isPending;
  const actionLimit = limitsData?.total ?? null;
  const remainingChars = maxLength - content.length;
  const isOverLimit = remainingChars < 0;
  const isAtActionLimit = actionLimit !== null && actionLimit.remaining <= 0;
  const hasContent = content.trim().length > 0;
  const hasImage = !!image;
  const canPost = (hasContent || hasImage) && !isOverLimit && !isAtActionLimit;

  const buttonText =
    submitStatus === 'uploading'
      ? 'Uploading...'
      : submitStatus === 'posting'
        ? 'Yapping...'
        : 'Yap';

  // Show image errors via toast
  useEffect(() => {
    if (imageError) {
      showError(imageError.message);
      clearImageError();
    }
  }, [imageError, showError, clearImageError]);

  const focusTextarea = useCallback(() => {
    requestAnimationFrame(() => {
      textareaRef.current?.focus();
    });
  }, []);

  // Focus textarea when compose opens
  useEffect(() => {
    if (isComposeOpen) {
      focusTextarea();
    }
  }, [isComposeOpen, focusTextarea]);

  // Apply content from store when compose opens with content
  useEffect(() => {
    if (composeContent) {
      setContent(composeContent);
      clearComposeContent();
    }
  }, [composeContent, clearComposeContent]);

  // Click outside to close (only when empty)
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        if (isComposeOpen && content.trim() === '') {
          closeCompose();
        }
      }
    };

    if (isComposeOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isComposeOpen, content, closeCompose]);

  // Escape key to close (only when empty)
  useEffect(() => {
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && isComposeOpen) {
        if (content.trim() === '') {
          closeCompose();
        }
      }
    };

    if (isComposeOpen) {
      document.addEventListener('keydown', handleEscape);
    }

    return () => {
      document.removeEventListener('keydown', handleEscape);
    };
  }, [isComposeOpen, content, closeCompose]);

  // Auto-resize textarea
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      const scrollHeight = textareaRef.current.scrollHeight;
      const minHeight = 50;
      const newHeight = Math.min(Math.max(scrollHeight, minHeight), maxTextareaHeight);
      textareaRef.current.style.height = `${newHeight}px`;
      setTextareaHeight(`${newHeight}px`);
    }
  }, [content, maxTextareaHeight]);

  const handleClose = () => {
    closeCompose();
    setContent('');
    removeImage();
  };

  const handleImageSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    await selectImage(file);
  };

  const handleSubmitPost = async () => {
    if (isLoading) return;

    // Allow photo-only posts (content OR image required)
    if (
      (content.trim() || image) &&
      content.length <= maxLength &&
      actionLimit &&
      actionLimit.remaining > 0
    ) {
      if (status !== 'authenticated') {
        componentLogger.warn('Attempted to post while unauthenticated');
        return;
      }

      try {
        let imageUrl: string | null = null;

        if (image) {
          setSubmitStatus('uploading');
          imageUrl = await uploadImage();

          if (!imageUrl) {
            setSubmitStatus('idle');
            return;
          }
        }

        setSubmitStatus('posting');

        createPostMutation.mutate(
          { content: content.trim(), image_url: imageUrl },
          {
            onSuccess: () => {
              setContent('');
              removeImage();
              closeCompose();
              setSubmitStatus('idle');
              componentLogger.info('Post created successfully');
            },
            onError: (error) => {
              setSubmitStatus('idle');
              const errorMessage = error.message;

              if (errorMessage === 'INVITE_REQUIRED') {
                openInviteModal();
                return;
              }

              componentLogger.error({ error: errorMessage }, 'Failed to create post');
              showError(errorMessage || 'Failed to post. Please try again.');
            },
          }
        );
      } catch (error) {
        componentLogger.error({ error }, 'Error in post submission');
        showError('Network error. Could not post your message.');
        setSubmitStatus('idle');
      }
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await handleSubmitPost();
  };

  const handleMentionSelect = (newContent: string) => {
    setContent(newContent);
  };

  if (status !== 'authenticated') {
    return null;
  }

  // Expanded modal view
  if (isComposeOpen) {
    return (
      <div
        className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50"
        onClick={(e) => {
          if (e.target === e.currentTarget && content.trim() === '') {
            handleClose();
          }
        }}
      >
        <div className="flex items-center justify-center min-h-screen p-4">
          <div
            ref={containerRef}
            className="bg-white rounded-2xl shadow-2xl w-full max-w-[600px] max-h-[90vh] flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200 flex-shrink-0">
              <button
                onClick={handleClose}
                className="w-9 h-9 flex items-center justify-center rounded-full hover:bg-gray-100 transition-colors"
                aria-label="Close"
              >
                <X size={20} className="text-gray-700" />
              </button>
              <button
                type="button"
                onClick={() => canPost && !isLoading && handleSubmitPost()}
                disabled={!canPost || isLoading}
                className={`px-5 py-2 rounded-full font-semibold border-none cursor-pointer transition-colors ${
                  canPost && !isLoading
                    ? 'bg-blue-500 text-white hover:bg-blue-600'
                    : 'bg-blue-300 text-white cursor-not-allowed'
                }`}
                title={isAtActionLimit ? 'Daily action limit reached' : isLoading ? buttonText : ''}
              >
                {buttonText}
              </button>
            </div>

            {/* Form */}
            <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto">
              <div className="p-4">
                <div className="flex gap-3">
                  <Avatar
                    src={session?.user?.image || undefined}
                    alt={session?.user?.name || 'Your avatar'}
                    size="small"
                  />
                  <div className="flex-1 min-w-0">
                    <textarea
                      ref={textareaRef}
                      value={content}
                      onChange={(e) => setContent(e.target.value)}
                      placeholder="What's happening?"
                      style={{ height: textareaHeight, maxHeight: `${maxTextareaHeight}px` }}
                      className="w-full text-base font-normal tracking-tight border-none outline-none resize-none bg-transparent placeholder:text-gray-500 overflow-y-auto"
                    />
                    <MentionAutocomplete textareaRef={textareaRef} onSelect={handleMentionSelect} />

                    {previewUrl && <ImagePreview previewUrl={previewUrl} onRemove={removeImage} />}
                  </div>
                </div>

                <ComposeActions
                  fileInputRef={fileInputRef}
                  onImageSelect={handleImageSelect}
                  isLoading={isLoading}
                  hasImage={!!image}
                  contentLength={content.length}
                  remainingChars={remainingChars}
                  isOverLimit={isOverLimit}
                />
              </div>
            </form>
          </div>
        </div>
      </div>
    );
  }

  // Desktop collapsed bar
  return (
    <>
      {toast && <Toast message={toast.message} type={toast.type} onClose={hideToast} />}
      <ComposeBar
        userImage={session?.user?.image}
        userName={session?.user?.name}
        onExpand={openCompose}
      />
    </>
  );
}
