// Upvote database operations
// Domain: Vote creation, removal, counting, vote weight

import { randomUUID } from 'crypto';
import { APP_CONFIG } from '@/constants';
import { dbLogger } from '../logger';
import { getClient } from './client';
import { getWalletVotePower } from './rewards/snapshots';
import type { DailyLimit } from './types';

// ============ UPVOTE CHECKS ============

export async function hasUserUpvoted(userId: string, postId: string): Promise<boolean> {
  try {
    const result = await getClient().execute({
      sql: 'SELECT 1 FROM upvotes WHERE user_id = ? AND post_id = ? LIMIT 1',
      args: [userId, postId],
    });
    return result.rows.length > 0;
  } catch (error) {
    dbLogger.error({ error, userId, postId }, 'Error checking if user upvoted');
    throw new Error('Failed to check upvote status');
  }
}

export async function getUpvoteCount(postId: string): Promise<number> {
  try {
    const result = await getClient().execute({
      sql: 'SELECT COALESCE(SUM(vote_weight), 0) as total_weight FROM upvotes WHERE post_id = ?',
      args: [postId],
    });
    return Number(result.rows[0].total_weight);
  } catch (error) {
    dbLogger.error({ error, postId }, 'Error getting upvote count');
    throw new Error('Failed to get upvote count');
  }
}

// ============ DAILY LIMITS ============

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

// ============ VOTE WEIGHT ============

/**
 * Get vote weight for a user based on their YAP holdings.
 * Uses wallet snapshots which include both claimed (wallet) and unclaimed rewards.
 *
 * Returns 1.0 for users without snapshots (legitimate baseline).
 * Throws on database errors (fail fast, don't mask bugs).
 */
export async function getVoteWeight(userId: string): Promise<number> {
  // Use wallet balance snapshots for vote power
  // Formula: 1 + 4 * (balance / (balance + 1M))
  // Range: [1.0, 5.0) - everyone has baseline, diminishing returns for whales
  const votePower = await getWalletVotePower(userId);
  dbLogger.debug({ userId, votePower }, 'Got vote weight from wallet snapshot');
  return votePower;
}

// ============ UPVOTE TRANSACTIONS ============

export async function createUpvoteTransaction(
  userId: string,
  postId: string
): Promise<{
  success: boolean;
  upvoteCount: number;
  remaining?: number;
  error?: string;
  authorId?: string;
  voteWeight?: number;
  // For real-time notifications
  authorTotalUpvotes?: number;
  authorPreviousTotalUpvotes?: number;
  postCreatedAt?: string;
}> {
  try {
    dbLogger.debug({ userId, postId }, 'Upvote transaction started');

    // Get post author and created_at for real-time notifications
    const targetResult = await getClient().execute({
      sql: 'SELECT user_id, created_at FROM posts WHERE id = ?',
      args: [postId],
    });

    if (!targetResult.rows[0]) {
      dbLogger.warn({ userId, postId }, 'Upvote failed: post not found');
      return { success: false, upvoteCount: 0, error: 'Post not found' };
    }

    const authorId = targetResult.rows[0].user_id as string;
    const postCreatedAt = targetResult.rows[0].created_at as string;

    if (await hasUserUpvoted(userId, postId)) {
      dbLogger.warn({ userId, postId }, 'Upvote failed: already upvoted');
      return {
        success: false,
        upvoteCount: await getUpvoteCount(postId),
        error: 'Already upvoted',
      };
    }

    const limit = await checkTotalDailyLimit(userId, APP_CONFIG.DAILY_ACTION_LIMIT);
    if (limit.remaining <= 0) {
      dbLogger.warn({ userId, postId, limit }, 'Upvote failed: daily action limit reached');
      return {
        success: false,
        upvoteCount: await getUpvoteCount(postId),
        error: 'Daily action limit reached',
      };
    }

    // Calculate vote weight based on voter's token balance
    const voteWeight = await getVoteWeight(userId);

    // Get author's current total upvotes (before this upvote) for milestone tracking
    const authorPointsResult = await getClient().execute({
      sql: 'SELECT points FROM users WHERE id = ?',
      args: [authorId],
    });
    const authorPreviousTotalUpvotes = Number(authorPointsResult.rows[0]?.points || 0);

    const upvoteId = randomUUID();
    const actionId = randomUUID();

    await getClient().batch(
      [
        {
          sql: 'INSERT INTO upvotes (id, user_id, post_id, vote_weight) VALUES (?, ?, ?, ?)',
          args: [upvoteId, userId, postId, voteWeight],
        },
        {
          sql: 'UPDATE users SET points = points + ? WHERE id = ?',
          args: [voteWeight, authorId],
        },
        {
          sql: 'INSERT OR IGNORE INTO daily_actions (id, user_id, action_type, target_id) VALUES (?, ?, ?, ?)',
          args: [actionId, userId, 'upvote', postId],
        },
      ],
      'write'
    );

    // NOTE: Streak update and notification creation handled by API route
    // to avoid circular dependencies

    const finalCount = await getUpvoteCount(postId);

    // Calculate author's new total (previous + this vote weight)
    const authorTotalUpvotes = authorPreviousTotalUpvotes + voteWeight;

    dbLogger.info(
      { userId, postId, authorId, voteWeight, upvoteCount: finalCount },
      'Upvote created successfully'
    );

    return {
      success: true,
      upvoteCount: finalCount,
      remaining: limit.remaining - 1,
      authorId,
      voteWeight,
      // For real-time notifications
      authorTotalUpvotes,
      authorPreviousTotalUpvotes,
      postCreatedAt,
    };
  } catch (error) {
    dbLogger.error({ error, userId, postId }, 'Error creating upvote');
    throw new Error('Failed to create upvote');
  }
}

