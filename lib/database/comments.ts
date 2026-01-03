// Comment database operations
// Domain: Comment CRUD, threading, counts
// Note: Comments are stored in the posts table with parent_id

import { randomUUID } from 'crypto';
import { APP_CONFIG } from '@/constants';
import { dbLogger } from '../logger';
import { getClient } from './client';
import type { Post, PostWithUserAndUpvotes, DailyLimit } from './types';

// ============ COMMENT COUNTS ============

export async function getCommentCount(postId: string): Promise<number> {
  try {
    const result = await getClient().execute({
      sql: 'SELECT COUNT(*) as count FROM posts WHERE parent_id = ?',
      args: [postId],
    });
    return Number(result.rows[0].count);
  } catch (error) {
    dbLogger.error({ error, postId }, 'Error getting comment count');
    throw new Error('Failed to get comment count');
  }
}

// ============ COMMENT QUERIES ============

export async function getTopLevelCommentsWithEnrichment(
  postId: string,
  userId?: string
): Promise<PostWithUserAndUpvotes[]> {
  try {
    dbLogger.debug({ postId, userId }, 'Fetching top-level comments with enrichment for post');

    const result = await getClient().execute({
      sql: `SELECT
              c.id,
              c.parent_id,
              c.user_id,
              c.content,
              c.image_url,
              c.created_at || 'Z' as created_at,
              c.updated_at || 'Z' as updated_at,
              u.name,
              u.username,
              u.image,
              (SELECT COUNT(*) FROM posts WHERE parent_id = c.id) as comment_count,
              (SELECT COUNT(*) FROM upvotes WHERE post_id = c.id) as upvote_count
              ${userId ? `, (SELECT COUNT(*) FROM upvotes WHERE post_id = c.id AND user_id = ?) as user_upvoted` : ''}
            FROM posts c
            JOIN users u ON c.user_id = u.id
            WHERE c.parent_id = ?
            ORDER BY c.created_at ASC`,
      args: userId ? [userId, postId] : [postId],
    });

    const comments = result.rows.map((row: unknown) => {
      const r = row as Record<string, unknown>;
      return {
        ...r,
        user_upvoted: r.user_upvoted === 1,
      };
    }) as PostWithUserAndUpvotes[];

    dbLogger.info(
      { postId, count: comments.length },
      'Top-level comments with enrichment fetched successfully'
    );
    return comments;
  } catch (error) {
    dbLogger.error({ error, postId }, 'Error getting top-level comments with enrichment');
    throw new Error('Failed to get top-level comments with enrichment');
  }
}

// ============ DAILY LIMIT CHECK (local to avoid circular import) ============

async function checkTotalDailyLimit(userId: string, limit: number): Promise<DailyLimit> {
  try {
    const result = await getClient().execute({
      sql: 'SELECT COUNT(*) as count FROM daily_actions WHERE user_id = ? AND DATE(created_at) = DATE("now")',
      args: [userId],
    });
    const used = Number(result.rows[0].count);
    return {
      used,
      limit,
      remaining: Math.max(0, limit - used),
    };
  } catch (error) {
    dbLogger.error({ error, userId, limit }, 'Error checking total daily limit');
    throw new Error('Failed to check total daily limit');
  }
}

// ============ COMMENT CREATION ============

export async function createCommentTransaction(
  userId: string,
  postId: string,
  content: string,
  parentCommentId: string | null = null,
  imageUrl?: string | null
): Promise<{
  success: boolean;
  comment?: Post;
  commentCount: number;
  remaining?: number;
  error?: string;
  authorId?: string;
}> {
  try {
    dbLogger.debug(
      { userId, postId, parentCommentId, contentLength: content.length },
      'Comment transaction started'
    );

    // Get the original post author
    const postResult = await getClient().execute({
      sql: 'SELECT user_id FROM posts WHERE id = ?',
      args: [postId],
    });

    if (!postResult.rows[0]) {
      dbLogger.warn({ userId, postId }, 'Comment failed: post not found');
      return { success: false, commentCount: 0, error: 'Post not found' };
    }

    const authorId = postResult.rows[0].user_id as string;

    // Validate parent comment if replying to a comment
    if (parentCommentId) {
      const parentResult = await getClient().execute({
        sql: 'SELECT id FROM posts WHERE id = ?',
        args: [parentCommentId],
      });

      if (!parentResult.rows[0]) {
        dbLogger.warn({ userId, parentCommentId }, 'Comment failed: parent comment not found');
        return { success: false, commentCount: 0, error: 'Parent comment not found' };
      }
    }

    // Check daily action limit
    const limit = await checkTotalDailyLimit(userId, APP_CONFIG.DAILY_ACTION_LIMIT);
    if (limit.remaining <= 0) {
      dbLogger.warn({ userId, postId, limit }, 'Comment failed: daily action limit reached');
      return {
        success: false,
        commentCount: await getCommentCount(postId),
        error: 'Daily action limit reached',
      };
    }

    const commentId = randomUUID();
    const actionId = randomUUID();

    // Parent is either the comment we're replying to, or the original post
    const parentId = parentCommentId || postId;
    const results = await getClient().batch(
      [
        {
          sql: 'INSERT INTO posts (id, parent_id, content, user_id, image_url) VALUES (?, ?, ?, ?, ?) RETURNING *',
          args: [commentId, parentId, content, userId, imageUrl || null],
        },
        {
          sql: 'INSERT OR IGNORE INTO daily_actions (id, user_id, action_type, target_id) VALUES (?, ?, ?, ?)',
          args: [actionId, userId, 'comment', commentId],
        },
      ],
      'write'
    );

    const createdComment = results[0].rows[0] as unknown as Post;

    // NOTE: Streak update and notification creation handled by API route
    // to avoid circular dependencies

    const finalCount = await getCommentCount(postId);
    dbLogger.info(
      { userId, postId, commentId, commentCount: finalCount },
      'Comment created successfully'
    );

    return {
      success: true,
      comment: createdComment,
      commentCount: finalCount,
      remaining: limit.remaining - 1,
      authorId, // Return authorId for push notifications
    };
  } catch (error) {
    dbLogger.error({ error, userId, postId }, 'Error creating comment');
    throw new Error('Failed to create comment');
  }
}

// ============ AGGREGATE EXPORTS ============

export const comments = {
  getCommentCount,
  getTopLevelCommentsWithEnrichment,
  createCommentTransaction,
};
