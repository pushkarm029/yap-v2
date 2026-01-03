// Rewards: Claims and user rewards
// Domain: User rewards, claim events, totals

import { dbLogger } from '../../logger';
import { getClient } from '../client';
import type { UserReward, ClaimEvent } from '../types';

// ============ USER REWARDS ============

export async function createUserReward(
  id: string,
  distributionId: string,
  userId: string,
  walletAddress: string,
  amount: bigint,
  pointsConverted: number,
  amountEarned?: bigint,
  merkleProof?: string[]
): Promise<void> {
  try {
    const proofJson = merkleProof ? JSON.stringify(merkleProof) : null;
    await getClient().execute({
      sql: `INSERT INTO user_rewards (id, distribution_id, user_id, wallet_address, amount, points_converted, amount_earned, merkle_proof)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      args: [
        id,
        distributionId,
        userId,
        walletAddress,
        amount,
        pointsConverted,
        amountEarned ?? null,
        proofJson,
      ],
    });
    dbLogger.debug(
      {
        userId,
        amount: amount.toString(),
        amountEarned: amountEarned?.toString(),
        pointsConverted,
      },
      'User reward created'
    );
  } catch (error) {
    dbLogger.error({ error, userId, distributionId }, 'Error creating user reward');
    throw new Error('Failed to create user reward');
  }
}

// Get user rewards (distributions) - returns distribution history
export async function getUserRewards(userId: string): Promise<UserReward[]> {
  try {
    const result = await getClient().execute({
      sql: `SELECT
              ur.id,
              ur.distribution_id,
              ur.user_id,
              ur.wallet_address,
              ur.amount,
              ur.amount_earned,
              ur.points_converted,
              ur.merkle_proof,
              ur.created_at
            FROM user_rewards ur
            JOIN merkle_distributions md ON ur.distribution_id = md.id
            WHERE ur.user_id = ?
            ORDER BY ur.created_at DESC`,
      args: [userId],
    });
    return result.rows.map((row) => ({
      id: String(row.id),
      distribution_id: String(row.distribution_id),
      user_id: String(row.user_id),
      wallet_address: String(row.wallet_address),
      amount: String(row.amount),
      amount_earned: row.amount_earned ? String(row.amount_earned) : null,
      points_converted: Number(row.points_converted),
      merkle_proof: row.merkle_proof ? String(row.merkle_proof) : null,
      created_at: String(row.created_at),
    })) as UserReward[];
  } catch (error) {
    dbLogger.error({ err: error, userId }, 'Error getting user rewards');
    throw new Error('Failed to get user rewards');
  }
}

// Get claimable reward - uses claim_events for determining what's been claimed
// CUMULATIVE LOGIC: A reward is only claimable if its cumulative amount exceeds what's been claimed
export async function getUserClaimableReward(userId: string): Promise<UserReward | null> {
  try {
    const result = await getClient().execute({
      sql: `SELECT ur.*, md.merkle_root
            FROM user_rewards ur
            JOIN merkle_distributions md ON ur.distribution_id = md.id
            WHERE ur.user_id = ?
            AND md.submitted_at IS NOT NULL
            AND ur.amount > COALESCE(
              (SELECT MAX(cumulative_claimed) FROM claim_events WHERE user_id = ?),
              0
            )
            ORDER BY md.created_at DESC
            LIMIT 1`,
      args: [userId, userId],
    });
    if (result.rows.length === 0) return null;
    const row = result.rows[0];
    return {
      id: String(row.id),
      distribution_id: String(row.distribution_id),
      user_id: String(row.user_id),
      wallet_address: String(row.wallet_address),
      amount: String(row.amount),
      amount_earned: row.amount_earned ? String(row.amount_earned) : null,
      points_converted: Number(row.points_converted),
      merkle_proof: row.merkle_proof ? String(row.merkle_proof) : null,
      created_at: String(row.created_at),
    };
  } catch (error) {
    dbLogger.error({ err: error, userId }, 'Error getting claimable reward');
    throw new Error('Failed to get claimable reward');
  }
}

// Get claimable reward by wallet
export async function getClaimableRewardByWallet(
  walletAddress: string
): Promise<(UserReward & { merkle_root: string }) | null> {
  try {
    const result = await getClient().execute({
      sql: `SELECT ur.id, ur.distribution_id, ur.user_id, ur.wallet_address,
                   ur.amount, ur.amount_earned, ur.points_converted, ur.merkle_proof,
                   ur.created_at, md.merkle_root
            FROM user_rewards ur
            JOIN merkle_distributions md ON ur.distribution_id = md.id
            WHERE ur.wallet_address = ?
            AND md.submitted_at IS NOT NULL
            AND ur.amount > COALESCE(
              (SELECT MAX(cumulative_claimed) FROM claim_events WHERE wallet_address = ?),
              0
            )
            ORDER BY md.created_at DESC
            LIMIT 1`,
      args: [walletAddress, walletAddress],
    });
    if (result.rows.length === 0) return null;
    const row = result.rows[0];
    return {
      id: String(row.id),
      distribution_id: String(row.distribution_id),
      user_id: String(row.user_id),
      wallet_address: String(row.wallet_address),
      amount: String(row.amount),
      amount_earned: row.amount_earned ? String(row.amount_earned) : null,
      points_converted: Number(row.points_converted),
      merkle_proof: row.merkle_proof ? String(row.merkle_proof) : null,
      created_at: String(row.created_at),
      merkle_root: String(row.merkle_root),
    };
  } catch (error) {
    dbLogger.error({ err: error, walletAddress }, 'Error getting claimable reward by wallet');
    throw new Error('Failed to get claimable reward');
  }
}

// Get reward by ID - used for ownership verification
export async function getRewardById(rewardId: string): Promise<UserReward | null> {
  try {
    const result = await getClient().execute({
      sql: `SELECT id, distribution_id, user_id, wallet_address, amount,
            amount_earned, points_converted, merkle_proof, created_at
            FROM user_rewards WHERE id = ?`,
      args: [rewardId],
    });
    if (result.rows.length === 0) return null;
    const row = result.rows[0];
    return {
      id: String(row.id),
      distribution_id: String(row.distribution_id),
      user_id: String(row.user_id),
      wallet_address: String(row.wallet_address),
      amount: String(row.amount),
      amount_earned: row.amount_earned ? String(row.amount_earned) : null,
      points_converted: Number(row.points_converted),
      merkle_proof: row.merkle_proof ? String(row.merkle_proof) : null,
      created_at: String(row.created_at),
    };
  } catch (error) {
    dbLogger.error({ err: error, rewardId }, 'Error getting reward by id');
    throw new Error('Failed to get reward');
  }
}

// ============ REWARD TOTALS ============

export async function getUserDistributedTotal(userId: string): Promise<number> {
  try {
    const result = await getClient().execute({
      sql: `SELECT COALESCE(SUM(points_converted), 0) as total
            FROM user_rewards WHERE user_id = ?`,
      args: [userId],
    });
    return Number(result.rows[0]?.total || 0);
  } catch (error) {
    dbLogger.error({ error, userId }, 'Error getting user distributed total');
    throw new Error('Failed to get distributed total');
  }
}

// Get total claimed amount from claim_events (MAX cumulative_claimed)
export async function getUserClaimedTotal(userId: string): Promise<string> {
  try {
    const result = await getClient().execute({
      sql: `SELECT COALESCE(MAX(cumulative_claimed), 0) as total
            FROM claim_events WHERE user_id = ?`,
      args: [userId],
    });
    return String(result.rows[0]?.total || '0');
  } catch (error) {
    dbLogger.error({ err: error, userId }, 'Error getting user claimed total');
    throw new Error('Failed to get claimed total');
  }
}

// Get total unclaimed amount (MAX submitted reward - MAX cumulative_claimed)
export async function getUserUnclaimedTotal(userId: string): Promise<string> {
  try {
    const result = await getClient().execute({
      sql: `SELECT
              COALESCE(
                (SELECT MAX(ur.amount)
                 FROM user_rewards ur
                 JOIN merkle_distributions md ON ur.distribution_id = md.id
                 WHERE ur.user_id = ? AND md.submitted_at IS NOT NULL),
                0
              ) -
              COALESCE(
                (SELECT MAX(cumulative_claimed) FROM claim_events WHERE user_id = ?),
                0
              ) as total`,
      args: [userId, userId],
    });
    const rawValue = result.rows[0]?.total;
    const rawTotal = BigInt(typeof rawValue === 'bigint' ? rawValue : String(rawValue || 0));
    const total = rawTotal < BigInt(0) ? BigInt(0) : rawTotal;
    return total.toString();
  } catch (error) {
    dbLogger.error({ err: error, userId }, 'Error getting user unclaimed total');
    throw new Error('Failed to get unclaimed total');
  }
}

// ============ CLAIM EVENTS ============

export async function createClaimEvent(
  id: string,
  userId: string,
  walletAddress: string,
  amountClaimed: bigint,
  cumulativeClaimed: bigint,
  rewardId: string | null,
  txSignature: string
): Promise<void> {
  try {
    await getClient().execute({
      sql: `INSERT INTO claim_events
            (id, user_id, wallet_address, amount_claimed, cumulative_claimed, reward_id, tx_signature, claimed_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)`,
      args: [id, userId, walletAddress, amountClaimed, cumulativeClaimed, rewardId, txSignature],
    });
    dbLogger.info(
      { userId, amountClaimed: amountClaimed.toString(), txSignature },
      'Claim event created'
    );
  } catch (error) {
    if (error instanceof Error && error.message.includes('UNIQUE constraint failed')) {
      dbLogger.warn({ txSignature }, 'Claim event already exists for this transaction');
      return; // Idempotent
    }
    dbLogger.error({ error, userId, txSignature }, 'Error creating claim event');
    throw new Error('Failed to create claim event');
  }
}

export async function getUserClaimEvents(userId: string): Promise<ClaimEvent[]> {
  try {
    const result = await getClient().execute({
      sql: `SELECT id, user_id, wallet_address, amount_claimed, cumulative_claimed,
                   reward_id, tx_signature, claimed_at, created_at
            FROM claim_events
            WHERE user_id = ?
            ORDER BY claimed_at DESC`,
      args: [userId],
    });
    return result.rows.map((row) => ({
      id: String(row.id),
      user_id: String(row.user_id),
      wallet_address: String(row.wallet_address),
      amount_claimed: String(row.amount_claimed),
      cumulative_claimed: String(row.cumulative_claimed),
      reward_id: row.reward_id ? String(row.reward_id) : null,
      tx_signature: String(row.tx_signature),
      claimed_at: String(row.claimed_at),
      created_at: String(row.created_at),
    })) as ClaimEvent[];
  } catch (error) {
    dbLogger.error({ err: error, userId }, 'Error getting user claim events');
    throw new Error('Failed to get claim events');
  }
}

export async function claimEventExistsForTx(txSignature: string): Promise<boolean> {
  try {
    const result = await getClient().execute({
      sql: `SELECT 1 FROM claim_events WHERE tx_signature = ? LIMIT 1`,
      args: [txSignature],
    });
    return result.rows.length > 0;
  } catch (error) {
    dbLogger.error({ err: error, txSignature }, 'Error checking claim event existence');
    throw new Error('Failed to check claim event');
  }
}

// ============ BATCH OPERATIONS ============

/**
 * Batch fetch unclaimed totals for multiple users.
 * Used during daily snapshot to avoid N+1 queries.
 *
 * Unclaimed = MAX(submitted user_rewards.amount) - MAX(cumulative_claimed)
 *
 * @param userIds - Array of user IDs to fetch unclaimed totals for
 * @returns Map of userId -> unclaimed amount (as string for BigInt)
 */
export async function getBatchUnclaimedTotals(userIds: string[]): Promise<Map<string, string>> {
  if (userIds.length === 0) {
    return new Map();
  }

  try {
    const placeholders = userIds.map(() => '?').join(',');
    const result = await getClient().execute({
      sql: `
        WITH max_rewards AS (
          SELECT ur.user_id, MAX(ur.amount) as max_reward
          FROM user_rewards ur
          JOIN merkle_distributions md ON ur.distribution_id = md.id
          WHERE ur.user_id IN (${placeholders}) AND md.submitted_at IS NOT NULL
          GROUP BY ur.user_id
        ),
        max_claims AS (
          SELECT user_id, MAX(cumulative_claimed) as max_claimed
          FROM claim_events
          WHERE user_id IN (${placeholders})
          GROUP BY user_id
        )
        SELECT mr.user_id,
               COALESCE(mr.max_reward, 0) - COALESCE(mc.max_claimed, 0) as unclaimed
        FROM max_rewards mr
        LEFT JOIN max_claims mc ON mr.user_id = mc.user_id
      `,
      args: [...userIds, ...userIds],
    });

    const map = new Map<string, string>();
    for (const row of result.rows) {
      const rawUnclaimed = BigInt(String(row.unclaimed || 0));
      // Clamp to 0 if negative (data integrity safeguard)
      const unclaimed = rawUnclaimed < BigInt(0) ? BigInt(0) : rawUnclaimed;
      map.set(String(row.user_id), unclaimed.toString());
    }

    dbLogger.debug(
      { userCount: userIds.length, resultCount: map.size },
      'Batch unclaimed totals fetched'
    );
    return map;
  } catch (error) {
    dbLogger.error(
      { err: error, userCount: userIds.length },
      'Error getting batch unclaimed totals'
    );
    throw new Error('Failed to get batch unclaimed totals');
  }
}
