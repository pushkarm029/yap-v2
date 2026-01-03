// Users: Core CRUD operations and streak management
// Domain: User lookup, creation, updates, streaks

import { APP_CONFIG } from '@/constants';
import { dbLogger } from '../../logger';
import { getTodayUTC, getYesterdayUTC } from '../../utils/dates';
import { getClient } from '../client';
import { firstRow, type User, type UserProfile, type CreateUserData } from '../types';

// ============ CORE USER OPERATIONS ============

export async function findUserById(id: string): Promise<User | null> {
  try {
    const result = await getClient().execute({
      sql: 'SELECT * FROM users WHERE id = ?',
      args: [id],
    });
    const user = firstRow<User>(result.rows);
    dbLogger.debug({ userId: id, found: !!user }, 'User lookup by ID');
    return user;
  } catch (error) {
    dbLogger.error({ error, userId: id }, 'Error finding user by ID');
    throw new Error('Database error occurred');
  }
}

export async function findUserByUsername(username: string): Promise<User | null> {
  try {
    const result = await getClient().execute({
      sql: 'SELECT * FROM users WHERE LOWER(username) = LOWER(?)',
      args: [username],
    });
    const user = firstRow<User>(result.rows);
    dbLogger.debug({ username, found: !!user }, 'User lookup by username');
    return user;
  } catch (error) {
    dbLogger.error({ error, username }, 'Error finding user by username');
    throw new Error('Database error occurred');
  }
}

export async function getUserStats(
  userId: string
): Promise<{ postCount: number; likeCount: number }> {
  try {
    const [postsResult, likesResult] = await Promise.all([
      getClient().execute({
        sql: 'SELECT COUNT(*) as count FROM posts WHERE user_id = ?',
        args: [userId],
      }),
      getClient().execute({
        sql: 'SELECT COUNT(*) as count FROM upvotes WHERE user_id = ?',
        args: [userId],
      }),
    ]);

    return {
      postCount: Number(postsResult.rows[0].count) || 0,
      likeCount: Number(likesResult.rows[0].count) || 0,
    };
  } catch (error) {
    dbLogger.error({ error, userId }, 'Error getting user stats');
    throw new Error('Failed to get user stats');
  }
}

export async function getUserProfile(userId: string): Promise<UserProfile | null> {
  try {
    const result = await getClient().execute({
      sql: `SELECT u.*, COUNT(p.id) as post_count
            FROM users u
            LEFT JOIN posts p ON u.id = p.user_id
            WHERE u.id = ?
            GROUP BY u.id`,
      args: [userId],
    });

    if (!result.rows[0]) {
      return null;
    }

    const row = result.rows[0] as unknown as User & { post_count: number };
    return {
      ...row,
      _count: { posts: row.post_count },
      createdAt: new Date(row.created_at),
    };
  } catch (error) {
    dbLogger.error({ error, userId }, 'Error getting user profile');
    throw new Error('Failed to get user profile');
  }
}

// ============ USER CREATION/UPDATE ============

export async function upsertUser(userData: CreateUserData): Promise<User> {
  try {
    const existingUser = await findUserById(userData.id);

    if (existingUser) {
      // User exists - update their info
      dbLogger.info(
        {
          userId: userData.id,
          username: userData.username,
          action: 'update',
        },
        'User sign-in: updating existing user'
      );

      await getClient().execute({
        sql: 'UPDATE users SET name = ?, image = ?, username = ? WHERE id = ?',
        args: [
          userData.name,
          userData.image,
          userData.username || existingUser.username,
          existingUser.id,
        ],
      });

      const updatedUser = await findUserById(existingUser.id);
      if (!updatedUser) {
        throw new Error('Failed to retrieve updated user');
      }

      dbLogger.info(
        {
          userId: updatedUser.id,
          username: updatedUser.username,
        },
        'User sign-in: update successful'
      );

      return updatedUser;
    } else {
      // New user - create account
      dbLogger.info(
        {
          userId: userData.id,
          username: userData.username,
          action: 'create',
        },
        'User sign-up: creating new user'
      );

      await getClient().execute({
        sql: 'INSERT INTO users (id, name, image, username, points) VALUES (?, ?, ?, ?, 0)',
        args: [userData.id, userData.name, userData.image, userData.username || null],
      });

      const newUser = await findUserById(userData.id);
      if (!newUser) {
        throw new Error('Failed to retrieve created user');
      }

      dbLogger.info(
        {
          userId: newUser.id,
          username: newUser.username,
        },
        'User sign-up: creation successful'
      );

      return newUser;
    }
  } catch (error) {
    dbLogger.error({ error, userData }, 'Error upserting user');
    throw new Error('Failed to upsert user');
  }
}

// ============ STREAK MANAGEMENT ============

export interface StreakUpdateResult {
  updated: boolean;
  previousStreak: number;
  newStreak: number;
}

export async function updateStreak(userId: string): Promise<StreakUpdateResult | null> {
  try {
    // Get current user data
    const user = await findUserById(userId);
    if (!user) {
      dbLogger.error({ userId }, 'User not found for streak update');
      return null; // Don't throw - we don't want to fail the main action
    }

    const today = getTodayUTC();
    const previousStreak = user.current_streak || APP_CONFIG.DEFAULT_STREAK;

    // If user already acted today, no need to update
    if (user.last_action_date === today) {
      dbLogger.debug({ userId, today }, 'User already acted today, streak unchanged');
      return { updated: false, previousStreak, newStreak: previousStreak };
    }

    const yesterday = getYesterdayUTC();
    let newStreak = APP_CONFIG.STREAK_RESET_VALUE;

    if (user.last_action_date) {
      // If last action was yesterday, increment streak
      if (user.last_action_date === yesterday) {
        newStreak = previousStreak + 1;
        dbLogger.debug({ userId, oldStreak: previousStreak, newStreak }, 'Streak continued');
      } else {
        dbLogger.debug(
          { userId, lastActionDate: user.last_action_date },
          'Streak broken, resetting to 1'
        );
      }
    } else {
      dbLogger.debug({ userId }, 'First action, starting streak at 1');
    }

    // Update longest streak if current streak exceeds it
    const newLongestStreak = Math.max(newStreak, user.longest_streak || APP_CONFIG.DEFAULT_STREAK);

    // Update the database with race condition prevention
    // Only update if last_action_date hasn't changed (prevents concurrent updates)
    const result = await getClient().execute({
      sql: `UPDATE users
            SET current_streak = ?,
                longest_streak = ?,
                last_action_date = ?
            WHERE id = ? AND (last_action_date IS NULL OR last_action_date != ?)`,
      args: [newStreak, newLongestStreak, today, userId, today],
    });

    if (result.rowsAffected > 0) {
      dbLogger.info(
        {
          userId,
          currentStreak: newStreak,
          longestStreak: newLongestStreak,
        },
        'Streak updated'
      );
      return { updated: true, previousStreak, newStreak };
    } else {
      dbLogger.debug({ userId }, 'Streak update skipped - concurrent update detected');
      return { updated: false, previousStreak, newStreak: previousStreak };
    }
  } catch (error) {
    // Don't throw - we don't want streak update failures to break the main action
    dbLogger.error({ error, userId }, 'Error updating streak - ignoring to not block main action');
    return null;
  }
}
