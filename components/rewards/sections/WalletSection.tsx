'use client';

import { useEffect } from 'react';
import { useWallet } from '@/components/solana/WalletProvider';
import { WalletButton } from '@/components/solana';
import { useRewardsPool, useSaveWalletAddress } from '@/hooks/queries';
import { WalletSectionSkeleton } from '../RewardsPageSkeleton';

/**
 * Wallet section with connect button
 */
export function WalletSection() {
  const { publicKey, connected } = useWallet();
  const { data: poolData, isLoading, isError, refetch } = useRewardsPool();
  const saveWalletMutation = useSaveWalletAddress();

  // Auto-save wallet when connected
  useEffect(() => {
    if (
      connected &&
      publicKey &&
      poolData &&
      !poolData.walletConnected &&
      !saveWalletMutation.isPending
    ) {
      saveWalletMutation.mutate(publicKey.toBase58());
    }
  }, [connected, publicKey, poolData, saveWalletMutation]);

  if (isLoading) {
    return <WalletSectionSkeleton />;
  }

  if (isError) {
    return (
      <div className="px-5 py-4 border-b border-gray-200">
        <p className="text-sm text-red-500 mb-2">Failed to load wallet status</p>
        <button onClick={() => refetch()} className="text-sm text-blue-600 hover:underline">
          Try again
        </button>
      </div>
    );
  }

  return (
    <div className="px-5 py-4 border-b border-gray-200">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-medium text-gray-900">Wallet</p>
          <p className="text-xs text-gray-500">
            {poolData?.walletConnected ? 'Connected' : 'Connect to claim tokens'}
          </p>
        </div>
        <WalletButton />
      </div>
    </div>
  );
}
