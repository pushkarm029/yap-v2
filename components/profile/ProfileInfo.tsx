'use client';

import { Calendar, Twitter, Award } from 'lucide-react';

interface ProfileInfoProps {
  profile: {
    username: string | null;
    points?: number;
    createdAt: Date;
    _count: {
      posts: number;
    };
  };
}

export default function ProfileInfo({ profile }: ProfileInfoProps) {
  const formatDate = (date: Date | string) => {
    const dateObj = typeof date === 'string' ? new Date(date) : date;
    return dateObj.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
    });
  };

  return (
    <div className="px-4 pb-4 border-b border-gray-200">
      {/* Profile Details */}
      <div className="flex flex-wrap gap-4 text-sm text-gray-500">
        {profile.username && (
          <a
            href={`https://twitter.com/${profile.username}`}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1 hover:text-blue-500 transition-colors"
          >
            <Twitter size={16} className="text-gray-400" />
            <span className="hover:underline">@{profile.username}</span>
          </a>
        )}

        {profile.points !== undefined && (
          <div className="flex items-center gap-1">
            <Award size={16} className="text-gray-400" />
            <span>{Math.floor(profile.points).toLocaleString()} points</span>
          </div>
        )}

        <div className="flex items-center gap-1">
          <Calendar size={16} className="text-gray-400" />
          <span>
            Joined {formatDate(profile.createdAt)} • {profile._count.posts} posts
          </span>
        </div>
      </div>
    </div>
  );
}
