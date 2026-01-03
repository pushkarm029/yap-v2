'use client';

import { QueryClientProvider } from '@tanstack/react-query';
import { ReactQueryDevtools } from '@tanstack/react-query-devtools';
import { SessionProvider } from 'next-auth/react';
import { WalletProvider } from '@/components/solana';
import { getQueryClient } from '@/lib/queryClient';

interface ProvidersProps {
  children: React.ReactNode;
}

/**
 * Client-side providers wrapper
 *
 * Order matters:
 * 1. QueryClientProvider - Data fetching/caching (outermost for widest access)
 * 2. SessionProvider - Authentication
 * 3. WalletProvider - Solana wallet (auto-selects desktop vs mobile strategy)
 */
export function Providers({ children }: ProvidersProps) {
  const queryClient = getQueryClient();

  return (
    <QueryClientProvider client={queryClient}>
      <SessionProvider>
        <WalletProvider>{children}</WalletProvider>
      </SessionProvider>
      {process.env.NODE_ENV === 'development' && (
        <ReactQueryDevtools initialIsOpen={false} buttonPosition="bottom-left" />
      )}
    </QueryClientProvider>
  );
}
