import { NotificationSkeleton } from './NotificationSkeleton';

interface NotificationsListSkeletonProps {
  count?: number;
}

export function NotificationsListSkeleton({ count = 8 }: NotificationsListSkeletonProps) {
  return (
    <div>
      {Array.from({ length: count }).map((_, i) => (
        <NotificationSkeleton key={`notification-skeleton-${i}`} />
      ))}
    </div>
  );
}
