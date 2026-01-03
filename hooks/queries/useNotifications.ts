'use client';

import { useEffect, useRef, useCallback } from 'react';
import { useQuery, useQueryClient, useMutation } from '@tanstack/react-query';
import { useSession } from 'next-auth/react';
import { queryKeys } from '@/lib/queryKeys';
import type {
  NotificationsResponse,
  Notification,
  MarkNotificationsReadResponse,
} from '@/lib/types/notifications';

// Re-export shared types for consumers
export type {
  Notification,
  NotificationsResponse,
  MarkNotificationsReadResponse,
} from '@/lib/types/notifications';

/**
 * Fetch notifications list
 */
export function useNotifications() {
  const { data: session } = useSession();

  return useQuery({
    queryKey: queryKeys.notifications.list(),
    queryFn: async (): Promise<NotificationsResponse> => {
      const res = await fetch('/api/notifications');
      if (!res.ok) {
        throw new Error('Failed to fetch notifications');
      }
      return res.json();
    },
    enabled: !!session?.user?.id,
  });
}

/**
 * Fetch unread notification count with SSE real-time updates.
 *
 * Uses Server-Sent Events for real-time updates when the app is open.
 * Falls back to polling if SSE connection fails.
 */
export function useUnreadNotificationCount() {
  const { data: session } = useSession();
  const queryClient = useQueryClient();
  const eventSourceRef = useRef<EventSource | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const reconnectAttemptsRef = useRef(0);
  const MAX_RECONNECT_ATTEMPTS = 5;

  // SSE connection management
  useEffect(() => {
    if (!session?.user?.id) return;

    const connect = () => {
      // Clean up existing connection
      if (eventSourceRef.current) {
        eventSourceRef.current.close();
      }

      try {
        const eventSource = new EventSource('/api/notifications/stream');
        eventSourceRef.current = eventSource;

        eventSource.onopen = () => {
          // Reset reconnect attempts on successful connection
          reconnectAttemptsRef.current = 0;
        };

        eventSource.onmessage = (event) => {
          try {
            const data = JSON.parse(event.data);
            // Validate the response shape before updating cache
            if (typeof data?.count === 'number') {
              queryClient.setQueryData(queryKeys.notifications.unreadCount(), {
                count: data.count,
              });
            } else {
              console.warn('[SSE] Received malformed notification count data:', data);
            }
          } catch (parseError) {
            console.warn('[SSE] Failed to parse notification update:', event.data, parseError);
          }
        };

        eventSource.onerror = () => {
          eventSource.close();
          eventSourceRef.current = null;
          reconnectAttemptsRef.current++;

          // Don't schedule reconnect if we've hit max attempts
          if (reconnectAttemptsRef.current >= MAX_RECONNECT_ATTEMPTS) {
            console.debug('[SSE] Max reconnect attempts reached, falling back to polling');
            return;
          }

          // Exponential backoff: 5s, 10s, 20s, 40s, 80s
          const delay = Math.min(5000 * Math.pow(2, reconnectAttemptsRef.current - 1), 80000);
          reconnectTimeoutRef.current = setTimeout(connect, delay);
        };
      } catch (connectionError) {
        // SSE not supported or failed to initialize, will fall back to polling
        console.debug(
          '[SSE] Failed to establish connection, falling back to polling:',
          connectionError
        );
      }
    };

    connect();

    return () => {
      if (eventSourceRef.current) {
        eventSourceRef.current.close();
        eventSourceRef.current = null;
      }
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
        reconnectTimeoutRef.current = null;
      }
    };
  }, [session?.user?.id, queryClient]);

  // Fallback polling query (also provides initial data)
  return useQuery({
    queryKey: queryKeys.notifications.unreadCount(),
    queryFn: async (): Promise<{ count: number }> => {
      const res = await fetch('/api/notifications/unread-count');
      if (!res.ok) {
        throw new Error('Failed to fetch unread count');
      }
      return res.json();
    },
    // Longer staleTime since SSE handles real-time updates
    staleTime: 1000 * 60, // 1 minute (SSE provides real-time)
    refetchInterval: 1000 * 60, // Fallback polling every minute
    enabled: !!session?.user?.id,
  });
}

/**
 * Hook to invalidate notification caches
 */
export function useInvalidateNotifications() {
  const queryClient = useQueryClient();

  return useCallback(() => {
    queryClient.invalidateQueries({ queryKey: queryKeys.notifications.all });
  }, [queryClient]);
}

interface UseMarkNotificationsReadOptions {
  onSuccess?: () => void;
  onError?: (message: string) => void;
}

/**
 * Mutation hook to mark all notifications as read
 */
export function useMarkNotificationsRead(options: UseMarkNotificationsReadOptions = {}) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (): Promise<MarkNotificationsReadResponse> => {
      const res = await fetch('/api/notifications', { method: 'POST' });
      if (!res.ok) {
        const errorBody = await res.json().catch(() => ({}));
        throw new Error(errorBody.error || `Failed to mark notifications as read (${res.status})`);
      }
      return res.json();
    },
    onSuccess: () => {
      // Update notifications to read state
      queryClient.setQueryData<NotificationsResponse>(queryKeys.notifications.list(), (old) => {
        if (!old) return old;
        return {
          notifications: old.notifications.map((n: Notification) => ({ ...n, read: true })),
        };
      });
      // Reset unread count
      queryClient.setQueryData(queryKeys.notifications.unreadCount(), { count: 0 });
      options.onSuccess?.();
    },
    onError: (error: Error) => {
      console.error('[useMarkNotificationsRead] Failed:', error.message);
      options.onError?.(error.message);
    },
  });
}
