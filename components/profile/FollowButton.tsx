'use client';

import { useState } from 'react';
import { useOptimisticFollow } from '@/hooks';

interface FollowButtonProps {
  username: string;
  initialFollowing: boolean;
  onFollowChange?: (following: boolean, followerCount: number) => void;
}

export default function FollowButton({
  username,
  initialFollowing,
  onFollowChange,
}: FollowButtonProps) {
  const [isHovering, setIsHovering] = useState(false);

  const { following, toggle } = useOptimisticFollow({
    username,
    initialFollowing,
    onFollowChange,
  });

  const handleClick = () => {
    toggle();
  };

  if (following) {
    return (
      <button
        onClick={handleClick}
        onMouseEnter={() => setIsHovering(true)}
        onMouseLeave={() => setIsHovering(false)}
        className={`
          px-4 py-1.5 rounded-full border-2 text-sm font-semibold transition-all cursor-pointer
          ${
            isHovering
              ? 'border-red-400 text-red-600 bg-red-50'
              : 'border-gray-300 bg-white text-gray-900'
          }
        `}
      >
        {isHovering ? 'Unfollow' : 'Following'}
      </button>
    );
  }

  return (
    <button
      onClick={handleClick}
      className="px-4 py-1.5 rounded-full bg-black text-white text-sm font-semibold hover:bg-gray-800 transition-all cursor-pointer"
    >
      Follow
    </button>
  );
}
