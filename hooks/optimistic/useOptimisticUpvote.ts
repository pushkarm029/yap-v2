'use client';

import { useState, useCallback, useRef, useEffect } from 'react';
import { useUpvote, useRewardsScore, InviteRequiredError } from '@/hooks/queries';
import { useUIStore } from '@/stores/uiStore';
import { DEBOUNCE_MS, type AnimationTrigger } from './types';

interface UseOptimisticUpvoteOptions {
  postId: string;
  initialUpvoted: boolean;
  initialCount: number;
  onError?: (message: string) => void;
}

interface UseOptimisticUpvoteReturn {
  upvoted: boolean;
  count: number;
  votePower: number;
  animationTrigger: AnimationTrigger;
  toggle: () => void;
  clearAnimation: () => void;
}

/**
 * Optimistic upvote hook with debounced server sync
 *
 * Allows rapid toggling - UI updates immediately, server call is debounced.
 * Only the final state gets sent after user stops clicking.
 */
export function useOptimisticUpvote({
  postId,
  initialUpvoted,
  initialCount,
  onError,
}: UseOptimisticUpvoteOptions): UseOptimisticUpvoteReturn {
  // Local optimistic state (what user sees)
  const [upvoted, setUpvoted] = useState(initialUpvoted);
  const [count, setCount] = useState(initialCount);
  const [animationTrigger, setAnimationTrigger] = useState<AnimationTrigger>(null);

  // Server-confirmed state (for rollback on error)
  const serverState = useRef({ upvoted: initialUpvoted, count: initialCount });

  // Track pending state for debounced callback (fixes stale closure)
  const pendingState = useRef({ upvoted: initialUpvoted, count: initialCount });

  // Track last synced props to avoid redundant setState calls
  const lastSyncedProps = useRef({ upvoted: initialUpvoted, count: initialCount });

  // Debounce timer
  const debounceTimer = useRef<NodeJS.Timeout | null>(null);

  // Track if component is mounted (prevents setState on unmounted)
  const isMounted = useRef(true);

  // Get vote power from rewards
  const { data: scoreData } = useRewardsScore();
  const votePower = scoreData?.votePower ?? 1;

  // Keep votePower ref in sync (fixes stale closure in debounce)
  const votePowerRef = useRef(votePower);
  useEffect(() => {
    votePowerRef.current = votePower;
  }, [votePower]);

  // UI store for invite modal
  const openInviteModal = useUIStore((state) => state.openInviteModal);

  // The underlying mutation
  const mutation = useUpvote();

  // Sync with server data when it changes (e.g., from refetch)
  // This effect intentionally syncs local optimistic state with server-confirmed props.
  // We track lastSyncedProps to prevent redundant updates and only sync when:
  // 1. Props actually changed from server refetch
  // 2. No debounce timer active (user not actively clicking)
  // 3. No mutation in flight
  useEffect(() => {
    const propsChanged =
      lastSyncedProps.current.upvoted !== initialUpvoted ||
      lastSyncedProps.current.count !== initialCount;

    if (propsChanged && !debounceTimer.current && !mutation.isPending) {
      lastSyncedProps.current = { upvoted: initialUpvoted, count: initialCount };
      // eslint-disable-next-line react-hooks/set-state-in-effect -- Intentional sync with server data
      setUpvoted(initialUpvoted);
      setCount(initialCount);
      serverState.current = { upvoted: initialUpvoted, count: initialCount };
      pendingState.current = { upvoted: initialUpvoted, count: initialCount };
    }
  }, [initialUpvoted, initialCount, mutation.isPending]);

  // Cleanup on unmount
  useEffect(() => {
    isMounted.current = true;
    return () => {
      isMounted.current = false;
      if (debounceTimer.current) {
        clearTimeout(debounceTimer.current);
      }
    };
  }, []);

  const toggle = useCallback(() => {
    // Read from pending state (not stale closure)
    const currentUpvoted = pendingState.current.upvoted;
    const currentCount = pendingState.current.count;
    const power = votePowerRef.current;

    const newUpvoted = !currentUpvoted;
    const newCount = newUpvoted ? currentCount + power : Math.max(0, currentCount - power);

    // Update pending state immediately
    pendingState.current = { upvoted: newUpvoted, count: newCount };

    // IMMEDIATE: Update UI
    setUpvoted(newUpvoted);
    setCount(newCount);
    setAnimationTrigger(newUpvoted ? 'upvote' : 'remove');

    // Clear existing debounce timer
    if (debounceTimer.current) {
      clearTimeout(debounceTimer.current);
    }

    // DEBOUNCED: Send to server after delay
    debounceTimer.current = setTimeout(() => {
      debounceTimer.current = null;

      // Read latest pending state (not stale closure)
      const finalUpvoted = pendingState.current.upvoted;

      // Only call API if state differs from server-confirmed state
      if (finalUpvoted !== serverState.current.upvoted) {
        mutation.mutate(
          {
            postId,
            currentlyUpvoted: serverState.current.upvoted,
            voteWeight: votePowerRef.current,
          },
          {
            onSuccess: (data) => {
              if (!isMounted.current) return;

              serverState.current = {
                upvoted: data.upvoted,
                count: data.upvoteCount,
              };
              pendingState.current = {
                upvoted: data.upvoted,
                count: data.upvoteCount,
              };
              setUpvoted(data.upvoted);
              setCount(data.upvoteCount);
            },
            onError: (error) => {
              if (!isMounted.current) return;

              console.error('[useOptimisticUpvote] Sync failed:', {
                postId,
                error: error.message,
              });

              setUpvoted(serverState.current.upvoted);
              setCount(serverState.current.count);
              pendingState.current = { ...serverState.current };

              if (error instanceof InviteRequiredError) {
                openInviteModal();
                return;
              }

              onError?.(error.message || 'Failed to upvote');
            },
          }
        );
      }
    }, DEBOUNCE_MS);
  }, [postId, mutation, openInviteModal, onError]);

  const clearAnimation = useCallback(() => {
    setAnimationTrigger(null);
  }, []);

  return {
    upvoted,
    count,
    votePower,
    animationTrigger,
    toggle,
    clearAnimation,
  };
}
