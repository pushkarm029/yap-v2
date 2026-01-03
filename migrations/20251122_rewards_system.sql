-- Rewards system - merkle distributions and user allocations
-- Note: amount columns use INTEGER (64-bit signed, max ~9.2e18)
-- With 9 decimals and 1B token supply, max raw value is 1e18 - well within range

-- Merkle distributions table - stores each distribution snapshot
CREATE TABLE IF NOT EXISTS merkle_distributions (
  id TEXT PRIMARY KEY,
  merkle_root TEXT NOT NULL,
  total_amount INTEGER NOT NULL,
  user_count INTEGER NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  submitted_at DATETIME,
  submit_tx TEXT
);

-- User rewards per distribution - tracks individual allocations
CREATE TABLE IF NOT EXISTS user_rewards (
  id TEXT PRIMARY KEY,
  distribution_id TEXT NOT NULL,
  user_id TEXT NOT NULL,
  wallet_address TEXT NOT NULL,
  amount INTEGER NOT NULL,
  points_converted INTEGER DEFAULT 0,
  claimed_at DATETIME,
  claim_tx TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (distribution_id) REFERENCES merkle_distributions(id),
  FOREIGN KEY (user_id) REFERENCES users(id)
);

CREATE INDEX IF NOT EXISTS idx_distributions_created ON merkle_distributions(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_user_rewards_user ON user_rewards(user_id);
CREATE INDEX IF NOT EXISTS idx_user_rewards_wallet ON user_rewards(wallet_address);
CREATE INDEX IF NOT EXISTS idx_user_rewards_distribution ON user_rewards(distribution_id);
CREATE INDEX IF NOT EXISTS idx_user_rewards_unclaimed ON user_rewards(user_id, claimed_at) WHERE claimed_at IS NULL;
