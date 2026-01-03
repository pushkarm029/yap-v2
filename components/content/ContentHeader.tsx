import Link from 'next/link';
import Avatar from '../ui/Avatar';
import { ExpiryBadge } from '../posts/ExpiryBadge';

interface ContentHeaderProps {
  user: {
    id: string;
    name: string;
    username: string;
    avatar?: string | null;
  };
  timestamp: string;
  /** Optional override for expiry display (e.g., show parent post's expiry for comments) */
  expiryTimestamp?: string;
  size?: 'small' | 'large';
  showAvatar?: boolean;
  className?: string;
}

export default function ContentHeader({
  user,
  timestamp,
  expiryTimestamp,
  size = 'small',
  showAvatar = true,
  className = '',
}: ContentHeaderProps) {
  return (
    <div className={`flex items-center justify-between gap-3 ${className}`}>
      <div className="flex gap-2 sm:gap-3 items-center min-w-0 flex-1">
        {showAvatar && (
          <Link
            href={`/${user.username}`}
            aria-label={`View ${user.name}'s profile`}
            onClick={(e) => e.stopPropagation()}
          >
            <Avatar src={user.avatar || undefined} alt={user.name || 'User'} size={size} />
          </Link>
        )}
        <div className="min-w-0 flex-1">
          <div className="flex flex-col min-w-0">
            <Link
              href={`/${user.username}`}
              aria-label={`View ${user.name}'s profile`}
              className="leading-none w-fit"
              onClick={(e) => e.stopPropagation()}
            >
              <h3 className="text-sm font-semibold text-gray-900 truncate">
                {user.name || 'Unknown User'}
              </h3>
            </Link>
            <Link
              href={`/${user.username}`}
              aria-label={`View @${user.username}'s profile`}
              className="leading-none w-fit"
              onClick={(e) => e.stopPropagation()}
            >
              <span className="text-xs text-gray-500 flex-shrink-0">
                @{user.username || 'unknown'}
              </span>
            </Link>
          </div>
        </div>
      </div>
      <div className="flex items-center flex-shrink-0">
        <ExpiryBadge createdAt={expiryTimestamp ?? timestamp} />
      </div>
    </div>
  );
}
