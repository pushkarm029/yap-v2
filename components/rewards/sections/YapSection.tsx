'use client';

import dynamic from 'next/dynamic';
import { CircleDollarSign } from 'lucide-react';
import { useRewardsYap, useInvalidateAllRewards } from '@/hooks/queries';
import { YapSectionSkeleton } from '../RewardsPageSkeleton';

// Lazy load heavy Solana claiming component
const ClaimRewards = dynamic(
  () => import('@/components/solana/ClaimRewards').then((mod) => mod.ClaimRewards),
  {
    ssr: false,
    loading: () => <div className="h-10 bg-gray-100 rounded-full animate-pulse w-32" />,
  }
);

function formatAmount(amount: string) {
  const num = Number(amount) / 1e9;
  return num.toLocaleString(undefined, {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  });
}

/**
 * YAP balance section with claim button
 */
export function YapSection() {
  const { data: yapData, isLoading, isError, refetch } = useRewardsYap();
  const invalidateRewards = useInvalidateAllRewards();

  if (isLoading) {
    return <YapSectionSkeleton />;
  }

  if (isError) {
    return (
      <div className="px-5 py-4 border-b border-gray-200">
        <p className="text-sm text-red-500 mb-2">Failed to load YAP balance</p>
        <button onClick={() => refetch()} className="text-sm text-blue-600 hover:underline">
          Try again
        </button>
      </div>
    );
  }

  return (
    <div className="px-5 py-4 border-b border-gray-200">
      <div className="flex items-center gap-2 mb-3">
        <CircleDollarSign size={16} className="text-yellow-500" />
        <span className="text-sm font-medium text-gray-900">Your $YAP</span>
      </div>
      <div className="grid grid-cols-2 gap-4 mb-3">
        <div>
          <p className="text-2xl font-bold text-green-600">
            {formatAmount(yapData?.claimableTotal || '0')}
          </p>
          <p className="text-xs text-gray-500">Ready to Claim</p>
        </div>
        <div>
          <p className="text-2xl font-bold text-gray-400">
            {formatAmount(yapData?.claimedTotal || '0')}
          </p>
          <p className="text-xs text-gray-500">Claimed</p>
        </div>
      </div>
      {yapData?.claimable && (
        <ClaimRewards
          rewardId={yapData.claimable.id}
          onSuccess={() => invalidateRewards()}
          onError={(error) => console.error('Claim failed:', error)}
        />
      )}
    </div>
  );
}
