'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { MessageSquare } from 'lucide-react';
import Avatar from '../ui/Avatar';
import FollowButton from '../profile/FollowButton';

interface UserCardProps {
  readonly user: {
    readonly id: string;
    readonly name?: string | null;
    readonly username?: string | null;
    readonly image?: string | null;
    readonly bio?: string | null;
    readonly points?: number;
    readonly isFollowing?: boolean;
    readonly _count?: {
      readonly posts: number;
    };
  };
}

export default function UserCard({ user }: UserCardProps) {
  const router = useRouter();
  const { data: session } = useSession();
  const displayName = user.name || 'Unknown User';
  const displayUsername = user.username || 'unknown';

  // Check if the user is viewing their own profile
  const isOwnProfile = session?.user?.id === user.id;

  const handleClick = () => {
    router.push(`/${displayUsername}`);
  };

  return (
    <div
      onClick={handleClick}
      className="px-5 py-4 cursor-pointer hover:bg-gray-50 transition-colors border-b border-gray-200"
    >
      <div className="flex items-start gap-3">
        {/* Avatar */}
        <Link
          href={`/${displayUsername}`}
          onClick={(e) => e.stopPropagation()}
          className="flex-shrink-0"
        >
          <Avatar
            src={user.image || undefined}
            alt={displayName}
            size="medium"
            className="hover:opacity-80 transition-opacity"
          />
        </Link>

        {/* User Info */}
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0 flex-1">
              <Link
                href={`/${displayUsername}`}
                onClick={(e) => e.stopPropagation()}
                className="hover:underline"
              >
                <h3 className="font-semibold text-gray-900 text-sm truncate">{displayName}</h3>
              </Link>
              <Link href={`/${displayUsername}`} onClick={(e) => e.stopPropagation()}>
                <p className="text-gray-500 text-xs">@{displayUsername}</p>
              </Link>
            </div>

            {/* Follow Button - Only show if not viewing own profile */}
            {!isOwnProfile && (
              <div onClick={(e) => e.stopPropagation()}>
                <FollowButton
                  username={displayUsername}
                  initialFollowing={user.isFollowing || false}
                />
              </div>
            )}
          </div>

          {/* Bio */}
          {user.bio && <p className="text-sm text-gray-600 mt-2 line-clamp-2">{user.bio}</p>}

          {/* Stats */}
          {user._count && (
            <div className="flex items-center gap-4 mt-2.5 text-gray-500 text-xs">
              <div className="flex items-center gap-1.5">
                <MessageSquare size={14} />
                <span>{user._count.posts} posts</span>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
