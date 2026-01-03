'use client';

import { useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { queryKeys } from '@/lib/queryKeys';

// Types for each section
export interface ScoreData {
  points: number;
  pending: number;
  votePower: number;
}

export interface PoolData {
  walletConnected: boolean;
  dailyPool: string;
  totalPendingPoints: number;
  userSharePercent: number;
  estimatedReward: string;
  nextDistributionIn: number;
}

export interface ClaimableReward {
  id: string;
  amount: string;
  distributionId: string;
}

export interface YapData {
  walletConnected: boolean;
  claimable: ClaimableReward | undefined;
  claimableTotal: string;
  claimedTotal: string;
}

// New separated history types
export interface DistributionRecord {
  id: string;
  amountEarned: string; // YAP earned this period
  cumulativeAmount: string; // Total cumulative (for reference)
  pointsConverted: number;
  distributedAt: string;
}

export interface ClaimRecord {
  id: string;
  amountClaimed: string; // Delta transferred in this tx
  cumulativeClaimed: string; // Total claimed after this tx
  txSignature: string;
  claimedAt: string;
}

export interface HistoryData {
  distributions: DistributionRecord[];
  claims: ClaimRecord[];
}

// Cache configuration - consistent across all queries
const CACHE_CONFIG = {
  staleTime: 1000 * 60 * 2, // 2 minutes - data considered fresh
  gcTime: 1000 * 60 * 10, // 10 minutes - keep in memory
} as const;

/**
 * Fetch user's score data (fast - DB only)
 */
export function useRewardsScore() {
  return useQuery({
    queryKey: queryKeys.rewards.score(),
    queryFn: async (): Promise<ScoreData> => {
      const res = await fetch('/api/rewards/score');
      if (!res.ok) {
        throw new Error('Failed to fetch score');
      }
      return res.json();
    },
    ...CACHE_CONFIG,
  });
}

/**
 * Fetch pool data (slow - includes Solana RPC call)
 */
export function useRewardsPool() {
  return useQuery({
    queryKey: queryKeys.rewards.pool(),
    queryFn: async (): Promise<PoolData> => {
      const res = await fetch('/api/rewards/pool');
      if (!res.ok) {
        throw new Error('Failed to fetch pool');
      }
      return res.json();
    },
    ...CACHE_CONFIG,
  });
}

/**
 * Fetch YAP balance data (fast - DB only)
 */
export function useRewardsYap() {
  return useQuery({
    queryKey: queryKeys.rewards.yap(),
    queryFn: async (): Promise<YapData> => {
      const res = await fetch('/api/rewards/yap');
      if (!res.ok) {
        throw new Error('Failed to fetch YAP');
      }
      const data = await res.json();
      // Normalize null to undefined
      return {
        ...data,
        claimable: data.claimable ?? undefined,
      };
    },
    ...CACHE_CONFIG,
  });
}

/**
 * Fetch reward history (distributions + claims separately)
 */
export function useRewardsHistory() {
  return useQuery({
    queryKey: queryKeys.rewards.history(),
    queryFn: async (): Promise<HistoryData> => {
      const res = await fetch('/api/rewards/history');
      if (!res.ok) {
        throw new Error('Failed to fetch history');
      }
      return res.json();
    },
    staleTime: 1000 * 60 * 5, // 5 minutes - history changes only on distribution
    gcTime: 1000 * 60 * 10, // 10 minutes - keep in memory
  });
}

/**
 * Hook to invalidate all rewards caches
 */
export function useInvalidateAllRewards() {
  const queryClient = useQueryClient();

  return useCallback(() => {
    queryClient.invalidateQueries({ queryKey: queryKeys.rewards.all });
  }, [queryClient]);
}

/**
 * Hook to invalidate just the history cache (after claim)
 */
export function useInvalidateRewardsHistory() {
  const queryClient = useQueryClient();

  return useCallback(() => {
    queryClient.invalidateQueries({ queryKey: queryKeys.rewards.history() });
    queryClient.invalidateQueries({ queryKey: queryKeys.rewards.yap() });
  }, [queryClient]);
}

/**
 * Save/update user's wallet address
 * Automatically invalidates all rewards cache on success
 */
export function useSaveWalletAddress() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (walletAddress: string) => {
      const res = await fetch('/api/rewards/wallet', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ walletAddress }),
      });

      if (!res.ok) {
        const error = await res.json().catch(() => ({}));
        throw new Error(error.error || 'Failed to save wallet address');
      }

      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.rewards.all });
    },
  });
}
