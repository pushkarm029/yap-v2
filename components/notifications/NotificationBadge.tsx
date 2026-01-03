'use client';

import { useUnreadNotificationCount } from '@/hooks/queries';

export default function NotificationBadge() {
  // TanStack Query with 30-second staleTime - no more refetch on every route change
  const { data } = useUnreadNotificationCount();
  const count = data?.count ?? 0;

  if (count === 0) return null;

  return (
    <span
      className="absolute -top-1 -right-1 bg-red-500 text-white text-xs font-bold rounded-full w-5 h-5 flex items-center justify-center"
      aria-label={`${count} unread notifications`}
    >
      {count > 9 ? '9+' : count}
    </span>
  );
}
