// Daily limit database operations
// Domain: Rate limiting for user actions

import { dbLogger } from '../logger';
import { getClient } from './client';
import type { DailyLimit } from './types';

// ============ DAILY LIMIT CHECKS ============

export async function checkTotalDailyLimit(userId: string, limit: number): Promise<DailyLimit> {
  try {
    const result = await getClient().execute({
      sql: 'SELECT COUNT(*) as count FROM daily_actions WHERE user_id = ? AND DATE(created_at) = DATE("now")',
      args: [userId],
    });
    const used = Number(result.rows[0].count);
    const limitStatus = {
      used,
      limit,
      remaining: Math.max(0, limit - used),
    };
    dbLogger.debug({ userId, ...limitStatus }, 'Total daily limit check');
    return limitStatus;
  } catch (error) {
    dbLogger.error({ error, userId, limit }, 'Error checking total daily limit');
    throw new Error('Failed to check total daily limit');
  }
}

// ============ AGGREGATE EXPORTS ============

export const limits = {
  checkTotalDailyLimit,
};
