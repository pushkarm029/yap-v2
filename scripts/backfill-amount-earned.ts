#!/usr/bin/env bun
/**
 * Backfill script for rewards redesign migration
 *
 * This script:
 * 1. Calculates and backfills `amount_earned` for existing user_rewards records
 * 2. Migrates existing claimed rewards to the new claim_events table
 *
 * Safe to run multiple times - uses INSERT OR IGNORE for claim_events
 */

import { createClient } from '@libsql/client';
import { randomUUID } from 'crypto';

async function backfillRewardsData() {
  if (!process.env.TURSO_DATABASE_URL || !process.env.TURSO_AUTH_TOKEN) {
    console.error('Error: TURSO_DATABASE_URL and TURSO_AUTH_TOKEN must be set');
    process.exit(1);
  }

  const client = createClient({
    url: process.env.TURSO_DATABASE_URL,
    authToken: process.env.TURSO_AUTH_TOKEN,
    intMode: 'bigint', // Handle large integers as BigInt
  });

  try {
    console.log('Starting backfill...\n');

    // Step 1: Calculate and update amount_earned using LAG window function
    console.log('Step 1: Backfilling amount_earned column...');

    // First, get all user_rewards with calculated incremental amounts
    const rewardsResult = await client.execute(`
      SELECT
        ur.id,
        ur.user_id,
        ur.amount,
        ur.amount - COALESCE(
          LAG(ur.amount) OVER (PARTITION BY ur.user_id ORDER BY ur.created_at ASC),
          0
        ) as calculated_earned
      FROM user_rewards ur
      WHERE ur.amount_earned IS NULL
      ORDER BY ur.user_id, ur.created_at ASC
    `);

    console.log(`  Found ${rewardsResult.rows.length} records to update`);

    // Update each record
    let updatedCount = 0;
    for (const row of rewardsResult.rows) {
      await client.execute({
        sql: 'UPDATE user_rewards SET amount_earned = ? WHERE id = ?',
        args: [row.calculated_earned, row.id],
      });
      updatedCount++;
    }

    console.log(`  Updated ${updatedCount} records with amount_earned\n`);

    // Step 2: Migrate claimed rewards to claim_events table
    console.log('Step 2: Migrating claimed rewards to claim_events...');

    // Get all claimed rewards that don't have a corresponding claim_event
    const claimedResult = await client.execute(`
      SELECT
        ur.id,
        ur.user_id,
        ur.wallet_address,
        ur.amount,
        ur.claim_tx,
        ur.claimed_at
      FROM user_rewards ur
      WHERE ur.claimed_at IS NOT NULL
      AND ur.claim_tx IS NOT NULL
      AND NOT EXISTS (
        SELECT 1 FROM claim_events ce WHERE ce.tx_signature = ur.claim_tx
      )
      ORDER BY ur.user_id, ur.claimed_at ASC
    `);

    console.log(`  Found ${claimedResult.rows.length} claimed rewards to migrate`);

    // Group by claim_tx to avoid duplicates (multiple rewards with same tx)
    const claimsByTx = new Map<
      string,
      {
        userId: string;
        walletAddress: string;
        maxAmount: bigint;
        claimedAt: string;
        rewardIds: string[];
      }
    >();

    for (const row of claimedResult.rows) {
      const txSig = row.claim_tx as string;
      const existing = claimsByTx.get(txSig);
      const amount = BigInt(row.amount as bigint);

      if (existing) {
        // Same tx - take the max amount (cumulative)
        if (amount > existing.maxAmount) {
          existing.maxAmount = amount;
        }
        existing.rewardIds.push(row.id as string);
      } else {
        claimsByTx.set(txSig, {
          userId: row.user_id as string,
          walletAddress: row.wallet_address as string,
          maxAmount: amount,
          claimedAt: row.claimed_at as string,
          rewardIds: [row.id as string],
        });
      }
    }

    console.log(`  Grouped into ${claimsByTx.size} unique claim transactions`);

    // Calculate cumulative claimed for each user
    const userCumulativeClaimed = new Map<string, bigint>();

    // Sort by claimed_at to ensure correct cumulative calculation
    const sortedClaims = Array.from(claimsByTx.entries()).sort(
      ([, a], [, b]) => new Date(a.claimedAt).getTime() - new Date(b.claimedAt).getTime()
    );

    let migratedCount = 0;
    for (const [txSig, claim] of sortedClaims) {
      // Calculate amount_claimed (delta from previous cumulative)
      const previousCumulative = userCumulativeClaimed.get(claim.userId) || 0n;
      const amountClaimed = claim.maxAmount - previousCumulative;

      // Update cumulative
      userCumulativeClaimed.set(claim.userId, claim.maxAmount);

      // Insert claim_event (convert BigInt to string for storage)
      await client.execute({
        sql: `INSERT OR IGNORE INTO claim_events
              (id, user_id, wallet_address, amount_claimed, cumulative_claimed, reward_id, tx_signature, claimed_at)
              VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        args: [
          randomUUID(),
          claim.userId,
          claim.walletAddress,
          amountClaimed.toString(),
          claim.maxAmount.toString(),
          claim.rewardIds[claim.rewardIds.length - 1], // Link to the latest reward
          txSig,
          claim.claimedAt,
        ],
      });
      migratedCount++;
    }

    console.log(`  Migrated ${migratedCount} claim events\n`);

    // Step 3: Verify the migration
    console.log('Step 3: Verifying migration...');

    const verifyResult = await client.execute(`
      SELECT
        (SELECT COUNT(*) FROM user_rewards WHERE amount_earned IS NULL) as null_earned,
        (SELECT COUNT(*) FROM user_rewards WHERE claimed_at IS NOT NULL) as total_claimed,
        (SELECT COUNT(*) FROM claim_events) as claim_events_count
    `);

    const nullEarned = verifyResult.rows[0]?.null_earned as number;
    const totalClaimed = verifyResult.rows[0]?.total_claimed as number;
    const claimEventsCount = verifyResult.rows[0]?.claim_events_count as number;

    console.log(`  Records with null amount_earned: ${nullEarned}`);
    console.log(`  Total claimed user_rewards: ${totalClaimed}`);
    console.log(`  Total claim_events: ${claimEventsCount}`);

    if (nullEarned > 0) {
      console.warn('\n  Warning: Some records still have null amount_earned');
    }

    console.log('\n✅ Backfill completed successfully!');
  } catch (error) {
    console.error('Backfill failed:', error);
    process.exit(1);
  } finally {
    client.close();
  }
}

backfillRewardsData();
