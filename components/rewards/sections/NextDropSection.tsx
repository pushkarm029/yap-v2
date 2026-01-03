'use client';

import { useEffect } from 'react';
import { Gift, Timer, Info } from 'lucide-react';
import { useRewardsPool, useRewardsScore } from '@/hooks/queries';
import { useRewardsStore } from '@/stores/rewardsStore';
import { NextDropSectionSkeleton } from '../RewardsPageSkeleton';

function formatYapAmount(rawAmount: string | bigint): string {
  const num = Number(rawAmount) / 1e9;
  if (num >= 1_000_000) {
    return (num / 1_000_000).toFixed(2) + 'M';
  }
  if (num >= 1_000) {
    return (num / 1_000).toFixed(1) + 'K';
  }
  return num.toLocaleString(undefined, {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  });
}

function formatCountdown(seconds: number): string {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = Math.floor(seconds % 60);
  return `${hours}h ${minutes}m ${secs}s`;
}

/**
 * Next drop section with live countdown and pool share
 */
export function NextDropSection() {
  const { data: poolData, isLoading, isError, refetch } = useRewardsPool();
  const { data: scoreData } = useRewardsScore();

  // Zustand store for real-time counters
  const livePool = useRewardsStore((state) => state.livePool);
  const liveCountdown = useRewardsStore((state) => state.liveCountdown);
  const showShareInfo = useRewardsStore((state) => state.showShareInfo);
  const initializeCounters = useRewardsStore((state) => state.initializeCounters);
  const tickCountdown = useRewardsStore((state) => state.tickCountdown);
  const toggleShareInfo = useRewardsStore((state) => state.toggleShareInfo);

  // Initialize live counters when pool data loads
  useEffect(() => {
    if (poolData) {
      initializeCounters(
        BigInt(poolData.dailyPool || '0'),
        poolData.nextDistributionIn || 0,
        BigInt(poolData.estimatedReward || '0')
      );
    }
  }, [poolData, initializeCounters]);

  // Countdown timer - ticks every second
  useEffect(() => {
    if (liveCountdown <= 0) return;
    const timer = setInterval(() => {
      tickCountdown();
    }, 1000);
    return () => clearInterval(timer);
  }, [liveCountdown, tickCountdown]);

  if (isLoading) {
    return <NextDropSectionSkeleton />;
  }

  if (isError) {
    return (
      <div className="px-5 py-4 border-b border-gray-200 bg-gradient-to-r from-purple-50/50 to-pink-50/50">
        <p className="text-sm text-red-500 mb-2">Failed to load pool data</p>
        <button onClick={() => refetch()} className="text-sm text-blue-600 hover:underline">
          Try again
        </button>
      </div>
    );
  }

  const hasPoolData = poolData && Number(poolData.dailyPool) > 0;

  return (
    <div className="px-5 py-4 border-b border-gray-200 bg-gradient-to-r from-purple-50/50 to-pink-50/50">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Gift size={16} className="text-purple-500" />
          <span className="text-sm font-medium text-gray-900">Next Drop</span>
        </div>
        <div className="flex items-center gap-1.5 px-2.5 py-1 bg-purple-100 text-purple-700 rounded-full">
          <Timer size={12} />
          <span className="text-xs font-bold tabular-nums">{formatCountdown(liveCountdown)}</span>
        </div>
      </div>
      {hasPoolData ? (
        <div className="grid grid-cols-2 gap-4">
          <div>
            <p className="text-xl font-bold text-gray-900 tabular-nums">
              {formatYapAmount(livePool)}{' '}
              <span className="text-sm font-normal text-gray-500">YAP</span>
            </p>
            <p className="text-xs text-gray-500">Prize Pool</p>
          </div>
          <div className="relative">
            <div className="flex items-center gap-1">
              <p
                className={`text-xl font-bold ${poolData?.walletConnected ? 'text-purple-600' : 'text-gray-400'}`}
              >
                {poolData?.walletConnected ? poolData.userSharePercent.toFixed(2) : '0.00'}%
              </p>
              <button onClick={toggleShareInfo} className="text-gray-400 hover:text-gray-600">
                <Info size={14} />
              </button>
            </div>
            <p className="text-xs text-gray-500">Your Share</p>
            {showShareInfo && (
              <div className="absolute top-full left-0 mt-2 p-3 bg-white border border-gray-200 rounded-lg shadow-lg z-10 w-48 text-xs">
                <p className="text-gray-700 mb-1">
                  <span className="font-medium">
                    {Math.floor(scoreData?.pending || 0).toLocaleString()}
                  </span>{' '}
                  / {Math.floor(poolData?.totalPendingPoints || 0).toLocaleString()} pts
                </p>
                <p className="text-gray-400">Pool grows every second</p>
              </div>
            )}
          </div>
        </div>
      ) : (
        <p className="text-sm text-gray-500">Loading pool data...</p>
      )}
    </div>
  );
}
