'use client';

import Link from 'next/link';
import Image from 'next/image';
import { User } from 'lucide-react';

interface ProfileSectionProps {
  user: {
    name?: string | null;
    username?: string | null;
    image?: string | null;
  };
  profile?: {
    points?: number | null;
    streak?: number | null;
    postsCount?: number | null;
  };
  votePower?: number;
  isLoading: boolean;
  onClose: () => void;
}

/**
 * Profile hero section with avatar, name, and inline stats
 */
export function ProfileSection({
  user,
  profile,
  votePower,
  isLoading,
  onClose,
}: ProfileSectionProps) {
  return (
    <div className="px-5 py-4">
      <Link href="/profile" onClick={onClose} className="flex items-center gap-3 group">
        <div className="w-12 h-12 rounded-full overflow-hidden shadow-sm flex items-center justify-center flex-shrink-0 bg-gray-100">
          {user.image ? (
            <Image
              src={user.image}
              alt="Profile"
              width={48}
              height={48}
              className="w-full h-full object-cover"
            />
          ) : (
            <User size={24} className="text-gray-500" />
          )}
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-base font-semibold text-gray-900 group-hover:text-blue-600 transition-colors">
            {user.name || 'User'}
          </p>
          <p className="text-sm text-gray-500 truncate">@{user.username || 'user'}</p>
        </div>
      </Link>

      {/* Inline Stats */}
      <div className="flex items-center gap-4 mt-3">
        {isLoading ? (
          <>
            <div className="h-5 w-20 bg-gray-200/50 rounded animate-pulse" />
            <div className="h-5 w-24 bg-gray-200/50 rounded animate-pulse" />
          </>
        ) : (
          <>
            <span className="text-sm font-semibold text-gray-900">
              🏆 {Math.floor(profile?.points || 0).toLocaleString()}
            </span>
            <span className="text-sm font-semibold text-gray-900">🔥 {profile?.streak || 0}</span>
            <span className="text-sm font-semibold text-gray-900">
              📝 {profile?.postsCount || 0}
            </span>
            {votePower !== undefined && (
              <span className="text-sm font-semibold text-gray-900">
                ⚡ {votePower.toFixed(1)}x
              </span>
            )}
          </>
        )}
      </div>
    </div>
  );
}
