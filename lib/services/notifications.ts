/**
 * Unified Notification Service
 *
 * Single entry point for ALL notification sending.
 * Handles: ID generation, message creation, DB storage, push sending.
 *
 * Usage:
 *   await sendSocialNotification({ type: 'upvote', recipientId, actorId, postId });
 *   await sendGamifiedNotification({ type: 'streak_warning', recipientId, metadata });
 */

import { randomUUID } from 'crypto';
import { db } from '@/lib/database';
import { sendPushToUser } from '@/lib/webpush';
import { apiLogger } from '@/lib/logger';
import { generateSocialMessage, generateGamifiedMessage } from './notificationMessages';
import type {
  SocialNotificationType,
  GamifiedNotificationType,
  GamifiedNotificationMetadata,
} from '@/lib/database/types';

const logger = apiLogger.child({ service: 'notifications' });

/**
 * Parameters for sending a social notification
 */
export interface SendSocialNotificationParams {
  type: SocialNotificationType;
  recipientId: string;
  actorId: string;
  postId?: string | null;
  votePower?: number;
  mentionSnippet?: string;
}

/**
 * Parameters for sending a gamified notification
 */
export interface SendGamifiedNotificationParams {
  type: GamifiedNotificationType;
  recipientId: string;
  metadata: GamifiedNotificationMetadata;
}

/**
 * Send a social notification (upvote, comment, follow, mention).
 *
 * Handles the complete notification flow:
 * 1. Self-notification prevention
 * 2. ID generation for deterministic anonymous names
 * 3. Message generation
 * 4. Database storage
 * 5. Push notification
 *
 * @returns Notification ID if sent, null if self-notification
 *
 * @example
 * await sendSocialNotification({
 *   type: 'upvote',
 *   recipientId: postAuthorId,
 *   actorId: session.user.id,
 *   postId: 'abc-123',
 *   votePower: 2.5,
 * });
 */
export async function sendSocialNotification({
  type,
  recipientId,
  actorId,
  postId = null,
  votePower,
  mentionSnippet,
}: SendSocialNotificationParams): Promise<string | null> {
  // Don't notify yourself
  if (recipientId === actorId) {
    return null;
  }

  // Generate notification ID for deterministic anonymous name
  const notificationId = randomUUID();

  // Generate message
  const message = generateSocialMessage(notificationId, type, {
    votePower,
    postId: postId ?? undefined,
    mentionSnippet,
  });

  // Store in DB
  await db.createNotificationWithMessage(
    notificationId,
    recipientId,
    actorId,
    type,
    postId,
    message.title,
    message.body
  );

  // Send push notification
  await sendPushToUser(
    recipientId,
    { title: message.title, body: message.body, url: message.url },
    { type, notificationId, postId }
  );

  logger.debug({ type, recipientId, notificationId }, 'Social notification sent');

  return notificationId;
}

/**
 * Send a gamified (system) notification with rate limiting and deduplication.
 *
 * Handles the complete notification flow:
 * 1. Rate limit check (max per day)
 * 2. Deduplication (no duplicate type within 24h)
 * 3. Message generation
 * 4. Database storage
 * 5. Rate limit increment
 * 6. Push notification
 *
 * @returns Notification ID if sent, null if rate-limited or deduplicated
 *
 * @example
 * await sendGamifiedNotification({
 *   type: 'streak_warning',
 *   recipientId: userId,
 *   metadata: { streakCount: 7, hoursLeft: 3, actionUrl: '/' },
 * });
 */
export async function sendGamifiedNotification({
  type,
  recipientId,
  metadata,
}: SendGamifiedNotificationParams): Promise<string | null> {
  // Check rate limit (3 gamified notifications per day)
  const canReceive = await db.canReceiveGamifiedNotification(recipientId);
  if (!canReceive) {
    logger.info(
      { recipientId, type },
      'Gamified notification skipped: user hit daily limit (3/day)'
    );
    return null;
  }

  // Check if already received this type today (deduplication)
  const alreadyReceived = await db.hasReceivedNotificationTypeToday(recipientId, type);
  if (alreadyReceived) {
    logger.info({ recipientId, type }, 'Gamified notification skipped: duplicate type today');
    return null;
  }

  // Generate message
  const message = generateGamifiedMessage(type, metadata);

  // Store in DB
  const notificationId = await db.createSystemNotificationWithMessage(
    recipientId,
    type,
    metadata,
    message.title,
    message.body
  );
  if (!notificationId) {
    logger.warn({ recipientId, type }, 'Failed to create system notification');
    return null;
  }

  // Increment rate limit counter
  await db.incrementGamifiedNotificationCount(recipientId);

  // Send push notification
  await sendPushToUser(
    recipientId,
    { title: message.title, body: message.body, url: message.url },
    { type, notificationId }
  );

  logger.info({ recipientId, type, metadata }, 'Gamified notification sent');

  return notificationId;
}
