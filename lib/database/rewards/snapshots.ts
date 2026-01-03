// Rewards: Wallet snapshots and vote power
// Domain: Balance snapshots, vote power calculation

import { dbLogger } from '../../logger';
import { getClient } from '../client';
import type { WalletSnapshot } from '../types';

/**
 * Calculate vote power from raw YAP balance
 * Formula: 1 + 4 * (balance / (balance + 1M))
 * Range: [1.0, 5.0) - everyone has baseline, diminishing returns for whales
 *
 * @param rawBalance - Raw YAP amount as string (with 9 decimals)
 * @returns Vote power between 1.0 and 5.0
 */
export function calculateVotePower(rawBalance: string): number {
  const balance = Number(rawBalance) / 1e9; // Convert from raw to YAP
  if (isNaN(balance) || balance <= 0) return 1.0;
  const votePower = 1 + 4 * (balance / (balance + 1_000_000));
  return Math.min(5.0, Math.max(1.0, votePower)); // Clamp to [1.0, 5.0]
}

// Get vote power from latest wallet snapshot (returns 1.0 if not found, throws on error)
export async function getWalletVotePower(userId: string): Promise<number> {
  try {
    const result = await getClient().execute({
      sql: `SELECT vote_power FROM wallet_snapshots
            WHERE user_id = ?
            ORDER BY snapshot_at DESC
            LIMIT 1`,
      args: [userId],
    });

    if (result.rows.length === 0) {
      return 1.0; // Legitimate: user has no snapshot yet → baseline vote power
    }

    return Number(result.rows[0].vote_power);
  } catch (error) {
    dbLogger.error({ error, userId }, 'Error getting wallet vote power');
    throw new Error('Failed to get wallet vote power');
  }
}

// Get latest wallet snapshot for a user (returns null if not found, throws on error)
export async function getLatestWalletSnapshot(userId: string): Promise<WalletSnapshot | null> {
  try {
    const result = await getClient().execute({
      sql: `SELECT id, user_id, wallet_address, balance, unclaimed_balance, effective_balance, vote_power, snapshot_at
            FROM wallet_snapshots
            WHERE user_id = ?
            ORDER BY snapshot_at DESC
            LIMIT 1`,
      args: [userId],
    });

    if (result.rows.length === 0) {
      return null; // Legitimate: user has no snapshot yet
    }

    const row = result.rows[0];
    return {
      id: Number(row.id),
      userId: String(row.user_id),
      walletAddress: String(row.wallet_address),
      balance: String(row.balance),
      unclaimedBalance: String(row.unclaimed_balance || '0'),
      effectiveBalance: String(row.effective_balance || row.balance),
      votePower: Number(row.vote_power),
      snapshotAt: String(row.snapshot_at),
    };
  } catch (error) {
    dbLogger.error({ error, userId }, 'Error getting latest wallet snapshot');
    throw new Error('Failed to get latest wallet snapshot');
  }
}

// Batch save wallet snapshots (used by cron job)
export async function batchSaveWalletSnapshots(
  entries: {
    userId: string;
    walletAddress: string;
    balance: string;
    unclaimedBalance: string;
    effectiveBalance: string;
    votePower: number;
  }[]
): Promise<void> {
  if (entries.length === 0) return;

  try {
    const statements = entries.map((entry) => ({
      sql: `INSERT INTO wallet_snapshots (user_id, wallet_address, balance, unclaimed_balance, effective_balance, vote_power, snapshot_at)
            VALUES (?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)`,
      args: [
        entry.userId,
        entry.walletAddress,
        entry.balance,
        entry.unclaimedBalance,
        entry.effectiveBalance,
        entry.votePower,
      ],
    }));

    await getClient().batch(statements, 'write');
    dbLogger.info({ count: entries.length }, 'Batch wallet snapshots saved');
  } catch (error) {
    dbLogger.error({ error, count: entries.length }, 'Error batch saving wallet snapshots');
    throw new Error('Failed to batch save wallet snapshots');
  }
}
