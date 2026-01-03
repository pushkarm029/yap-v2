import webpush from 'web-push';
import { pushLogger } from './logger';
import { db } from './database';
import { ANONYMOUS_PUSH_ICON } from './utils/notifications';

// Initialize web-push with VAPID details
if (process.env.VAPID_PUBLIC_KEY && process.env.VAPID_PRIVATE_KEY && process.env.VAPID_EMAIL) {
  // Ensure email is in mailto: format
  const vapidEmail = process.env.VAPID_EMAIL.startsWith('mailto:')
    ? process.env.VAPID_EMAIL
    : `mailto:${process.env.VAPID_EMAIL}`;

  webpush.setVapidDetails(vapidEmail, process.env.VAPID_PUBLIC_KEY, process.env.VAPID_PRIVATE_KEY);
} else {
  pushLogger.warn('VAPID keys not configured. Push notifications will not work.');
}

export interface PushPayload {
  title: string;
  body: string;
  url: string;
  icon?: string;
}

export interface PushSubscriptionData {
  endpoint: string;
  p256dh: string;
  auth: string;
}

export async function sendPushNotification(
  subscription: PushSubscriptionData,
  payload: PushPayload
): Promise<boolean> {
  try {
    await webpush.sendNotification(
      {
        endpoint: subscription.endpoint,
        keys: {
          p256dh: subscription.p256dh,
          auth: subscription.auth,
        },
      },
      JSON.stringify(payload)
    );
    return true;
  } catch (error) {
    pushLogger.error({ error, endpoint: subscription.endpoint }, 'Push notification failed');
    // Don't throw - push failure shouldn't break post creation
    return false;
  }
}

/**
 * Send anonymous push notifications to all of a user's subscriptions
 *
 * Handles:
 * - Fetching all user subscriptions
 * - Sending to each subscription
 * - Tracking success/failure counts
 * - Logging with context
 *
 * @param userId - The user ID to send push notifications to
 * @param payload - The notification payload (title, body, url)
 * @param context - Optional context for logging (e.g., postId, eventType)
 * @returns Object with sent count and total subscriptions
 */
export async function sendPushToUser(
  userId: string,
  payload: Omit<PushPayload, 'icon'>,
  context?: Record<string, unknown>
): Promise<{ sent: number; total: number }> {
  try {
    const subscriptions = await db.getPushSubscriptions(userId);

    if (subscriptions.length === 0) {
      return { sent: 0, total: 0 };
    }

    let sent = 0;
    for (const sub of subscriptions) {
      const success = await sendPushNotification(sub, {
        ...payload,
        icon: ANONYMOUS_PUSH_ICON,
      });
      if (success) sent++;
    }

    if (subscriptions.length > 0) {
      pushLogger.debug(
        { userId, sent, total: subscriptions.length, ...context },
        'Push notifications sent'
      );
    }

    return { sent, total: subscriptions.length };
  } catch (error) {
    pushLogger.warn({ error, userId, ...context }, 'Failed to send push notifications');
    return { sent: 0, total: 0 };
  }
}
