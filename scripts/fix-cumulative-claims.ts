/**
 * Fix cumulative claims data
 *
 * Problem: When a user claims a cumulative amount (e.g., 3.16M), older entries
 * (e.g., 2.80M) should also be marked as claimed since the cumulative includes them.
 *
 * This script finds all claimed entries and marks all PREVIOUS entries for the
 * same user as claimed too.
 */

import { createClient } from '@libsql/client';

// ACTUAL Production database
const client = createClient({
  url: 'libsql://yap-chain-pushkarm029.aws-ap-south-1.turso.io',
  authToken:
    'eyJhbGciOiJFZERTQSIsInR5cCI6IkpXVCJ9.eyJhIjoicnciLCJpYXQiOjE3NjQ2NzU4MjUsImlkIjoiZTI5NTMwOGItNjA4Mi00ODJiLWI2ZDktYzc5NTE1ODMwYjlhIiwicmlkIjoiZjExMjc5NjktNTczNS00NTIxLWE0NmItZmE0ZDYwOWQyNTM1In0.3r0f-KttiGEKFomyk24B3rC2BZWWgvVwd5DpZuSNe7RuyfhSplEHex2doTkbcCxi15elJO9YlBPWo_ZmJyIqDw',
});

async function fixCumulativeClaims() {
  console.log('=== BEFORE FIX ===');

  // Show current state
  const before = await client.execute(`
    SELECT
      ur.user_id,
      ur.amount,
      ur.claimed_at,
      ur.claim_tx,
      ur.created_at
    FROM user_rewards ur
    ORDER BY ur.user_id, ur.created_at ASC
  `);

  console.log('Current user_rewards:');
  for (const r of before.rows) {
    const yapM = (Number(r.amount) / 1e9 / 1e6).toFixed(2);
    const status = r.claimed_at ? 'CLAIMED' : 'UNCLAIMED';
    console.log(`  User ${r.user_id}: ${yapM}M YAP - ${status} (${r.created_at})`);
  }

  // Find users who have at least one claimed entry
  const usersWithClaims = await client.execute(`
    SELECT DISTINCT user_id, MAX(created_at) as max_claimed_at, claim_tx
    FROM user_rewards
    WHERE claimed_at IS NOT NULL
    GROUP BY user_id
  `);

  console.log(`\nFound ${usersWithClaims.rows.length} users with claimed rewards`);

  // For each user, mark all entries with created_at <= max_claimed_at as claimed
  for (const user of usersWithClaims.rows) {
    const result = await client.execute({
      sql: `UPDATE user_rewards
            SET claimed_at = COALESCE(claimed_at, datetime('now')),
                claim_tx = COALESCE(claim_tx, ?)
            WHERE user_id = ?
            AND created_at <= ?
            AND claimed_at IS NULL`,
      args: [user.claim_tx, user.user_id, user.max_claimed_at],
    });

    if (result.rowsAffected > 0) {
      console.log(`  Fixed ${result.rowsAffected} entries for user ${user.user_id}`);
    }
  }

  console.log('\n=== AFTER FIX ===');

  // Show fixed state
  const after = await client.execute(`
    SELECT
      ur.user_id,
      ur.amount,
      ur.claimed_at,
      ur.created_at
    FROM user_rewards ur
    ORDER BY ur.user_id, ur.created_at ASC
  `);

  console.log('Fixed user_rewards:');
  for (const r of after.rows) {
    const yapM = (Number(r.amount) / 1e9 / 1e6).toFixed(2);
    const status = r.claimed_at ? 'CLAIMED' : 'UNCLAIMED';
    console.log(`  User ${r.user_id}: ${yapM}M YAP - ${status} (${r.created_at})`);
  }

  // Verify the fix with the new query logic
  console.log('\n=== VERIFICATION ===');
  const verification = await client.execute(`
    SELECT
      ur.user_id,
      COALESCE(MAX(CASE WHEN md.submitted_at IS NOT NULL THEN CAST(ur.amount AS INTEGER) END), 0) as max_submitted,
      COALESCE(MAX(CASE WHEN ur.claimed_at IS NOT NULL THEN CAST(ur.amount AS INTEGER) END), 0) as max_claimed,
      COALESCE(MAX(CASE WHEN md.submitted_at IS NOT NULL THEN CAST(ur.amount AS INTEGER) END), 0) -
      COALESCE(MAX(CASE WHEN ur.claimed_at IS NOT NULL THEN CAST(ur.amount AS INTEGER) END), 0) as unclaimed
    FROM user_rewards ur
    JOIN merkle_distributions md ON ur.distribution_id = md.id
    GROUP BY ur.user_id
  `);

  for (const r of verification.rows) {
    const maxSub = (Number(r.max_submitted) / 1e9 / 1e6).toFixed(2);
    const maxClaim = (Number(r.max_claimed) / 1e9 / 1e6).toFixed(2);
    const unclaimed = (Number(r.unclaimed) / 1e9 / 1e6).toFixed(2);
    console.log(
      `  User ${r.user_id}: max_submitted=${maxSub}M, max_claimed=${maxClaim}M, unclaimed=${unclaimed}M`
    );
  }
}

fixCumulativeClaims().catch(console.error);
