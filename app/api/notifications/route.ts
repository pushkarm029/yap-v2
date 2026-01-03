import {
  db,
  NotificationWithDetails,
  SYSTEM_USER_ID,
  GAMIFIED_NOTIFICATION_TYPES,
} from '@/lib/database';
import { apiLogger } from '@/lib/logger';
import { Notification, GamifiedNotificationMetadata } from '@/lib/types/notifications';
import { requireAuth, isAuthError, ok, serverError } from '@/lib/api';

export const dynamic = 'force-dynamic';

/**
 * Transform database notification to API response format
 *
 * This function enforces the contract defined in lib/types/notifications.ts:
 * - vote_power only included for upvote notifications
 * - post object only included when post_id exists
 * - is_read (integer) converted to read (boolean)
 * - metadata parsed and included for gamified notifications
 * - isSystem flag set for system-generated notifications
 */
function transformNotification(n: NotificationWithDetails): Notification {
  // Check if this is a system (gamified) notification
  const isSystem =
    n.actor_id === SYSTEM_USER_ID ||
    GAMIFIED_NOTIFICATION_TYPES.includes(n.type as (typeof GAMIFIED_NOTIFICATION_TYPES)[number]);

  // Parse metadata for gamified notifications
  let metadata: GamifiedNotificationMetadata | undefined;
  if (n.metadata && isSystem) {
    try {
      metadata = JSON.parse(n.metadata);
    } catch (parseError) {
      apiLogger.warn(
        {
          notificationId: n.id,
          notificationType: n.type,
          metadataPreview: n.metadata.substring(0, 100),
          error: parseError,
        },
        'Failed to parse notification metadata'
      );
    }
  }

  return {
    id: n.id,
    type: n.type,
    read: n.is_read === 1,
    created_at: n.created_at,
    vote_power: n.type === 'upvote' && n.vote_power != null ? n.vote_power : undefined,
    post: n.post_id
      ? {
          id: n.post_id,
          content: n.post_content || '',
        }
      : undefined,
    metadata,
    isSystem,
    title: n.title,
    body: n.body,
  };
}

export async function GET() {
  try {
    const authResult = await requireAuth();
    if (isAuthError(authResult)) return authResult;
    const { userId } = authResult;

    const rawNotifications = await db.getNotificationsForUser(userId);
    const notifications = rawNotifications.map(transformNotification);

    apiLogger.info({ userId, count: notifications.length }, 'Notifications fetched');
    return ok({ notifications });
  } catch (error) {
    apiLogger.error({ error }, 'Error fetching notifications');
    return serverError('Failed to fetch notifications');
  }
}

export async function POST() {
  try {
    const authResult = await requireAuth();
    if (isAuthError(authResult)) return authResult;
    const { userId } = authResult;

    await db.markNotificationsAsRead(userId);

    apiLogger.info({ userId }, 'Notifications marked as read');
    return ok({ success: true });
  } catch (error) {
    apiLogger.error({ error }, 'Error marking notifications as read');
    return serverError('Failed to mark notifications as read');
  }
}
