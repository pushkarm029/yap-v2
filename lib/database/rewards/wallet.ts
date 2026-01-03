// Rewards: Wallet operations
// Domain: User wallet linking, wallet lookups

import { dbLogger } from '../../logger';
import { getClient } from '../client';
import type { User } from '../types';

export async function saveUserWallet(userId: string, walletAddress: string): Promise<void> {
  try {
    await getClient().execute({
      sql: 'UPDATE users SET wallet_address = ? WHERE id = ?',
      args: [walletAddress, userId],
    });
    dbLogger.info({ userId, walletAddress }, 'User wallet saved');
  } catch (error) {
    dbLogger.error({ error, userId }, 'Error saving user wallet');
    throw new Error('Failed to save wallet address');
  }
}

export async function getUserByWallet(walletAddress: string): Promise<User | null> {
  try {
    const result = await getClient().execute({
      sql: 'SELECT * FROM users WHERE wallet_address = ?',
      args: [walletAddress],
    });
    return (result.rows[0] as unknown as User) || null;
  } catch (error) {
    dbLogger.error({ error, walletAddress }, 'Error finding user by wallet');
    throw new Error('Failed to find user by wallet');
  }
}

// Get all users with wallet addresses (for balance snapshots)
export async function getUsersWithWallets(): Promise<{ id: string; wallet_address: string }[]> {
  try {
    const result = await getClient().execute({
      sql: `SELECT id, wallet_address FROM users
            WHERE wallet_address IS NOT NULL AND wallet_address != ''`,
      args: [],
    });
    return result.rows.map((row) => ({
      id: String(row.id),
      wallet_address: String(row.wallet_address),
    }));
  } catch (error) {
    dbLogger.error({ error }, 'Error getting users with wallets');
    throw new Error('Failed to get users with wallets');
  }
}
