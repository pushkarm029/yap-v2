'use client';

import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useSession } from 'next-auth/react';
import { queryKeys } from '@/lib/queryKeys';

export interface DailyLimit {
  remaining: number;
  limit: number;
  used: number;
}

export interface LimitsResponse {
  total: DailyLimit | null;
}

/**
 * Fetch daily action limits
 *
 * This is used by multiple components:
 * - ComposeBox (check before posting)
 * - CommentForm (check before commenting)
 * - ActionLimitsIndicator (display remaining)
 *
 * With TanStack Query, these all share the same cached data,
 * eliminating duplicate requests.
 */
export function useLimitsQuery() {
  const { status } = useSession();

  return useQuery({
    queryKey: queryKeys.limits.daily(),
    queryFn: async (): Promise<LimitsResponse> => {
      const res = await fetch('/api/user/limits');
      if (!res.ok) {
        throw new Error('Failed to fetch limits');
      }
      return res.json();
    },
    // Limits change frequently after actions
    staleTime: 1000 * 30, // 30 seconds
    // Only fetch when authenticated
    enabled: status === 'authenticated',
  });
}

/**
 * Hook to get just the remaining limit count
 * Convenience wrapper for common use case
 */
export function useRemainingLimit() {
  const { data, isLoading } = useLimitsQuery();
  return {
    remaining: data?.total?.remaining ?? null,
    isLoading,
  };
}

/**
 * Hook to check if user can perform an action
 */
export function useCanPerformAction() {
  const { data, isLoading } = useLimitsQuery();
  return {
    canPerform: (data?.total?.remaining ?? 0) > 0,
    isLoading,
  };
}

/**
 * Hook to invalidate limits cache
 * Call this after any action that consumes a limit
 */
export function useInvalidateLimits() {
  const queryClient = useQueryClient();

  return () => {
    queryClient.invalidateQueries({ queryKey: queryKeys.limits.daily() });
  };
}
