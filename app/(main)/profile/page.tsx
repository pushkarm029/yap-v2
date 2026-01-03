'use client';

import { useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import LoadingSpinner from '@/components/ui/LoadingSpinner';

/**
 * Profile redirect page.
 *
 * Redirects authenticated users to their own profile page (/[username]).
 * Auth redirect to /login is handled by the (main) layout.
 */
export default function ProfilePage() {
  const { data: session, status } = useSession();
  const router = useRouter();

  useEffect(() => {
    if (status === 'authenticated' && session?.user?.username) {
      // Redirect to the user's profile page
      router.push(`/${session.user.username}`);
    }
  }, [status, session, router]);

  return (
    <div className="flex min-h-screen items-center justify-center">
      <LoadingSpinner />
    </div>
  );
}
