import { QueryClient } from '@tanstack/react-query';

/**
 * Creates a new QueryClient instance with optimized defaults for Yap.Network
 *
 * staleTime recommendations:
 * - Feed: 1 min (users expect fresh content)
 * - Profile: 5 min (rarely changes)
 * - Notifications: 30 sec (time-sensitive)
 * - Limits: 30 sec (changes after actions)
 * - Rewards: 2 min (updates at midnight)
 */
export function makeQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: {
        // Data is fresh for 2 minutes by default
        staleTime: 1000 * 60 * 2,
        // Keep unused data in cache for 10 minutes
        gcTime: 1000 * 60 * 10,
        // Retry failed requests twice
        retry: 2,
        // Refetch when window regains focus
        refetchOnWindowFocus: true,
        // Refetch when network reconnects
        refetchOnReconnect: true,
        // Don't refetch on mount if data is fresh
        refetchOnMount: true,
      },
      mutations: {
        // Retry mutations once
        retry: 1,
      },
    },
  });
}

// Browser: singleton instance
// Server: new instance per request
let browserQueryClient: QueryClient | undefined;

export function getQueryClient() {
  if (typeof window === 'undefined') {
    // Server: always create a new QueryClient
    return makeQueryClient();
  }

  // Browser: reuse existing client or create new one
  if (!browserQueryClient) {
    browserQueryClient = makeQueryClient();
  }
  return browserQueryClient;
}
