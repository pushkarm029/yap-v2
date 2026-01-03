// Invite code database operations
// Domain: Invite code validation, creation, usage tracking

import { randomUUID } from 'crypto';
import { dbLogger } from '../logger';
import { getClient } from './client';
import type { InviteCode } from './types';

// ============ INVITE VALIDATION ============

export async function validateInviteCode(
  code: string
): Promise<{ valid: boolean; inviterId?: string }> {
  try {
    const result = await getClient().execute({
      sql: 'SELECT user_id as inviter_id FROM invite_codes WHERE code = ?',
      args: [code],
    });

    if (result.rows.length === 0) {
      return { valid: false };
    }

    return {
      valid: true,
      inviterId: result.rows[0].inviter_id as string,
    };
  } catch (error) {
    dbLogger.error({ error, code }, 'Error validating invite code');
    return { valid: false };
  }
}

// ============ INVITE LINKING ============

export async function linkInvite(userId: string, inviterId: string): Promise<void> {
  try {
    await getClient().execute({
      sql: 'UPDATE users SET invited_by_user_id = ? WHERE id = ?',
      args: [inviterId, userId],
    });

    dbLogger.info({ userId, inviterId }, 'Invite linked to user');
  } catch (error) {
    dbLogger.error({ error, userId, inviterId }, 'Error linking invite');
    throw error;
  }
}

export async function incrementInviteUsage(code: string): Promise<void> {
  try {
    await getClient().execute({
      sql: 'UPDATE invite_codes SET used_count = used_count + 1 WHERE code = ?',
      args: [code],
    });

    dbLogger.info({ code }, 'Invite usage incremented');
  } catch (error) {
    dbLogger.error({ error, code }, 'Error incrementing invite usage');
    throw error;
  }
}

// ============ INVITE CODE MANAGEMENT ============

export async function getUserInviteCode(userId: string): Promise<InviteCode | null> {
  try {
    const result = await getClient().execute({
      sql: 'SELECT * FROM invite_codes WHERE user_id = ?',
      args: [userId],
    });

    if (result.rows.length === 0) {
      return null;
    }

    return result.rows[0] as unknown as InviteCode;
  } catch (error) {
    dbLogger.error({ error, userId }, 'Error getting user invite code');
    throw new Error('Failed to get invite code');
  }
}

export async function createInviteCodeForUser(userId: string, code: string): Promise<void> {
  try {
    const id = randomUUID();
    await getClient().execute({
      sql: 'INSERT INTO invite_codes (id, user_id, code, used_count) VALUES (?, ?, ?, 0)',
      args: [id, userId, code],
    });

    dbLogger.info({ userId, code }, 'Invite code created');
  } catch (error) {
    dbLogger.error({ error, userId, code }, 'Error creating invite code');
    throw error;
  }
}

// ============ AGGREGATE EXPORTS ============

export const invites = {
  validateInviteCode,
  linkInvite,
  incrementInviteUsage,
  getUserInviteCode,
  createInviteCodeForUser,
};
