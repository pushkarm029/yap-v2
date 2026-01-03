// Notifications: Bulk query helpers for cron jobs
// Domain: Finding users for scheduled notifications (streaks, milestones, engagement)

import { dbLogger } from '../../logger';
import { getTodayUTC, getYesterdayUTC } from '../../utils/dates';
import { getClient } from '../client';
import { SYSTEM_USER_ID, type User } from '../types';

/**
 * Get users whose streaks are about to expire (within N hours)
 * Streak expires at midnight UTC of the day after last_action_date
 */
export async function getUsersWithExpiringStreaks(hoursUntilExpiry: number): Promise<User[]> {
  try {
    // Users who acted yesterday and haven't acted today
    // Their streak expires at the END of today (midnight UTC tomorrow)
    const yesterday = getYesterdayUTC();
    const today = getTodayUTC();

    const result = await getClient().execute({
      sql: `SELECT * FROM users
            WHERE current_streak > 0
              AND last_action_date = ?
              AND last_action_date != ?`,
      args: [yesterday, today],
    });

    // Filter by time - streak expires at midnight UTC (end of today)
    const now = new Date();
    const midnight = new Date(
      Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() + 1, 0, 0, 0)
    );
    const hoursLeft = (midnight.getTime() - now.getTime()) / (1000 * 60 * 60);

    // Only return users if within the window
    if (hoursLeft > hoursUntilExpiry) {
      return [];
    }

    return result.rows as unknown as User[];
  } catch (error) {
    dbLogger.error({ error, hoursUntilExpiry }, 'Error getting users with expiring streaks');
    return [];
  }
}

/**
 * Get users who had streaks that are now broken (gap > 1 day)
 * These users had a streak but haven't acted in 2+ days
 */
export async function getUsersWithBrokenStreaks(): Promise<User[]> {
  try {
    const yesterday = getYesterdayUTC();

    const result = await getClient().execute({
      sql: `SELECT * FROM users
            WHERE current_streak > 0
              AND last_action_date IS NOT NULL
              AND last_action_date < ?`,
      args: [yesterday],
    });

    return result.rows as unknown as User[];
  } catch (error) {
    dbLogger.error({ error }, 'Error getting users with broken streaks');
    return [];
  }
}

/**
 * Get users who just hit a streak milestone
 * Must check on each action OR via cron after streak updates
 */
export async function getUsersWithStreakMilestones(milestones: number[]): Promise<User[]> {
  try {
    const today = getTodayUTC();
    const placeholders = milestones.map(() => '?').join(', ');

    const result = await getClient().execute({
      sql: `SELECT * FROM users
            WHERE current_streak IN (${placeholders})
              AND last_action_date = ?`,
      args: [...milestones, today],
    });

    return result.rows as unknown as User[];
  } catch (error) {
    dbLogger.error({ error, milestones }, 'Error getting users with streak milestones');
    return [];
  }
}

/**
 * Get users who hit upvote milestones (total upvotes received)
 */
export async function getUsersWithPointsMilestones(
  milestones: number[]
): Promise<{ userId: string; upvoteCount: number }[]> {
  try {
    const placeholders = milestones.map(() => '?').join(', ');

    const result = await getClient().execute({
      sql: `SELECT p.user_id as userId, COUNT(u.id) as upvoteCount
            FROM posts p
            JOIN upvotes u ON p.id = u.post_id
            GROUP BY p.user_id
            HAVING COUNT(u.id) IN (${placeholders})`,
      args: milestones,
    });

    return result.rows as unknown as { userId: string; upvoteCount: number }[];
  } catch (error) {
    dbLogger.error({ error, milestones }, 'Error getting users with points milestones');
    return [];
  }
}

/**
 * Get users with unclaimed YAP rewards
 * Uses claim_events to determine what's been claimed
 */
export async function getUsersWithUnclaimedRewards(): Promise<
  { userId: string; amount: string }[]
> {
  try {
    const result = await getClient().execute({
      sql: `SELECT ur.user_id as userId, ur.amount
            FROM user_rewards ur
            INNER JOIN (
              SELECT user_id, MAX(created_at) as latest
              FROM user_rewards
              GROUP BY user_id
            ) latest_rewards ON ur.user_id = latest_rewards.user_id
              AND ur.created_at = latest_rewards.latest
            WHERE ur.amount > COALESCE(
              (SELECT MAX(cumulative_claimed) FROM claim_events WHERE user_id = ur.user_id),
              0
            )`,
      args: [],
    });

    return result.rows as unknown as { userId: string; amount: string }[];
  } catch (error) {
    dbLogger.error({ error }, 'Error getting users with unclaimed rewards');
    return [];
  }
}

/**
 * Get active users who have acted within the last N days
 * Used for actions_recharged notifications (only notify engaged users)
 */
