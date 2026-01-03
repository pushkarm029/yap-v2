'use client';

import { MessageCircle } from 'lucide-react';
import UpvoteButton from '../posts/UpvoteButton';

interface TopComment {
  content: string;
  upvoteCount: number;
}

interface ContentActionsProps {
  postId: string;
  upvoteCount: number;
  commentCount: number;
  userUpvoted?: boolean;
  topComment?: TopComment | null;
  className?: string;
}

export default function ContentActions({
  postId,
  upvoteCount,
  commentCount,
  userUpvoted = false,
  topComment,
  className = '',
}: ContentActionsProps) {
  return (
    <div className={`mt-3 ${className}`}>
      <div className="flex items-center gap-3 sm:gap-4 flex-wrap">
        <UpvoteButton postId={postId} initialCount={upvoteCount} initialUpvoted={userUpvoted} />
        <span className="text-gray-400 hidden sm:inline">·</span>
        <div
          aria-label={`View comments (${commentCount || 0})`}
          className="flex items-center gap-1.5 text-gray-500"
        >
          <MessageCircle size={14} />
          <span className="text-xs font-medium">{commentCount || 0}</span>
        </div>
        {topComment && (
          <>
            <span className="text-gray-400 hidden sm:inline">·</span>
            <div className="flex items-center gap-2 text-xs text-gray-600 flex-1 min-w-0">
              <span className="truncate italic">&ldquo;{topComment.content}&rdquo;</span>
              <span className="text-gray-400 flex-shrink-0">⬆ {topComment.upvoteCount}</span>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
