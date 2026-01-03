'use client';

import { useState } from 'react';
import dynamic from 'next/dynamic';
import { useSession } from 'next-auth/react';
import { BellRing } from 'lucide-react';
import { NotificationsListSkeleton } from '@/components/notifications';
import { PageHeader, DesktopHeader } from '@/components/layout';
import { usePushNotifications } from '@/hooks/usePushNotifications';
import { useMarkNotificationsRead } from '@/hooks/queries';

const NotificationsList = dynamic(() => import('@/components/notifications/NotificationsList'), {
  ssr: false,
  loading: () => <NotificationsListSkeleton count={8} />,
});

export default function NotificationsPage() {
  const { data: session, status } = useSession();
  const { permission, requestPermission } = usePushNotifications();
  const [markError, setMarkError] = useState<string | null>(null);

  const { mutate: markAllRead, isPending: isMarkingRead } = useMarkNotificationsRead({
    onSuccess: () => setMarkError(null),
    onError: (message) => setMarkError(message),
  });

  if (status === 'loading') {
    return (
      <>
        <PageHeader session={session} />
        <DesktopHeader title="Notifications" position="fixed" />
        <div className="pt-20 pb-20 lg:pt-0 lg:pb-0">
          <NotificationsListSkeleton count={8} />
        </div>
      </>
    );
  }

  return (
    <>
      <PageHeader session={session} />
      <DesktopHeader title="Notifications" position="fixed" />

      <div className="pt-20 pb-20 lg:pt-0 lg:pb-0">
        {/* Title bar */}
        <div className="flex items-center justify-between px-5 py-3 border-b border-gray-200">
          <h1 className="text-lg font-semibold text-gray-900">Notifications</h1>
          <div className="flex items-center gap-2">
            {markError && <span className="text-xs text-red-500">Failed</span>}
            <button
              onClick={() => markAllRead()}
              disabled={isMarkingRead}
              className="text-sm text-gray-500 hover:text-gray-700 transition-colors disabled:opacity-50"
            >
              {isMarkingRead ? 'Marking...' : markError ? 'Retry' : 'Mark all read'}
            </button>
          </div>
        </div>

        {/* Push Notification Permission Banner */}
        {permission === 'default' && (
          <div className="px-5 py-3 sm:py-4 border-b border-gray-200">
            <div className="flex items-start gap-4">
              <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center flex-shrink-0">
                <BellRing className="text-blue-600" size={20} />
              </div>
              <div className="flex-1">
                <h3 className="font-medium text-gray-900 mb-1">Enable Push Notifications</h3>
                <p className="text-sm text-gray-600 mb-3">
                  Get notified instantly when someone mentions you.
                </p>
                <button
                  onClick={requestPermission}
                  className="bg-gray-900 text-white px-4 py-2 rounded-full text-sm font-medium hover:bg-gray-800 transition-colors"
                >
                  Enable Notifications
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Notifications List */}
        <NotificationsList />
      </div>
    </>
  );
}
