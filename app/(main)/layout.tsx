'use client';

import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';

/**
 * Layout for authenticated routes.
 *
 * Centralizes the auth redirect logic that was previously duplicated
 * across 6 pages (explore, rewards, notifications, settings, profile, profile/edit).
 *
 * Pages in this group can assume the user is authenticated and focus on
 * their specific functionality without repeating auth checks.
 */
export default function MainLayout({ children }: { children: React.ReactNode }) {
  const { status } = useSession();
  const router = useRouter();

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/login');
    }
  }, [status, router]);

  // Hide content while redirecting unauthenticated users
  if (status === 'unauthenticated') {
    return null;
  }

  return <>{children}</>;
}
