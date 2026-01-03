'use client';

import { Sparkles } from 'lucide-react';
import { useRewardsScore } from '@/hooks/queries';
import { ScoreSectionSkeleton } from '../RewardsPageSkeleton';

/**
 * Score section showing lifetime and pending points
 */
export function ScoreSection() {
  const { data: scoreData, isLoading, isError, refetch } = useRewardsScore();

  if (isLoading) {
    return <ScoreSectionSkeleton />;
  }

  if (isError) {
    return (
      <div className="px-5 py-4 border-b border-gray-200">
        <p className="text-sm text-red-500 mb-2">Failed to load score</p>
        <button onClick={() => refetch()} className="text-sm text-blue-600 hover:underline">
          Try again
        </button>
      </div>
    );
  }

  return (
    <div className="px-5 py-4 border-b border-gray-200">
      <div className="flex items-center gap-2 mb-3">
        <Sparkles size={16} className="text-yellow-500" />
        <span className="text-sm font-medium text-gray-900">Your Score</span>
      </div>
      <div className="grid grid-cols-2 gap-4 mb-3">
        <div>
          <p className="text-2xl font-bold text-gray-900">
            {Math.floor(scoreData?.points || 0).toLocaleString()}
          </p>
          <p className="text-xs text-gray-500">Lifetime</p>
        </div>
        <div>
          <p className="text-2xl font-bold text-blue-600">
            {Math.floor(scoreData?.pending || 0).toLocaleString()}
          </p>
          <p className="text-xs text-gray-500">Ready to Convert</p>
        </div>
      </div>
      <p className="text-xs text-gray-400">More points = bigger share of the daily prize pool</p>
    </div>
  );
}
