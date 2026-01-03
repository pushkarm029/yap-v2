'use client';

interface ProfileStatsProps {
  points: number;
  streak: number | null;
  postsCount: number;
  votePower?: number; // Only present for own profile (private)
}

export default function ProfileStats({ points, streak, postsCount, votePower }: ProfileStatsProps) {
  return (
    <div className="px-5 py-3 border-b border-gray-200">
      <div className="flex items-center justify-center gap-4 text-sm">
        {/* Points */}
        <div className="flex items-center gap-1.5">
          <span className="text-base">🏆</span>
          <span className="font-semibold text-gray-900">{Math.floor(points).toLocaleString()}</span>
          <span className="text-gray-600">Points</span>
        </div>

        {/* Streak */}
        <div className="flex items-center gap-1.5">
          <span className="text-base">🔥</span>
          <span className="font-semibold text-gray-900">{streak !== null ? streak : '—'}</span>
          <span className="text-gray-600">Streak</span>
        </div>

        {/* Posts */}
        <div className="flex items-center gap-1.5">
          <span className="text-base">📝</span>
          <span className="font-semibold text-gray-900">{postsCount}</span>
          <span className="text-gray-600">Posts</span>
        </div>

        {/* Vote Power - only shown on own profile */}
        {votePower !== undefined && (
          <div className="flex items-center gap-1.5">
            <span className="text-base">⚡</span>
            <span className="font-semibold text-gray-900">{votePower.toFixed(1)}x</span>
            <span className="text-gray-600">Power</span>
          </div>
        )}
      </div>
    </div>
  );
}
