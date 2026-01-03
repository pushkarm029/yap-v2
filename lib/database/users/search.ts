// Users: Search, discovery, and mention operations
// Domain: User search, suggestions, mention helpers

import { APP_CONFIG } from '@/constants';
import { dbLogger } from '../../logger';
import { getNowISO } from '../../utils/dates';
import { getClient } from '../client';
import { mapRows, type User } from '../types';

// ============ USER SEARCH & DISCOVERY ============

export async function searchUsersByUsername(query: string, limit: number = 5): Promise<User[]> {
  try {
    const result = await getClient().execute({
      sql: `SELECT id, username, name, image, bio, points, created_at, invited_by_user_id
            FROM users
            WHERE LOWER(username) LIKE LOWER(?) OR LOWER(name) LIKE LOWER(?)
            ORDER BY
              CASE
                WHEN LOWER(username) LIKE LOWER(?) THEN 1
                WHEN LOWER(name) LIKE LOWER(?) THEN 2
                ELSE 3
              END,
              username ASC
            LIMIT ?`,
      args: [`%${query}%`, `%${query}%`, `${query}%`, `${query}%`, limit],
    });
    return mapRows<User>(result.rows);
  } catch (error) {
    dbLogger.error({ error, query }, 'Error searching users');
    throw new Error('Failed to search users');
  }
}

export async function getNewestUsers(limit: number = 5): Promise<User[]> {
  try {
    const result = await getClient().execute({
      sql: `SELECT id, username, name, image, bio, points, created_at, invited_by_user_id
            FROM users
            ORDER BY created_at DESC
            LIMIT ?`,
      args: [limit],
    });
    return mapRows<User>(result.rows);
  } catch (error) {
    dbLogger.error({ error }, 'Error fetching newest users');
    throw new Error('Failed to fetch newest users');
  }
}

export async function getPopularUsers(limit: number = 10): Promise<User[]> {
  try {
    const result = await getClient().execute({
      sql: `SELECT id, username, name, image, bio, points, created_at, invited_by_user_id
            FROM users
            ORDER BY points DESC, created_at DESC
            LIMIT ?`,
      args: [limit],
    });
    return mapRows<User>(result.rows);
  } catch (error) {
    dbLogger.error({ error }, 'Error fetching popular users');
    throw new Error('Failed to fetch popular users');
  }
}

export async function getSuggestedUsers(): Promise<User[]> {
  try {
    const hardcodedUsernames = ['Birdinc1', 'pushkarm029', 'mirageaudits'];

    const result = await getClient().execute({
      sql: `SELECT id, username, name, image, bio, points, created_at, invited_by_user_id
            FROM users
            WHERE LOWER(username) IN (LOWER(?), LOWER(?), LOWER(?))`,
      args: hardcodedUsernames,
    });

    const users = result.rows as unknown as User[];
    const foundUsernames = new Set(users.map((u) => u.username?.toLowerCase()));
    const placeholders: User[] = [];

    for (const username of hardcodedUsernames) {
      if (!foundUsernames.has(username.toLowerCase())) {
        placeholders.push({
          id: `placeholder-${username}`,
          username: username,
          name: username,
          image: null,
          bio: null,
          points: 0,
          created_at: getNowISO(),
          invited_by_user_id: null,
          current_streak: APP_CONFIG.DEFAULT_STREAK,
          longest_streak: APP_CONFIG.DEFAULT_STREAK,
          last_action_date: null,
          wallet_address: null,
          gamified_notification_count: 0,
          gamified_notification_date: null,
        });
      }
    }

    const allUsers = [...users, ...placeholders];
    return hardcodedUsernames
      .map(
        (username) => allUsers.find((u) => u.username?.toLowerCase() === username.toLowerCase())!
      )
      .filter(Boolean);
  } catch (error) {
    dbLogger.error({ error }, 'Error fetching suggested users');
    throw new Error('Failed to fetch suggested users');
  }
}

// ============ MENTION HELPERS ============

export function extractMentions(content: string): string[] {
  const mentions = content.match(/@(\w+)/g) || [];
  const usernames = mentions.map((m) => m.slice(1));
  // Return unique usernames, max 10
  return [...new Set(usernames)].slice(0, APP_CONFIG.MAX_MENTIONS_PER_POST);
}

export async function validateUsernames(usernames: string[]): Promise<User[]> {
  if (usernames.length === 0) return [];
  try {
    const placeholders = usernames.map(() => 'LOWER(?)').join(',');
    const result = await getClient().execute({
      sql: `SELECT id, username, name, image FROM users WHERE LOWER(username) IN (${placeholders})`,
      args: usernames,
    });
    return mapRows<User>(result.rows);
  } catch (error) {
    dbLogger.error({ error, usernames }, 'Error validating usernames');
    throw new Error('Failed to validate usernames');
  }
}
