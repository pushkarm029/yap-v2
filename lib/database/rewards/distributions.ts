// Rewards: Distribution operations
// Domain: Merkle distributions, user eligibility

import { dbLogger } from '../../logger';
import { getClient } from '../client';
import type { MerkleDistribution, UserReward } from '../types';

export async function createDistribution(
  id: string,
  merkleRoot: string,
  totalAmount: bigint,
  userCount: number
): Promise<MerkleDistribution> {
  try {
    await getClient().execute({
      sql: `INSERT INTO merkle_distributions (id, merkle_root, total_amount, user_count)
            VALUES (?, ?, ?, ?)`,
      args: [id, merkleRoot, totalAmount, userCount],
    });

    const result = await getClient().execute({
      sql: 'SELECT * FROM merkle_distributions WHERE id = ?',
      args: [id],
    });

    dbLogger.info({ id, userCount, totalAmount: totalAmount.toString() }, 'Distribution created');
    return result.rows[0] as unknown as MerkleDistribution;
  } catch (error) {
    dbLogger.error({ error, id }, 'Error creating distribution');
    throw new Error('Failed to create distribution');
  }
}

export async function getLatestDistribution(): Promise<MerkleDistribution | null> {
  try {
    const result = await getClient().execute({
      sql: 'SELECT * FROM merkle_distributions ORDER BY created_at DESC LIMIT 1',
      args: [],
    });
    return (result.rows[0] as unknown as MerkleDistribution) || null;
  } catch (error) {
    dbLogger.error({ error }, 'Error getting latest distribution');
    throw new Error('Failed to get latest distribution');
  }
}

export async function submitDistribution(id: string, submitTx: string): Promise<void> {
  try {
    await getClient().execute({
      sql: `UPDATE merkle_distributions
            SET submitted_at = CURRENT_TIMESTAMP, submit_tx = ?
            WHERE id = ?`,
      args: [submitTx, id],
    });
    dbLogger.info({ id, submitTx }, 'Distribution submitted onchain');
  } catch (error) {
    dbLogger.error({ error, id }, 'Error submitting distribution');
    throw new Error('Failed to submit distribution');
  }
}

export async function getDistributionRewards(distributionId: string): Promise<UserReward[]> {
  try {
    const result = await getClient().execute({
      sql: `SELECT * FROM user_rewards WHERE distribution_id = ?`,
      args: [distributionId],
    });
    return result.rows as unknown as UserReward[];
  } catch (error) {
    dbLogger.error({ error, distributionId }, 'Error getting distribution rewards');
    throw new Error('Failed to get distribution rewards');
  }
}

// Get users eligible for distribution (have wallet + undistributed points)
// Returns points-based tracking and cumulative YAP for merkle tree
// Note: user_rewards.amount stores CUMULATIVE totals as INTEGER (matching merkle tree design)
export async function getDistributableUsers(): Promise<
  {
    id: string;
    wallet_address: string;
    points: number;
    points_distributed: number;
    allocatable_points: number;
    cumulative_yap: string;
  }[]
> {
  try {
    const result = await getClient().execute({
      sql: `SELECT
              u.id,
              u.wallet_address,
              u.points,
              COALESCE(SUM(ur.points_converted), 0) as points_distributed,
              COALESCE(MAX(ur.amount), 0) as cumulative_yap
            FROM users u
            LEFT JOIN user_rewards ur ON u.id = ur.user_id
            WHERE u.wallet_address IS NOT NULL
              AND u.wallet_address != ''
              AND u.points > 0
            GROUP BY u.id
            HAVING u.points > COALESCE(SUM(ur.points_converted), 0)`,
      args: [],
    });
    return result.rows.map((row) => ({
      id: String(row.id),
      wallet_address: String(row.wallet_address),
      points: Number(row.points),
      points_distributed: Number(row.points_distributed),
      allocatable_points: Number(row.points) - Number(row.points_distributed),
      cumulative_yap: String(row.cumulative_yap),
    }));
  } catch (error) {
    dbLogger.error({ err: error }, 'Error getting distributable users');
    throw new Error('Failed to get distributable users');
  }
}

// Get total pending points for wallet-connected users only (active pool)
export async function getTotalPendingPoints(): Promise<number> {
  try {
    const result = await getClient().execute({
      sql: `SELECT
              COALESCE(SUM(u.points - COALESCE(
                (SELECT SUM(ur.points_converted) FROM user_rewards ur WHERE ur.user_id = u.id),
                0
              )), 0) as total_pending
            FROM users u
            WHERE u.wallet_address IS NOT NULL AND u.wallet_address != ''`,
      args: [],
    });
    return Number(result.rows[0]?.total_pending || 0);
  } catch (error) {
    dbLogger.error({ error }, 'Error getting total pending points');
    throw new Error('Failed to get total pending points');
  }
}