export async function getActiveUsers(activeDays: number): Promise<{ id: string }[]> {
  try {
    const cutoffDate = new Date();
    cutoffDate.setUTCDate(cutoffDate.getUTCDate() - activeDays);
    const cutoff = cutoffDate.toISOString().split('T')[0];

    const result = await getClient().execute({
      sql: `SELECT id FROM users
            WHERE last_action_date IS NOT NULL
              AND last_action_date >= ?
              AND id != ?`,
      args: [cutoff, SYSTEM_USER_ID],
    });

    return result.rows.map((row) => ({ id: String(row.id) }));
  } catch (error) {
    dbLogger.error({ error, activeDays }, 'Error getting active users');
    return [];
  }
}

/**
 * Get users with points but no wallet connected
 * Used for wallet_connect and distribution_missed notifications
 */
export async function getUsersWithoutWalletAndPoints(): Promise<{ id: string; points: number }[]> {
  try {
    const result = await getClient().execute({
      sql: `SELECT id, points FROM users
            WHERE (wallet_address IS NULL OR wallet_address = '')
              AND points > 0
              AND id != ?
            LIMIT 1000`,
      args: [SYSTEM_USER_ID],
    });

    return result.rows.map((row) => ({
      id: String(row.id),
      points: Number(row.points),
    }));
  } catch (error) {
    dbLogger.error({ error }, 'Error getting users without wallet');
    return [];
  }
}

/**
 * Get active users with no distributable points
 * Used for distribution_nudge (encourage them to post)
 * Only includes users who have been active in last 14 days but have 0 points
 */
export async function getActiveUsersWithNoPoints(): Promise<{ id: string }[]> {
  try {
    const cutoffDate = new Date();
    cutoffDate.setUTCDate(cutoffDate.getUTCDate() - 14);
    const cutoff = cutoffDate.toISOString().split('T')[0];

    const result = await getClient().execute({
      sql: `SELECT id FROM users
            WHERE points = 0
              AND last_action_date IS NOT NULL
              AND last_action_date >= ?
              AND id != ?
            LIMIT 500`,
      args: [cutoff, SYSTEM_USER_ID],
    });

    return result.rows.map((row) => ({ id: String(row.id) }));
  } catch (error) {
    dbLogger.error({ error }, 'Error getting active users with no points');
    return [];
  }
}

/**
 * Get users who haven't acted in N days (for engagement nudges)
 */
export async function getInactiveUsers(inactiveDays: number): Promise<User[]> {
  try {
    const cutoffDate = new Date();
    cutoffDate.setUTCDate(cutoffDate.getUTCDate() - inactiveDays);
    const cutoff = cutoffDate.toISOString().split('T')[0];

    const result = await getClient().execute({
      sql: `SELECT * FROM users
            WHERE last_action_date IS NOT NULL
              AND last_action_date <= ?
              AND id != ?`,
      args: [cutoff, SYSTEM_USER_ID],
    });

    return result.rows as unknown as User[];
  } catch (error) {
    dbLogger.error({ error, inactiveDays }, 'Error getting inactive users');
    return [];
  }
}

/**
 * Get users who received rewards in the latest distribution
 * Used for distribution_complete notifications
 */
export async function getUsersFromLatestDistribution(): Promise<
  { userId: string; yapEarned: string; pointsConverted: number }[]
> {
  try {
    const result = await getClient().execute({
      sql: `SELECT ur.user_id as userId, ur.amount_earned as yapEarned, ur.points_converted as pointsConverted
            FROM user_rewards ur
            INNER JOIN merkle_distributions md ON ur.distribution_id = md.id
            WHERE md.created_at = (SELECT MAX(created_at) FROM merkle_distributions)
              AND ur.amount_earned IS NOT NULL
              AND CAST(ur.amount_earned AS INTEGER) > 0`,
      args: [],
    });

    return result.rows.map((row) => ({
      userId: String(row.userId),
      yapEarned: String(row.yapEarned),
      pointsConverted: Number(row.pointsConverted),
    }));
  } catch (error) {
    dbLogger.error({ error }, 'Error getting users from latest distribution');
    return [];
  }
}

/**
 * Get weekly stats for users (for weekly_summary)
 */
export async function getUserWeeklyStats(): Promise<
  { userId: string; postCount: number; upvoteCount: number; currentStreak: number }[]
