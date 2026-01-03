// Posts: Core CRUD operations
// Domain: Post creation, single post queries

import { randomUUID } from 'crypto';
import { dbLogger } from '../../logger';
import { getNowISO } from '../../utils/dates';
import { getClient } from '../client';
import type { Post, PostWithUserAndUpvotes } from '../types';

// ============ POST CREATION ============

export async function createPost(
  content: string,
  userId: string,
  imageUrl?: string | null
): Promise<Post> {
  try {
    const id = randomUUID();
    const actionId = randomUUID();
    const now = getNowISO();

    dbLogger.debug(
      { userId, postId: id, contentLength: content.length, hasImage: !!imageUrl },
      'Creating post'
    );

    await getClient().batch(
      [
        {
          sql: 'INSERT INTO posts (id, parent_id, content, user_id, image_url) VALUES (?, ?, ?, ?, ?)',
          args: [id, null, content, userId, imageUrl || null],
        },
        {
          sql: 'INSERT OR IGNORE INTO daily_actions (id, user_id, action_type, target_id) VALUES (?, ?, ?, ?)',
          args: [actionId, userId, 'post', id],
        },
      ],
      'write'
    );

    // NOTE: Streak update is handled by the caller (API route)
    // to avoid circular dependency with users module

    dbLogger.info({ userId, postId: id, hasImage: !!imageUrl }, 'Post created successfully');

    return {
      id,
      parent_id: null,
      user_id: userId,
      content,
      image_url: imageUrl || null,
      created_at: now,
      updated_at: now,
    };
  } catch (error) {
    dbLogger.error({ error, userId, contentLength: content.length }, 'Error creating post');
    throw new Error('Failed to create post');
  }
}

// ============ SINGLE POST QUERIES ============

export async function getPostByIdWithUpvotes(
  postId: string,
  userId?: string
): Promise<PostWithUserAndUpvotes | null> {
  try {
    dbLogger.debug({ postId, userId }, 'Fetching post by ID with upvotes');

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
            WHERE p.id = ?
            GROUP BY p.id`,
      args: [postId],
    });

    if (result.rows.length === 0) {
      dbLogger.info({ postId }, 'Post not found');
      return null;
    }

    const post = result.rows[0] as unknown as PostWithUserAndUpvotes;

    if (userId) {
      const upvotedResult = await getClient().execute({
        sql: `SELECT 1 FROM upvotes WHERE user_id = ? AND post_id = ? LIMIT 1`,
        args: [userId, postId],
      });

      post.user_upvoted = upvotedResult.rows.length > 0;
    }

    dbLogger.info({ postId, userId }, 'Post fetched successfully');
    return post;
  } catch (error) {
    dbLogger.error({ error, postId, userId }, 'Error getting post by ID');
    throw new Error('Failed to get post');
  }
}

// ============ POST THREAD (for nested comments view) ============

export async function getPostThread(
  postId: string,
  userId?: string
): Promise<PostWithUserAndUpvotes | null> {
  // This is essentially getPostByIdWithUpvotes - same implementation
  return getPostByIdWithUpvotes(postId, userId);
}
