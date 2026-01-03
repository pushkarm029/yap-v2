'use client';

import { useState, useCallback, useRef, useEffect } from 'react';
import { useFollowUser, InviteRequiredError } from '@/hooks/queries';
import { useUIStore } from '@/stores/uiStore';
import { DEBOUNCE_MS } from './types';

interface UseOptimisticFollowOptions {
  username: string;
  initialFollowing: boolean;
  onFollowChange?: (following: boolean, followerCount: number) => void;
  onError?: (message: string) => void;
}

interface UseOptimisticFollowReturn {
  following: boolean;
  toggle: () => void;
}

/**
 * Optimistic follow hook with debounced server sync
 *
 * Allows rapid toggling - UI updates immediately, server call is debounced.
 * Only the final state gets sent after user stops clicking.
 */
export function useOptimisticFollow({
  username,
  initialFollowing,
  onFollowChange,
  onError,
}: UseOptimisticFollowOptions): UseOptimisticFollowReturn {
  // Local optimistic state (what user sees)
  const [following, setFollowing] = useState(initialFollowing);

  // Server-confirmed state (for rollback on error)
  const serverState = useRef({ following: initialFollowing });

  // Track pending state for debounced callback (fixes stale closure)
  const pendingState = useRef({ following: initialFollowing });

  // Track last synced props to avoid redundant setState calls
  const lastSyncedProps = useRef({ following: initialFollowing });

  // Debounce timer
  const debounceTimer = useRef<NodeJS.Timeout | null>(null);

  // Track if component is mounted (prevents setState on unmounted)
  const isMounted = useRef(true);

  // UI store for invite modal
  const openInviteModal = useUIStore((state) => state.openInviteModal);

  // The underlying mutation
  const mutation = useFollowUser();

  // Sync with server data when it changes (e.g., from refetch)
  // This effect intentionally syncs local optimistic state with server-confirmed props.
  // We track lastSyncedProps to prevent redundant updates and only sync when:
  // 1. Props actually changed from server refetch
  // 2. No debounce timer active (user not actively clicking)
  // 3. No mutation in flight
  useEffect(() => {
    const propsChanged = lastSyncedProps.current.following !== initialFollowing;

    if (propsChanged && !debounceTimer.current && !mutation.isPending) {
      lastSyncedProps.current = { following: initialFollowing };
      // eslint-disable-next-line react-hooks/set-state-in-effect -- Intentional sync with server data
      setFollowing(initialFollowing);
      serverState.current = { following: initialFollowing };
      pendingState.current = { following: initialFollowing };
    }
  }, [initialFollowing, mutation.isPending]);

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
    const currentFollowing = pendingState.current.following;
    const newFollowing = !currentFollowing;

    // Update pending state immediately
    pendingState.current = { following: newFollowing };

    // IMMEDIATE: Update UI
    setFollowing(newFollowing);

    // Clear existing debounce timer
    if (debounceTimer.current) {
      clearTimeout(debounceTimer.current);
    }

    // DEBOUNCED: Send to server after delay
    debounceTimer.current = setTimeout(() => {
      debounceTimer.current = null;

      // Read latest pending state (not stale closure)
      const finalFollowing = pendingState.current.following;

      // Only call API if state differs from server-confirmed state
      if (finalFollowing !== serverState.current.following) {
        mutation.mutate(
          {
            username,
            currentlyFollowing: serverState.current.following,
          },
          {
            onSuccess: (data) => {
              if (!isMounted.current) return;

              serverState.current = { following: data.following };
              pendingState.current = { following: data.following };
              setFollowing(data.following);
              onFollowChange?.(data.following, data.followerCount);
            },
            onError: (error) => {
              if (!isMounted.current) return;

              console.error('[useOptimisticFollow] Sync failed:', {
                username,
                error: error.message,
              });

              setFollowing(serverState.current.following);
              pendingState.current = { ...serverState.current };

              if (error instanceof InviteRequiredError) {
                openInviteModal();
                return;
              }

              onError?.(error.message || 'Failed to update follow status');
            },
          }
        );
      }
    }, DEBOUNCE_MS);
  }, [username, mutation, onFollowChange, onError, openInviteModal]);

  return {
    following,
    toggle,
  };
}
