import { createClient } from '@libsql/client';

// ACTUAL Production database (yap-chain, not yap-dev-chain)
const client = createClient({
  url: 'libsql://yap-chain-pushkarm029.aws-ap-south-1.turso.io',
  authToken:
    'eyJhbGciOiJFZERTQSIsInR5cCI6IkpXVCJ9.eyJhIjoicnciLCJpYXQiOjE3NjQ2NzU4MjUsImlkIjoiZTI5NTMwOGItNjA4Mi00ODJiLWI2ZDktYzc5NTE1ODMwYjlhIiwicmlkIjoiZjExMjc5NjktNTczNS00NTIxLWE0NmItZmE0ZDYwOWQyNTM1In0.3r0f-KttiGEKFomyk24B3rC2BZWWgvVwd5DpZuSNe7RuyfhSplEHex2doTkbcCxi15elJO9YlBPWo_ZmJyIqDw',
});

async function check() {
  console.log('=== USERS ===');
  const users = await client.execute('SELECT id, username, points, wallet_address FROM users');
  console.table(users.rows);

  console.log('\n=== USER_REWARDS ===');
  const rewards = await client.execute('SELECT * FROM user_rewards');
  console.table(rewards.rows);

  console.log('\n=== MERKLE_DISTRIBUTIONS ===');
  const dists = await client.execute('SELECT * FROM merkle_distributions');
  console.table(dists.rows);

  // Simulate the pending calculation
  console.log('\n=== PENDING POINTS CALCULATION ===');
  for (const user of users.rows) {
    const distributedResult = await client.execute({
      sql: 'SELECT COALESCE(SUM(points_converted), 0) as total FROM user_rewards WHERE user_id = ?',
      args: [user.id],
    });
    const distributed = Number(distributedResult.rows[0].total);
    const points = Number(user.points);
    const pending = Math.max(0, points - distributed);
    console.log(
      `${user.username}: points=${points}, distributed=${distributed}, pending=${pending}`
    );
  }

  // Total pending across ALL users (not just wallet users)
  console.log('\n=== TOTAL PENDING POINTS ===');
  const totalPending = await client.execute(`
    SELECT COALESCE(SUM(u.points - COALESCE(
      (SELECT SUM(ur.points_converted) FROM user_rewards ur WHERE ur.user_id = u.id),
      0
    )), 0) as total_pending
    FROM users u
  `);
  console.log('Total pending points (ALL users):', totalPending.rows[0].total_pending);

  // Test LAG query for incremental amounts
  console.log('\n=== INCREMENTAL AMOUNTS (LAG TEST) ===');
  const lagTest = await client.execute(`
    SELECT
      ur.id,
      ur.user_id,
      ur.amount,
      ur.points_converted,
      ur.claimed_at,
      ur.claim_tx,
      ur.created_at,
      CAST(ur.amount AS INTEGER) - COALESCE(
        LAG(CAST(ur.amount AS INTEGER)) OVER (PARTITION BY ur.user_id ORDER BY ur.created_at ASC),
        0
      ) as incremental_amount
    FROM user_rewards ur
    ORDER BY ur.user_id, ur.created_at ASC
  `);
  for (const r of lagTest.rows) {
    const cumM = (Number(r.amount) / 1e9 / 1e6).toFixed(2);
    const incM = (Number(r.incremental_amount) / 1e9 / 1e6).toFixed(2);
    const status = r.claimed_at ? 'CLAIMED' : 'UNCLAIMED';
    console.log(
      `User ${r.user_id}: cumulative=${cumM}M, incremental=${incM}M, points=${r.points_converted}, ${status}`
    );
    if (r.claim_tx) console.log(`  tx: ${String(r.claim_tx).slice(0, 20)}...`);
  }

  // Staking cache
  console.log('\n=== STAKING CACHE ===');
  const staking = await client.execute('SELECT * FROM staking_cache');
  if (staking.rows.length === 0) {
    console.log('  No staking cache entries (syncs at midnight UTC)');
  } else {
    for (const s of staking.rows) {
      const stakedM = (Number(s.staked_amount) / 1e9 / 1e6).toFixed(2);
      console.log(
        `  User ${s.user_id}: ${stakedM}M staked, vote_power=${s.vote_power}, synced=${s.synced_at}`
      );
    }
  }

  // Test cumulative unclaimed calculation
  console.log('\n=== UNCLAIMED CALCULATION (NEW LOGIC) ===');
  const unclaimed = await client.execute(`
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
  for (const r of unclaimed.rows) {
    const maxSub = (Number(r.max_submitted) / 1e9 / 1e6).toFixed(2);
    const maxClaim = (Number(r.max_claimed) / 1e9 / 1e6).toFixed(2);
    const unc = (Number(r.unclaimed) / 1e9 / 1e6).toFixed(2);
    console.log(
      `  User ${r.user_id}: max_submitted=${maxSub}M, max_claimed=${maxClaim}M, UNCLAIMED=${unc}M`
    );
  }
}

check().catch(console.error);