> {
  try {
    const weekAgo = new Date();
    weekAgo.setUTCDate(weekAgo.getUTCDate() - 7);
    const weekAgoCutoff = weekAgo.toISOString();

    const result = await getClient().execute({
      sql: `SELECT
              u.id as userId,
              u.current_streak as currentStreak,
              COALESCE(post_stats.post_count, 0) as postCount,
              COALESCE(upvote_stats.upvote_count, 0) as upvoteCount
            FROM users u
            LEFT JOIN (
              SELECT user_id, COUNT(*) as post_count
              FROM posts
              WHERE created_at >= ? AND parent_id IS NULL
              GROUP BY user_id
            ) post_stats ON u.id = post_stats.user_id
            LEFT JOIN (
              SELECT p.user_id, COUNT(up.id) as upvote_count
              FROM posts p
              JOIN upvotes up ON p.id = up.post_id
              WHERE up.created_at >= ?
              GROUP BY p.user_id
            ) upvote_stats ON u.id = upvote_stats.user_id
            WHERE u.id != ?
              AND (post_stats.post_count > 0 OR upvote_stats.upvote_count > 0)`,
      args: [weekAgoCutoff, weekAgoCutoff, SYSTEM_USER_ID],
    });

    return result.rows.map((row) => ({
      userId: String(row.userId),
      postCount: Number(row.postCount),
      upvoteCount: Number(row.upvoteCount),
      currentStreak: Number(row.currentStreak),
    }));
  } catch (error) {
    dbLogger.error({ error }, 'Error getting user weekly stats');
    return [];
  }
}

/**
 * Get popular posts expiring soon (for expiring_popular)
 * Returns posts with 10+ upvotes expiring in the next N hours
 */
export async function getPopularPostsExpiringSoon(
  hoursUntilExpiry: number,
  minUpvotes: number = 10
): Promise<{ userId: string; postId: string; upvoteCount: number; hoursLeft: number }[]> {
  try {
    // Posts expire 7 days after creation
    const expiryWindowStart = new Date();
    expiryWindowStart.setUTCDate(expiryWindowStart.getUTCDate() - 7);
    expiryWindowStart.setUTCHours(expiryWindowStart.getUTCHours() + hoursUntilExpiry);

    const expiryWindowEnd = new Date();
    expiryWindowEnd.setUTCDate(expiryWindowEnd.getUTCDate() - 7);
    expiryWindowEnd.setUTCHours(expiryWindowEnd.getUTCHours() + hoursUntilExpiry + 3); // 3 hour window

    const result = await getClient().execute({
      sql: `SELECT
              p.user_id as userId,
              p.id as postId,
              COUNT(u.id) as upvoteCount
            FROM posts p
            JOIN upvotes u ON p.id = u.post_id
            WHERE p.parent_id IS NULL
              AND p.created_at BETWEEN ? AND ?
            GROUP BY p.id
            HAVING COUNT(u.id) >= ?`,
      args: [expiryWindowStart.toISOString(), expiryWindowEnd.toISOString(), minUpvotes],
    });

    return result.rows.map((row) => ({
      userId: String(row.userId),
      postId: String(row.postId),
      upvoteCount: Number(row.upvoteCount),
      hoursLeft: hoursUntilExpiry,
    }));
  } catch (error) {
    dbLogger.error({ error, hoursUntilExpiry }, 'Error getting popular posts expiring soon');
    return [];
  }
}

/**
 * Get posts with high momentum (many upvotes in recent hours)
 * Used for post_momentum notifications
 */
export async function getPostsWithMomentum(
  hoursWindow: number = 6,
  minUpvotes: number = 10
): Promise<{ userId: string; postId: string; upvoteCount: number }[]> {
  try {
    const cutoff = new Date();
    cutoff.setUTCHours(cutoff.getUTCHours() - hoursWindow);

    const result = await getClient().execute({
      sql: `SELECT
              p.user_id as userId,
              p.id as postId,
              COUNT(u.id) as upvoteCount
            FROM posts p
            JOIN upvotes u ON p.id = u.post_id
            WHERE p.parent_id IS NULL
              AND u.created_at >= ?
            GROUP BY p.id
            HAVING COUNT(u.id) >= ?`,
      args: [cutoff.toISOString(), minUpvotes],
    });

    return result.rows.map((row) => ({
      userId: String(row.userId),
      postId: String(row.postId),
      upvoteCount: Number(row.upvoteCount),
    }));
  } catch (error) {
    dbLogger.error({ error, hoursWindow, minUpvotes }, 'Error getting posts with momentum');
    return [];
  }
}

// ============ FOLLOWER MILESTONES ============
export const FOLLOWER_MILESTONES = [10, 50, 100, 500, 1000];

/**
 * Get users who just hit a follower milestone
 */
export async function getUsersWithFollowerMilestones(): Promise<
  { userId: string; followerCount: number }[]
> {
  try {
    const placeholders = FOLLOWER_MILESTONES.map(() => '?').join(', ');

    const result = await getClient().execute({
      sql: `SELECT followed_id as userId, COUNT(*) as followerCount
            FROM follows
            GROUP BY followed_id
            HAVING COUNT(*) IN (${placeholders})`,
      args: FOLLOWER_MILESTONES,
    });

    return result.rows.map((row) => ({
      userId: String(row.userId),
      followerCount: Number(row.followerCount),
    }));
  } catch (error) {
    dbLogger.error({ error }, 'Error getting users with follower milestones');
    return [];
  }
}
