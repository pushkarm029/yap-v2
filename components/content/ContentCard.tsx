'use client';

import { useRouter } from 'next/navigation';
import ContentHeader from './ContentHeader';
import ContentBody from './ContentBody';
import ContentActions from './ContentActions';

interface User {
  id: string;
  name: string;
  username: string;
  avatar?: string | null;
}

interface ContentCardProps {
  // Data
  id: string;
  user: User;
  content: string;
  imageUrl?: string | null;
  timestamp: string;
  /** Optional override for expiry display (e.g., show parent post's expiry for comments) */
  expiryTimestamp?: string;

  // Actions
  upvoteCount?: number;
  commentCount?: number;
  userUpvoted?: boolean;

  // Behavior
  onClick?: () => void;
  showActions?: boolean;

  // Customization
  variant?: 'feed' | 'detail';
  className?: string;
}

export default function ContentCard({
  id,
  user,
  content,
  imageUrl,
  timestamp,
  expiryTimestamp,
  upvoteCount = 0,
  commentCount = 0,
  userUpvoted = false,
  onClick,
  showActions = true,
  variant = 'feed',
  className = '',
}: ContentCardProps) {
  const router = useRouter();

  const handleCardClick = () => {
    if (onClick) {
      onClick();
    } else {
      router.push(`/posts/${id}`);
    }
  };

  return (
    <div
      onClick={handleCardClick}
      className={`px-5 py-3 sm:py-4 cursor-pointer hover:bg-gray-50 transition-colors overflow-x-hidden min-w-0 ${className} ${
        variant === 'feed' ? 'border-b border-gray-200' : ''
      }`}
    >
      <ContentHeader user={user} timestamp={timestamp} expiryTimestamp={expiryTimestamp} />
      <ContentBody
        content={content}
        imageUrl={imageUrl}
        contentClassName={variant === 'detail' ? 'text-lg' : 'text-gray-900'}
      />
      {showActions && (
        <ContentActions
          postId={id}
          upvoteCount={upvoteCount}
          commentCount={commentCount}
          userUpvoted={userUpvoted}
        />
      )}
    </div>
  );
}
