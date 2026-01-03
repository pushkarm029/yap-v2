// Posts: Feed and list queries
// Domain: Feed pagination, user posts, liked posts

import { dbLogger } from '../../logger';
import { getClient } from '../client';
import type { PostWithUserAndUpvotes } from '../types';

// ============ FEED QUERIES ============

export async function getAllPostsWithUpvotes(userId?: string): Promise<PostWithUserAndUpvotes[]> {
  try {
    dbLogger.debug({ userId }, 'Fetching all posts with upvotes');

    const result = await getClient().execute({
      sql: `SELECT
              p.id,
              p.parent_id,
              p.user_id,
              p.content,
              p.image_url,
              p.created_at || 'Z' as created_at,
              p.updated_at || 'Z' as updated_at,
              u.name,
              u.username,
              u.image,
              COALESCE(SUM(l.vote_weight), 0) as upvote_count,
              COUNT(DISTINCT c.id) as comment_count
            FROM posts p
            JOIN users u ON p.user_id = u.id
            LEFT JOIN upvotes l ON p.id = l.post_id
            LEFT JOIN posts c ON p.id = c.parent_id
            WHERE p.parent_id IS NULL
            GROUP BY p.id
            ORDER BY p.created_at DESC`,
      args: [],
    });

    const results = result.rows as unknown as PostWithUserAndUpvotes[];

    if (userId && results.length > 0) {
      const postIds = results.map((post) => post.id);
      const placeholders = postIds.map(() => '?').join(',');
      const upvotedResult = await getClient().execute({
        sql: `SELECT post_id FROM upvotes WHERE user_id = ? AND post_id IN (${placeholders})`,
        args: [userId, ...postIds],
      });

      const upvotedSet = new Set(upvotedResult.rows.map((row) => row.post_id));

      const enrichedResults = results.map((post) => ({
        ...post,
        user_upvoted: upvotedSet.has(post.id),
      }));

      dbLogger.info({ userId, count: enrichedResults.length }, 'Posts fetched successfully');
      return enrichedResults;
    }

    dbLogger.info({ count: results.length }, 'Posts fetched successfully');
    return results;
  } catch (error) {
    dbLogger.error({ error, userId }, 'Error getting posts with upvotes');
    throw new Error('Failed to get posts');
  }
}

export async function getPaginatedPosts(
  userId?: string,
  cursor?: string,
  limit: number = 20
): Promise<{ posts: PostWithUserAndUpvotes[]; nextCursor: string | null }> {
  try {
    dbLogger.debug({ userId, cursor, limit }, 'Fetching paginated posts');

    // Build query with optional cursor
    const cursorCondition = cursor ? `AND p.created_at < ?` : '';
    const args = cursor ? [cursor, limit + 1] : [limit + 1];

    const result = await getClient().execute({
      sql: `SELECT
              p.id,
              p.parent_id,
              p.user_id,
              p.content,
              p.image_url,
              p.created_at || 'Z' as created_at,
              p.updated_at || 'Z' as updated_at,
              u.name,
              u.username,
              u.image,
              COALESCE(SUM(l.vote_weight), 0) as upvote_count,
              COUNT(DISTINCT c.id) as comment_count
            FROM posts p
            JOIN users u ON p.user_id = u.id
            LEFT JOIN upvotes l ON p.id = l.post_id
            LEFT JOIN posts c ON p.id = c.parent_id
            WHERE p.parent_id IS NULL ${cursorCondition}
            GROUP BY p.id
            ORDER BY p.created_at DESC
            LIMIT ?`,
      args,
    });

    const allPosts = result.rows as unknown as PostWithUserAndUpvotes[];

    // Check if there are more posts (we fetched limit + 1)
    const hasMore = allPosts.length > limit;
    const posts = hasMore ? allPosts.slice(0, limit) : allPosts;

    // Enrich with user_upvoted if authenticated
    if (userId && posts.length > 0) {
      const postIds = posts.map((post) => post.id);
      const placeholders = postIds.map(() => '?').join(',');
      const upvotedResult = await getClient().execute({
        sql: `SELECT post_id FROM upvotes WHERE user_id = ? AND post_id IN (${placeholders})`,
        args: [userId, ...postIds],
      });

      const upvotedSet = new Set(upvotedResult.rows.map((row) => row.post_id));

      posts.forEach((post) => {
        post.user_upvoted = upvotedSet.has(post.id);
      });
    }

    // Next cursor is the created_at of the last post
    const nextCursor = hasMore && posts.length > 0 ? posts[posts.length - 1].created_at : null;

    dbLogger.info({ userId, count: posts.length, hasMore }, 'Paginated posts fetched successfully');
    return { posts, nextCursor };
  } catch (error) {
    dbLogger.error({ error, userId, cursor, limit }, 'Error getting paginated posts');
    throw new Error('Failed to get posts');
  }
}

