'use client';

import { useState, useRef, useEffect } from 'react';
import { formatDistanceToNow } from 'date-fns';
import Link from 'next/link';
import Avatar from '@/components/ui/Avatar';
import UpvoteButton from '@/components/posts/UpvoteButton';
import CommentForm from '@/components/posts/CommentForm';
import PostCard from '@/components/posts/PostCard';
import MentionText from '@/components/posts/MentionText';
import ContentImage from '@/components/content/ContentImage';
import LoadingState from '@/components/ui/LoadingState';
import { ExpiryBadge } from '@/components/posts/ExpiryBadge';
import { componentLogger } from '@/lib/logger';
import { usePostThread } from '@/hooks/queries';
import type { Comment } from '@/types';

interface Post {
  id: string;
  user_id: string;
  content: string;
  image_url?: string | null;
  created_at: string;
  upvote_count?: number;
  user_upvoted?: boolean;
  comment_count?: number;
  name: string | null;
  username: string | null;
  image: string | null;
}

interface PostDetailViewProps {
  post: Post;
  currentUserId?: string;
  userAvatar?: string | null;
}

export default function PostDetailView({ post, currentUserId, userAvatar }: PostDetailViewProps) {
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const {
    data: threadData,
    isLoading: isLoadingComments,
    error: threadError,
    refetch: refetchComments,
  } = usePostThread(post.id);

  const comments = threadData?.comments || [];
  const displayError =
    errorMessage ||
    (threadError ? 'Unable to load comments. Please check your connection and try again.' : null);

  let timeAgo = 'now';
  try {
    if (post.created_at) {
      const date = new Date(post.created_at);
      if (!isNaN(date.getTime())) {
        timeAgo = formatDistanceToNow(date, { addSuffix: true });
      }
    }
  } catch {
    componentLogger.warn({ timestamp: post.created_at }, 'Invalid timestamp');
  }

  const user = {
    name: post.name || 'Unknown User',
    username: post.username || 'unknown',
    avatar: post.image,
  };

  const errorTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const handleError = (message: string) => {
    if (errorTimeoutRef.current) {
      clearTimeout(errorTimeoutRef.current);
    }
    setErrorMessage(message);
    errorTimeoutRef.current = setTimeout(() => setErrorMessage(null), 3000);
  };

  useEffect(() => {
    return () => {
      if (errorTimeoutRef.current) {
        clearTimeout(errorTimeoutRef.current);
      }
    };
  }, []);

  return (
    <div className="pb-20 lg:pb-0 overflow-x-hidden min-w-0">
      <div className="px-5 py-3 sm:py-4 border-b border-gray-200 overflow-x-hidden min-w-0">
        {displayError && (
          <div className="mb-3 px-3 py-2 bg-red-50 text-red-600 text-sm rounded-lg">
            {displayError}
          </div>
        )}

        <div className="flex items-center justify-between gap-3 mb-3">
          <div className="flex gap-2 sm:gap-3 items-center min-w-0 flex-1">
            <Link href={`/${user.username}`} aria-label={`View ${user.name}'s profile`}>
              <Avatar src={user.avatar || undefined} alt={user.name || 'User'} size="small" />
            </Link>
            <div className="min-w-0 flex-1">
              <div className="flex flex-col min-w-0">
                <Link
                  href={`/${user.username}`}
                  aria-label={`View ${user.name}'s profile`}
                  className="leading-none w-fit"
                >
                  <h3 className="text-sm font-semibold text-gray-900 truncate hover:underline">
                    {user.name || 'Unknown User'}
                  </h3>
                </Link>
                <Link
                  href={`/${user.username}`}
                  aria-label={`View @${user.username}'s profile`}
                  className="leading-none w-fit"
                >
                  <span className="text-xs text-gray-500 hover:underline">
                    @{user.username || 'unknown'}
                  </span>
                </Link>
              </div>
            </div>
          </div>
          <div className="flex items-center flex-shrink-0">
            <ExpiryBadge createdAt={post.created_at} />
          </div>
        </div>

        <div className="mb-3 overflow-x-hidden min-w-0">
          <div className="text-sm sm:text-base leading-relaxed text-gray-900">
            <MentionText content={post.content} />
          </div>

          {post.image_url && <ContentImage imageUrl={post.image_url} alt="" className="mt-0" />}
        </div>

        <div className="flex items-center gap-3 sm:gap-4 flex-wrap">
          <UpvoteButton
            postId={post.id}
            initialUpvoted={post.user_upvoted || false}
            initialCount={post.upvote_count || 0}
            onError={handleError}
          />
          <span className="text-gray-400 hidden sm:inline">·</span>
          <span className="text-xs text-gray-500">{timeAgo}</span>
        </div>
      </div>

      <div>
        {currentUserId && (
          <CommentForm
            postId={post.id}
            userAvatar={userAvatar || undefined}
            onCommentPosted={() => refetchComments()}
          />
        )}

        {isLoadingComments ? (
          <LoadingState />
        ) : comments.length > 0 ? (
          <div>
            {comments.map((comment: Comment) => (
              <PostCard key={comment.id} post={comment} expiryTimestamp={post.created_at} />
            ))}
          </div>
        ) : (
          <div className="p-8 text-center text-gray-500 text-sm">
            No comments yet. Be the first to comment!
          </div>
        )}
      </div>
    </div>
  );
}
