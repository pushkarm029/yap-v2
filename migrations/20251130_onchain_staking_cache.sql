-- On-chain staking cache for vote power calculation
-- Synced daily from Solana UserStake PDAs

CREATE TABLE IF NOT EXISTS staking_cache (
  user_id TEXT PRIMARY KEY,
  wallet_address TEXT NOT NULL,
  staked_amount TEXT NOT NULL DEFAULT '0',  -- Raw amount (with decimals) as string for bigint
  vote_power REAL NOT NULL DEFAULT 1.0,      -- Calculated: 1 + 4 * (staked / (staked + 1M))
  synced_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_staking_cache_wallet ON staking_cache(wallet_address);
CREATE INDEX IF NOT EXISTS idx_staking_cache_synced ON staking_cache(synced_at);

-- Note: Vote power formula
-- vote_power = 1 + 4 * (staked_yap / (staked_yap + 1,000,000))
-- Where staked_yap = staked_amount / 1e9 (convert from raw)
--
-- Examples:
-- 0 staked       → 1.0
-- 100K staked    → 1.36
-- 500K staked    → 2.33
-- 1M staked      → 3.0
-- 10M staked     → 4.64
-- Max (∞)        → 5.0