export async function removeUpvoteTransaction(
  userId: string,
  postId: string
): Promise<{ success: boolean; upvoteCount: number; error?: string }> {
  try {
    dbLogger.debug({ userId, postId }, 'Remove upvote transaction started');

    // Check if upvote exists and get its weight
    const upvoteResult = await getClient().execute({
      sql: 'SELECT vote_weight FROM upvotes WHERE user_id = ? AND post_id = ?',
      args: [userId, postId],
    });

    if (!upvoteResult.rows[0]) {
      dbLogger.warn({ userId, postId }, 'Remove upvote failed: upvote not found');
      return {
        success: false,
        upvoteCount: await getUpvoteCount(postId),
        error: 'Upvote not found',
      };
    }

    const voteWeight = Number(upvoteResult.rows[0].vote_weight);

    // Get post author
    const targetResult = await getClient().execute({
      sql: 'SELECT user_id FROM posts WHERE id = ?',
      args: [postId],
    });

    if (!targetResult.rows[0]) {
      dbLogger.warn({ userId, postId }, 'Remove upvote failed: post not found');
      return { success: false, upvoteCount: 0, error: 'Post not found' };
    }

    const authorId = targetResult.rows[0].user_id as string;

    // Execute all operations in a transaction batch
    await getClient().batch(
      [
        {
          sql: 'DELETE FROM upvotes WHERE user_id = ? AND post_id = ?',
          args: [userId, postId],
        },
        {
          sql: 'UPDATE users SET points = points - ? WHERE id = ?',
          args: [voteWeight, authorId],
        },
        {
          sql: `DELETE FROM daily_actions
              WHERE user_id = ?
              AND action_type = 'upvote'
              AND target_id = ?`,
          args: [userId, postId],
        },
      ],
      'write'
    );

    const finalCount = await getUpvoteCount(postId);
    dbLogger.info(
      { userId, postId, authorId, voteWeight, upvoteCount: finalCount },
      'Upvote removed successfully'
    );

    return {
      success: true,
      upvoteCount: finalCount,
    };
  } catch (error) {
    dbLogger.error({ error, userId, postId }, 'Error removing upvote');
    throw new Error('Failed to remove upvote');
  }
}

// ============ AGGREGATE EXPORTS ============

export const upvotes = {
  hasUserUpvoted,
  getUpvoteCount,
  checkTotalDailyLimit,
  getVoteWeight,
  createUpvoteTransaction,
  removeUpvoteTransaction,
};
