'use client';

interface FollowCountsProps {
  followerCount: number;
  followingCount: number;
}

export default function FollowCounts({ followerCount, followingCount }: FollowCountsProps) {
  return (
    <div className="flex items-center gap-4 text-sm">
      <button
        className="hover:underline"
        onClick={() => {
          // TODO: Show followers modal/page
        }}
      >
        <span className="font-semibold text-gray-900">{followerCount}</span>
        <span className="text-gray-600 ml-1">{followerCount === 1 ? 'follower' : 'followers'}</span>
      </button>

      <button
        className="hover:underline"
        onClick={() => {
          // TODO: Show following modal/page
        }}
      >
        <span className="font-semibold text-gray-900">{followingCount}</span>
        <span className="text-gray-600 ml-1">following</span>
      </button>
    </div>
  );
}
