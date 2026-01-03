// Notifications: Gamified notifications and rate limiting
// Domain: System-generated notifications (streaks, milestones), daily limits

import { randomUUID } from 'crypto';
import { dbLogger } from '../../logger';
import { getTodayUTC } from '../../utils/dates';
import { getClient } from '../client';
import {
  SYSTEM_USER_ID,
  type GamifiedNotificationType,
  type GamifiedNotificationMetadata,
} from '../types';

/**
 * Create a system-generated gamified notification
 * Uses SYSTEM_USER_ID as actor (sentinel approach)
 */
export async function createSystemNotification(
  recipientId: string,
  type: GamifiedNotificationType,
  metadata: GamifiedNotificationMetadata
): Promise<string | null> {
  try {
    const id = randomUUID();

    await getClient().execute({
      sql: `INSERT INTO notifications (id, recipient_id, actor_id, type, post_id, is_read, created_at, metadata)
            VALUES (?, ?, ?, ?, NULL, 0, CURRENT_TIMESTAMP, ?)`,
      args: [id, recipientId, SYSTEM_USER_ID, type, JSON.stringify(metadata)],
    });

    dbLogger.debug({ recipientId, type, metadata }, 'System notification created');
    return id;
  } catch (error) {
    dbLogger.error({ error, recipientId, type }, 'Error creating system notification');
    return null;
  }
}

/**
 * Create a system-generated gamified notification with pre-generated message.
 * Message is stored in DB for consistent display across push and in-app.
 */
export async function createSystemNotificationWithMessage(
  recipientId: string,
  type: GamifiedNotificationType,
  metadata: GamifiedNotificationMetadata,
  title: string,
  body: string
): Promise<string | null> {
  try {
    const id = randomUUID();

    await getClient().execute({
      sql: `INSERT INTO notifications
            (id, recipient_id, actor_id, type, post_id, is_read, created_at, metadata, title, body)
            VALUES (?, ?, ?, ?, NULL, 0, CURRENT_TIMESTAMP, ?, ?, ?)`,
      args: [id, recipientId, SYSTEM_USER_ID, type, JSON.stringify(metadata), title, body],
    });

    dbLogger.debug({ recipientId, type, title }, 'System notification with message created');
    return id;
  } catch (error) {
    dbLogger.error({ error, recipientId, type }, 'Error creating system notification with message');
    return null;
  }
}

// ============ GAMIFIED NOTIFICATION RATE LIMITING ============

/** Maximum gamified notifications a user can receive per day */
const DAILY_GAMIFIED_NOTIFICATION_LIMIT = 20;

/**
 * Check if user can receive a gamified notification today
 * Resets at midnight UTC
 */
export async function canReceiveGamifiedNotification(userId: string): Promise<boolean> {
  try {
    const today = getTodayUTC();

    const result = await getClient().execute({
      sql: 'SELECT gamified_notification_count, gamified_notification_date FROM users WHERE id = ?',
      args: [userId],
    });

    if (!result.rows[0]) return false;

    const user = result.rows[0] as unknown as {
      gamified_notification_count: number;
      gamified_notification_date: string | null;
    };

    // Reset counter if date changed (new day)
    if (user.gamified_notification_date !== today) {
      return true; // New day, can receive
    }

    // Check limit
    return (user.gamified_notification_count || 0) < DAILY_GAMIFIED_NOTIFICATION_LIMIT;
  } catch (error) {
    dbLogger.error({ error, userId }, 'Error checking gamified notification limit');
    return false;
  }
}

/**
 * Increment gamified notification count for user
 * Resets counter if date changed
 */
export async function incrementGamifiedNotificationCount(userId: string): Promise<void> {
  try {
    const today = getTodayUTC();

    await getClient().execute({
      sql: `UPDATE users
            SET gamified_notification_count = CASE
                  WHEN gamified_notification_date = ? THEN gamified_notification_count + 1
                  ELSE 1
                END,
                gamified_notification_date = ?
            WHERE id = ?`,
      args: [today, today, userId],
    });
  } catch (error) {
    dbLogger.error({ error, userId }, 'Error incrementing gamified notification count');
  }
}

/**
 * Check if user has received a specific notification type within the last 24 hours
 * Prevents duplicate notifications
 */
export async function hasReceivedNotificationTypeToday(
  userId: string,
  type: GamifiedNotificationType
): Promise<boolean> {
  try {
    const result = await getClient().execute({
      sql: `SELECT 1 FROM notifications
            WHERE recipient_id = ?
              AND type = ?
              AND actor_id = ?
              AND created_at > datetime(CURRENT_TIMESTAMP, '-24 hours')
            LIMIT 1`,
      args: [userId, type, SYSTEM_USER_ID],
    });

    return result.rows.length > 0;
  } catch (error) {
    dbLogger.error({ error, userId, type }, 'Error checking notification type history');
    return false;
  }
}
