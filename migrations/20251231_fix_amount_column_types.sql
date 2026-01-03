-- Fix amount column types: TEXT -> INTEGER
--
-- Problem: Migrations declared INTEGER but TypeScript passed strings,
-- causing SQLite to store values as TEXT. This breaks MAX() comparisons
-- because TEXT uses lexicographic ordering ('1077...' < '794...' due to '1' < '7').
--
-- Solution: Recreate tables with proper INTEGER storage using CAST.
-- SQLite doesn't support ALTER COLUMN, so we use the table-rebuild pattern.

-- Disable foreign key checks during table rebuild
PRAGMA foreign_keys = OFF;

-- Clean up any leftover temp tables from failed previous runs
DROP TABLE IF EXISTS claim_events_new;
DROP TABLE IF EXISTS user_rewards_new;
DROP TABLE IF EXISTS merkle_distributions_new;

-- ============================================================================
-- Step 1: Recreate claim_events FIRST (it references user_rewards)
-- ============================================================================

-- Create new table with correct schema
CREATE TABLE claim_events_new (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  wallet_address TEXT NOT NULL,
  amount_claimed INTEGER NOT NULL,
  cumulative_claimed INTEGER NOT NULL,
  reward_id TEXT,
  tx_signature TEXT NOT NULL UNIQUE,
  claimed_at DATETIME NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id),
  FOREIGN KEY (reward_id) REFERENCES user_rewards(id)
);

-- Copy data with CAST to ensure INTEGER storage
INSERT INTO claim_events_new (
  id, user_id, wallet_address, amount_claimed, cumulative_claimed,
  reward_id, tx_signature, claimed_at, created_at
)
SELECT
  id, user_id, wallet_address,
  CAST(amount_claimed AS INTEGER),
  CAST(cumulative_claimed AS INTEGER),
  reward_id, tx_signature, claimed_at, created_at
FROM claim_events;

-- Drop old table
DROP TABLE claim_events;

-- Rename new table
ALTER TABLE claim_events_new RENAME TO claim_events;

-- Recreate indexes
CREATE INDEX IF NOT EXISTS idx_claim_events_user ON claim_events(user_id);
CREATE INDEX IF NOT EXISTS idx_claim_events_wallet ON claim_events(wallet_address);
CREATE INDEX IF NOT EXISTS idx_claim_events_time ON claim_events(claimed_at DESC);

-- ============================================================================
-- Step 2: Recreate user_rewards with proper INTEGER types
-- ============================================================================

-- Create new table with correct schema
CREATE TABLE user_rewards_new (
  id TEXT PRIMARY KEY,
  distribution_id TEXT NOT NULL,
  user_id TEXT NOT NULL,
  wallet_address TEXT NOT NULL,
  amount INTEGER NOT NULL,
  points_converted INTEGER DEFAULT 0,
  claimed_at DATETIME,
  claim_tx TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  amount_earned INTEGER,
  merkle_proof TEXT,
  FOREIGN KEY (distribution_id) REFERENCES merkle_distributions(id),
  FOREIGN KEY (user_id) REFERENCES users(id)
);

-- Copy data with CAST to ensure INTEGER storage
INSERT INTO user_rewards_new (
  id, distribution_id, user_id, wallet_address, amount, points_converted,
  claimed_at, claim_tx, created_at, amount_earned, merkle_proof
)
SELECT
  id, distribution_id, user_id, wallet_address,
  CAST(amount AS INTEGER),
  points_converted,
  claimed_at, claim_tx, created_at,
  CAST(amount_earned AS INTEGER),
  merkle_proof
FROM user_rewards;

-- Drop old table
DROP TABLE user_rewards;

-- Rename new table
ALTER TABLE user_rewards_new RENAME TO user_rewards;

-- Recreate indexes
CREATE INDEX IF NOT EXISTS idx_user_rewards_user ON user_rewards(user_id);
CREATE INDEX IF NOT EXISTS idx_user_rewards_wallet ON user_rewards(wallet_address);
CREATE INDEX IF NOT EXISTS idx_user_rewards_distribution ON user_rewards(distribution_id);
CREATE INDEX IF NOT EXISTS idx_user_rewards_unclaimed ON user_rewards(user_id, claimed_at) WHERE claimed_at IS NULL;

-- ============================================================================
-- Step 3: Recreate merkle_distributions with proper INTEGER types
-- ============================================================================

-- Create new table with correct schema
CREATE TABLE merkle_distributions_new (
  id TEXT PRIMARY KEY,
  merkle_root TEXT NOT NULL,
  total_amount INTEGER NOT NULL,
  user_count INTEGER NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  submitted_at DATETIME,
  submit_tx TEXT
);

-- Copy data with CAST to ensure INTEGER storage
INSERT INTO merkle_distributions_new (
  id, merkle_root, total_amount, user_count, created_at, submitted_at, submit_tx
)
SELECT
  id, merkle_root,
  CAST(total_amount AS INTEGER),
  user_count, created_at, submitted_at, submit_tx
FROM merkle_distributions;

-- Drop old table
DROP TABLE merkle_distributions;

-- Rename new table
ALTER TABLE merkle_distributions_new RENAME TO merkle_distributions;

-- Recreate indexes
CREATE INDEX IF NOT EXISTS idx_distributions_created ON merkle_distributions(created_at DESC);

-- Re-enable foreign key checks
PRAGMA foreign_keys = ON;