// ============ USER-SPECIFIC FEEDS ============

export async function getPostsByUserIdWithUpvotes(
  targetUserId: string,
  currentUserId?: string
): Promise<PostWithUserAndUpvotes[]> {
  try {
    dbLogger.debug({ targetUserId, currentUserId }, 'Fetching posts by user with upvotes');

    const result = await getClient().execute({
      sql: `SELECT
              p.id,
              p.parent_id,
              p.user_id,
              p.content,
              p.image_url,
              p.created_at || 'Z' as created_at,
              p.updated_at || 'Z' as updated_at,
              u.name,
              u.username,
              u.image,
              COALESCE(SUM(l.vote_weight), 0) as upvote_count,
              COUNT(DISTINCT c.id) as comment_count
            FROM posts p
            JOIN users u ON p.user_id = u.id
            LEFT JOIN upvotes l ON p.id = l.post_id
            LEFT JOIN posts c ON p.id = c.parent_id
            WHERE p.user_id = ? AND p.parent_id IS NULL
            GROUP BY p.id
            ORDER BY p.created_at DESC`,
      args: [targetUserId],
    });

    const results = result.rows as unknown as PostWithUserAndUpvotes[];

    if (currentUserId && results.length > 0) {
      const postIds = results.map((post) => post.id);
      const placeholders = postIds.map(() => '?').join(',');
      const upvotedResult = await getClient().execute({
        sql: `SELECT post_id FROM upvotes WHERE user_id = ? AND post_id IN (${placeholders})`,
        args: [currentUserId, ...postIds],
      });

      const upvotedSet = new Set(upvotedResult.rows.map((row) => row.post_id));

      const enrichedResults = results.map((post) => ({
        ...post,
        user_upvoted: upvotedSet.has(post.id),
      }));

      dbLogger.info(
        { targetUserId, currentUserId, count: enrichedResults.length },
        'User posts fetched successfully'
      );
      return enrichedResults;
    }

    dbLogger.info({ targetUserId, count: results.length }, 'User posts fetched successfully');
    return results;
  } catch (error) {
    dbLogger.error({ error, targetUserId, currentUserId }, 'Error getting user posts with upvotes');
    throw new Error('Failed to get user posts');
  }
}

export async function getLikedPostsByUserIdWithUpvotes(
  likerId: string,
  viewerId?: string
): Promise<PostWithUserAndUpvotes[]> {
  try {
    dbLogger.debug({ likerId, viewerId }, 'Fetching liked posts with upvotes');

    const result = await getClient().execute({
      sql: `SELECT
              p.*,
              u.name,
              u.username,
              u.image,
              COUNT(DISTINCT l2.id) as upvote_count,
              COUNT(DISTINCT c.id) as comment_count
            FROM upvotes l1
            JOIN posts p ON l1.post_id = p.id
            JOIN users u ON p.user_id = u.id
            LEFT JOIN upvotes l2 ON p.id = l2.post_id
            LEFT JOIN posts c ON p.id = c.parent_id
            WHERE l1.user_id = ? AND p.parent_id IS NULL
            GROUP BY p.id
            ORDER BY l1.created_at DESC`,
      args: [likerId],
    });

    const results = result.rows as unknown as PostWithUserAndUpvotes[];

    if (viewerId && results.length > 0) {
      const postIds = results.map((post) => post.id);
      const placeholders = postIds.map(() => '?').join(',');
      const upvotedResult = await getClient().execute({
        sql: `SELECT post_id FROM upvotes WHERE user_id = ? AND post_id IN (${placeholders})`,
        args: [viewerId, ...postIds],
      });

      const upvotedSet = new Set(upvotedResult.rows.map((row) => row.post_id));

      const enrichedResults = results.map((post) => ({
        ...post,
        user_upvoted: upvotedSet.has(post.id),
      }));

      dbLogger.info(
        { likerId, viewerId, count: enrichedResults.length },
        'Liked posts fetched successfully'
      );
      return enrichedResults;
    }

    dbLogger.info({ likerId, count: results.length }, 'Liked posts fetched successfully');
    return results;
  } catch (error) {
    dbLogger.error({ error, likerId, viewerId }, 'Error getting liked posts with upvotes');
    throw new Error('Failed to get liked posts');
  }
}
