// Push subscription database operations
// Domain: Web push notification subscriptions

import { randomUUID } from 'crypto';
import { dbLogger } from '../logger';
import { getClient } from './client';
import type { PushSubscriptionData } from './types';

// ============ PUSH SUBSCRIPTION OPERATIONS ============

export async function savePushSubscription(
  userId: string,
  subscription: { endpoint: string; keys: { p256dh: string; auth: string } }
): Promise<void> {
  try {
    await getClient().execute({
      sql: `INSERT OR IGNORE INTO push_subscriptions (id, user_id, endpoint, p256dh, auth)
            VALUES (?, ?, ?, ?, ?)`,
      args: [
        randomUUID(),
        userId,
        subscription.endpoint,
        subscription.keys.p256dh,
        subscription.keys.auth,
      ],
    });
    dbLogger.info({ userId, endpoint: subscription.endpoint }, 'Push subscription saved');
  } catch (error) {
    dbLogger.error({ error, userId }, 'Error saving push subscription');
    throw new Error('Failed to save push subscription');
  }
}

export async function getPushSubscriptions(userId: string): Promise<PushSubscriptionData[]> {
  try {
    const result = await getClient().execute({
      sql: 'SELECT endpoint, p256dh, auth FROM push_subscriptions WHERE user_id = ?',
      args: [userId],
    });
    return result.rows as unknown as PushSubscriptionData[];
  } catch (error) {
    dbLogger.error({ error, userId }, 'Error getting push subscriptions');
    throw new Error('Failed to get push subscriptions');
  }
}

export async function deletePushSubscription(userId: string, endpoint: string): Promise<void> {
  try {
    await getClient().execute({
      sql: 'DELETE FROM push_subscriptions WHERE user_id = ? AND endpoint = ?',
      args: [userId, endpoint],
    });
    dbLogger.debug({ userId, endpoint }, 'Push subscription deleted');
  } catch (error) {
    dbLogger.error({ error, userId, endpoint }, 'Error deleting push subscription');
    throw new Error('Failed to delete push subscription');
  }
}

// ============ AGGREGATE EXPORTS ============

export const push = {
  savePushSubscription,
  getPushSubscriptions,
  deletePushSubscription,
};
