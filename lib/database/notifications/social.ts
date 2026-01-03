// Notifications: Social notification operations
// Domain: User-to-user notifications (upvotes, mentions, follows)

import { randomUUID } from 'crypto';
import { dbLogger } from '../../logger';
import { getClient } from '../client';
import type { NotificationWithDetails, SocialNotificationType } from '../types';

/**
 * Create a notification with deduplication.
 * If a notification with the same actor+type+post already exists, it updates the timestamp.
 * This prevents spam when someone upvotes/removes/upvotes again.
 */
export async function createNotification(
  recipientId: string,
  actorId: string,
  type: SocialNotificationType,
  postId: string | null = null
): Promise<string | null> {
  // Don't notify yourself
  if (recipientId === actorId) {
    return null;
  }

  try {
    const id = randomUUID();

    // Use INSERT OR REPLACE for deduplication
    // The unique index on (recipient_id, actor_id, type, COALESCE(post_id, '')) handles duplicates
    await getClient().execute({
      sql: `INSERT OR REPLACE INTO notifications (id, recipient_id, actor_id, type, post_id, is_read, created_at)
            VALUES (?, ?, ?, ?, ?, 0, CURRENT_TIMESTAMP)`,
      args: [id, recipientId, actorId, type, postId],
    });

    dbLogger.debug({ recipientId, actorId, type, postId }, 'Notification created');
    return id;
  } catch (error) {
    dbLogger.error({ error, recipientId, actorId, type }, 'Error creating notification');
    return null;
  }
}

/**
 * Create a notification with pre-generated message.
 * Message is stored in DB for consistent display across push and in-app.
 *
 * @param notificationId - Pre-generated UUID (used for deterministic anonymous name)
 * @param recipientId - User receiving the notification
 * @param actorId - User who triggered the notification
 * @param type - Social notification type
 * @param postId - Related post (optional)
 * @param title - Pre-generated notification title
 * @param body - Pre-generated notification body (includes anonymous name)
 */
export async function createNotificationWithMessage(
  notificationId: string,
  recipientId: string,
  actorId: string,
  type: SocialNotificationType,
  postId: string | null,
  title: string,
  body: string
): Promise<string | null> {
  // Don't notify yourself
  if (recipientId === actorId) {
    return null;
  }

  try {
    // Use INSERT OR REPLACE for deduplication
    await getClient().execute({
      sql: `INSERT OR REPLACE INTO notifications
            (id, recipient_id, actor_id, type, post_id, is_read, created_at, title, body)
            VALUES (?, ?, ?, ?, ?, 0, CURRENT_TIMESTAMP, ?, ?)`,
      args: [notificationId, recipientId, actorId, type, postId, title, body],
    });

    dbLogger.debug(
      { recipientId, actorId, type, postId, title },
      'Notification with message created'
    );
    return notificationId;
  } catch (error) {
    dbLogger.error(
      { error, recipientId, actorId, type },
      'Error creating notification with message'
    );
    return null;
  }
}

/**
 * Create mention notifications for multiple users
 */
export async function createMentionNotifications(
  postId: string,
  actorId: string,
  recipientIds: string[]
): Promise<void> {
  if (recipientIds.length === 0) return;

  try {
    const statements = recipientIds
      .filter((recipientId) => recipientId !== actorId) // Don't notify yourself
      .map((recipientId) => ({
        sql: `INSERT OR REPLACE INTO notifications (id, recipient_id, actor_id, type, post_id, is_read, created_at)
              VALUES (?, ?, ?, 'mention', ?, 0, CURRENT_TIMESTAMP)`,
        args: [randomUUID(), recipientId, actorId, postId],
      }));

    if (statements.length > 0) {
      await getClient().batch(statements, 'write');
      dbLogger.debug(
        { postId, actorId, count: statements.length },
        'Mention notifications created'
      );
    }
  } catch (error) {
    dbLogger.error({ error, postId, actorId }, 'Error creating mention notifications');
  }
}

/**
 * Get notifications for a user with post details and vote power
 */
export async function getNotificationsForUser(
  userId: string,
  limit = 50
): Promise<NotificationWithDetails[]> {
  try {
    const result = await getClient().execute({
      sql: `SELECT
              n.id,
              n.type,
              n.created_at || 'Z' as created_at,
              n.is_read,
              n.post_id,
              n.actor_id,
              n.metadata,
              n.title,
              n.body,
              p.content as post_content,
              CASE WHEN n.type = 'upvote' THEN uv.vote_weight ELSE NULL END as vote_power
            FROM notifications n
            LEFT JOIN posts p ON n.post_id = p.id
            LEFT JOIN upvotes uv ON n.type = 'upvote'
              AND n.actor_id = uv.user_id
              AND n.post_id = uv.post_id
            WHERE n.recipient_id = ?
            ORDER BY n.created_at DESC
            LIMIT ?`,
      args: [userId, limit],
    });

    return result.rows as unknown as NotificationWithDetails[];
  } catch (error) {
    dbLogger.error({ error, userId }, 'Error getting notifications');
    return [];
  }
}

/**
 * Get count of unread notifications
 */
export async function getUnreadNotificationCount(userId: string): Promise<number> {
  try {
    const result = await getClient().execute({
      sql: 'SELECT COUNT(*) as count FROM notifications WHERE recipient_id = ? AND is_read = 0',
      args: [userId],
    });

    return (result.rows[0]?.count as number) || 0;
  } catch (error) {
    dbLogger.error({ error, userId }, 'Error getting unread count');
    return 0;
  }
}

/**
 * Mark all notifications as read for a user
 */
export async function markNotificationsAsRead(userId: string): Promise<void> {
  try {
    await getClient().execute({
      sql: 'UPDATE notifications SET is_read = 1 WHERE recipient_id = ? AND is_read = 0',
      args: [userId],
    });
    dbLogger.debug({ userId }, 'Notifications marked as read');
  } catch (error) {
    dbLogger.error({ error, userId }, 'Error marking notifications as read');
  }
}
