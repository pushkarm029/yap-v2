'use client';

import { useRouter } from 'next/navigation';
import { ErrorState } from '@/components/ui';
import { Bell } from 'lucide-react';
import { useNotifications } from '@/hooks/queries';
import { NotificationsListSkeleton } from './NotificationsListSkeleton';
import { getNotificationIcon, getGamifiedNotificationAction } from '@/lib/utils/notifications';
import { safeFormatTimeAgo } from '@/lib/utils/dates';

export default function NotificationsList() {
  const { data, isLoading, error, refetch } = useNotifications();
  const router = useRouter();

  const notifications = data?.notifications || [];

  if (isLoading) {
    return <NotificationsListSkeleton count={6} />;
  }

  if (error) {
    return <ErrorState message="Failed to load notifications" onRetry={() => refetch()} />;
  }

  if (notifications.length === 0) {
    return (
      <div className="text-center p-12">
        <div className="w-14 h-14 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <Bell size={24} className="text-gray-400" />
        </div>
        <p className="text-lg font-medium text-gray-500">No notifications yet</p>
        <p className="text-sm text-gray-400 mt-1">
          When someone mentions you or upvotes your post, you&apos;ll see it here.
        </p>
      </div>
    );
  }

  return (
    <div>
      {notifications.map((notification) => {
        const clickUrl = notification.isSystem
          ? getGamifiedNotificationAction(notification.type, notification.metadata)?.url
          : notification.post?.id
            ? `/posts/${notification.post.id}`
            : undefined;
        const isClickable = !!clickUrl;
        const isUnread = !notification.read;

        return (
          <div
            key={notification.id}
            className={`px-5 py-3 sm:py-4 border-b border-gray-200 last:border-b-0 transition-colors ${
              isUnread ? 'bg-gray-50' : ''
            } ${isClickable ? 'hover:bg-gray-100 cursor-pointer' : ''}`}
            onClick={isClickable ? () => router.push(clickUrl) : undefined}
          >
            <div className="flex gap-4">
              <div className="w-10 h-10 flex items-center justify-center flex-shrink-0 text-xl">
                {getNotificationIcon(notification.type)}
              </div>
              <div className="flex-1 min-w-0">
                <p
                  className={`text-sm sm:text-base leading-relaxed ${
                    isUnread ? 'font-medium text-gray-900' : 'text-gray-700'
                  }`}
                >
                  {notification.body}
                </p>
                {!notification.isSystem && notification.post?.content && (
                  <p className="text-sm text-gray-500 mt-1 truncate">
                    &quot;{notification.post.content}&quot;
                  </p>
                )}
                <p className="text-xs text-gray-400 mt-2">
                  {safeFormatTimeAgo(notification.created_at)}
                </p>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
