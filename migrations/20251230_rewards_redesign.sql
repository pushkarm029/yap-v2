-- Rewards system redesign: separate distributions from claims
-- This fixes the intermittent history bug caused by cumulative marking
--
-- Problem: When claiming, markRewardClaimed() updates ALL previous user_rewards
-- with the same claim_tx, making history unreliable and confusing.
--
-- Solution: Keep user_rewards immutable (what was EARNED each period),
-- and track claims separately in claim_events (what was CLAIMED and when).

-- 1. Add amount_earned column to store incremental amounts directly
-- Currently calculated via SQL LAG() which is fragile and can return wrong values
ALTER TABLE user_rewards ADD COLUMN amount_earned INTEGER;

-- 2. Add merkle_proof column to cache proofs at distribution time
-- Currently rebuilt O(n) per claim request - very inefficient at scale
ALTER TABLE user_rewards ADD COLUMN merkle_proof TEXT;

-- 3. Create claim_events table (append-only, never mutated)
-- This is the source of truth for what was actually claimed on-chain
CREATE TABLE IF NOT EXISTS claim_events (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  wallet_address TEXT NOT NULL,
  amount_claimed INTEGER NOT NULL,      -- Delta transferred in this specific tx
  cumulative_claimed INTEGER NOT NULL,  -- Total ever claimed after this tx
  reward_id TEXT,                        -- Links to the user_rewards being claimed
  tx_signature TEXT NOT NULL UNIQUE,    -- On-chain tx signature (prevents duplicates)
  claimed_at DATETIME NOT NULL,          -- When the claim was made
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id),
  FOREIGN KEY (reward_id) REFERENCES user_rewards(id)
);

-- Indexes for efficient queries
CREATE INDEX IF NOT EXISTS idx_claim_events_user ON claim_events(user_id);
CREATE INDEX IF NOT EXISTS idx_claim_events_wallet ON claim_events(wallet_address);
CREATE INDEX IF NOT EXISTS idx_claim_events_time ON claim_events(claimed_at DESC);

-- Note: We keep claimed_at and claim_tx columns in user_rewards for backwards
-- compatibility, but they will no longer be updated. New code uses claim_events.
