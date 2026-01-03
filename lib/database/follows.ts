// Follow database operations
// Domain: User following/unfollowing, follower counts

import { dbLogger } from '../logger';
import { getClient } from './client';

// ============ FOLLOW OPERATIONS ============

export async function followUser(followerId: string, followingId: string): Promise<void> {
  try {
    await getClient().execute({
      sql: `INSERT INTO follows (follower_id, following_id, created_at)
            VALUES (?, ?, CURRENT_TIMESTAMP)`,
      args: [followerId, followingId],
    });
    dbLogger.info({ followerId, followingId }, 'User followed');
  } catch (error) {
    dbLogger.error({ error, followerId, followingId }, 'Error following user');
    throw new Error('Failed to follow user');
  }
}

export async function unfollowUser(followerId: string, followingId: string): Promise<void> {
  try {
    await getClient().execute({
      sql: 'DELETE FROM follows WHERE follower_id = ? AND following_id = ?',
      args: [followerId, followingId],
    });
    dbLogger.info({ followerId, followingId }, 'User unfollowed');
  } catch (error) {
    dbLogger.error({ error, followerId, followingId }, 'Error unfollowing user');
    throw new Error('Failed to unfollow user');
  }
}

// ============ FOLLOW STATUS CHECKS ============

export async function isFollowing(followerId: string, followingId: string): Promise<boolean> {
  try {
    const result = await getClient().execute({
      sql: 'SELECT 1 FROM follows WHERE follower_id = ? AND following_id = ? LIMIT 1',
      args: [followerId, followingId],
    });
    return result.rows.length > 0;
  } catch (error) {
    dbLogger.error({ error, followerId, followingId }, 'Error checking follow status');
    throw new Error('Failed to check follow status');
  }
}

export async function getFollowStatusBatch(
  followerId: string,
  followingIds: string[]
): Promise<Map<string, boolean>> {
  try {
    if (followingIds.length === 0) {
      return new Map();
    }

    const placeholders = followingIds.map(() => '?').join(',');
    const result = await getClient().execute({
      sql: `SELECT following_id FROM follows
            WHERE follower_id = ?
            AND following_id IN (${placeholders})`,
      args: [followerId, ...followingIds],
    });

    const followingSet = new Set(result.rows.map((row) => row.following_id as string));

    return new Map(followingIds.map((id) => [id, followingSet.has(id)]));
  } catch (error) {
    dbLogger.error(
      { error, followerId, followingIdsCount: followingIds.length },
      'Error checking batch follow status'
    );
    throw new Error('Failed to check batch follow status');
  }
}

// ============ FOLLOWER COUNTS ============

export async function getFollowerCount(userId: string): Promise<number> {
  try {
    const result = await getClient().execute({
      sql: 'SELECT COUNT(*) as count FROM follows WHERE following_id = ?',
      args: [userId],
    });
    const count = Number(result.rows[0]?.count) || 0;
    dbLogger.debug({ userId, followerCount: count }, 'Follower count retrieved');
    return count;
  } catch (error) {
    dbLogger.error({ error, userId }, 'Error getting follower count');
    throw new Error('Failed to get follower count');
  }
}

export async function getFollowingCount(userId: string): Promise<number> {
  try {
    const result = await getClient().execute({
      sql: 'SELECT COUNT(*) as count FROM follows WHERE follower_id = ?',
      args: [userId],
    });
    const count = Number(result.rows[0]?.count) || 0;
    dbLogger.debug({ userId, followingCount: count }, 'Following count retrieved');
    return count;
  } catch (error) {
    dbLogger.error({ error, userId }, 'Error getting following count');
    throw new Error('Failed to get following count');
  }
}

// ============ AGGREGATE EXPORTS ============

export const follows = {
  followUser,
  unfollowUser,
  isFollowing,
  getFollowStatusBatch,
  getFollowerCount,
  getFollowingCount,
};
