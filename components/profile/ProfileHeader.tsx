'use client';

import { useState } from 'react';
import Avatar from '@/components/ui/Avatar';
import FollowButton from './FollowButton';
import FollowCounts from './FollowCounts';
import { EditProfileDialog } from './EditProfileDialog';

interface ProfileHeaderProps {
  profile: {
    id: string;
    name: string | null;
    image: string | null;
    username: string | null;
  };
  isOwner: boolean;
  isFollowing?: boolean;
  followerCount?: number;
  followingCount?: number;
}

export default function ProfileHeader({
  profile,
  isOwner,
  isFollowing = false,
  followerCount = 0,
  followingCount = 0,
}: ProfileHeaderProps) {
  const [currentFollowerCount, setCurrentFollowerCount] = useState(followerCount);
  const [showEditDialog, setShowEditDialog] = useState(false);

  const handleFollowChange = (following: boolean, newFollowerCount: number) => {
    setCurrentFollowerCount(newFollowerCount);
  };

  return (
    <>
      <div className="px-5 py-4 border-b border-gray-200">
        <div className="flex items-start gap-3 mb-3">
          {/* Left: Avatar */}
          <Avatar
            src={profile.image || undefined}
            alt={profile.name || 'User'}
            size="large"
            className="flex-shrink-0"
          />

          {/* Center: Name + @username + counts */}
          <div className="flex-1 min-w-0">
            <h1 className="text-lg font-bold text-gray-900 leading-tight">
              {profile.name || 'Anonymous User'}
            </h1>
            {profile.username && <p className="text-xs text-gray-500 mb-2">@{profile.username}</p>}
            <FollowCounts followerCount={currentFollowerCount} followingCount={followingCount} />
          </div>

          {/* Right: Edit / Follow Button + Twitter */}
          <div className="flex items-center gap-2 flex-shrink-0">
            {isOwner ? (
              <button
                onClick={() => setShowEditDialog(true)}
                className="px-4 py-1.5 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-full transition-colors"
              >
                Edit
              </button>
            ) : (
              profile.username && (
                <FollowButton
                  username={profile.username}
                  initialFollowing={isFollowing}
                  onFollowChange={handleFollowChange}
                />
              )
            )}
            {profile.username && (
              <a
                href={`https://twitter.com/${profile.username}`}
                target="_blank"
                rel="noopener noreferrer"
                className="w-9 h-9 rounded-full glass-light hover:bg-gray-100 flex items-center justify-center transition-colors"
                aria-label="View on X/Twitter"
              >
                <svg
                  viewBox="0 0 24 24"
                  className="w-4 h-4 fill-current text-gray-900"
                  aria-hidden="true"
                >
                  <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
                </svg>
              </a>
            )}
          </div>
        </div>
      </div>

      {showEditDialog && <EditProfileDialog onClose={() => setShowEditDialog(false)} />}
    </>
  );
}
