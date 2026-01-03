-- Wallet balance snapshots for vote power calculation
-- Replaces on-chain staking with wallet balance-based vote power
-- Snapshots taken every 6 hours via cron job

CREATE TABLE IF NOT EXISTS wallet_snapshots (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id TEXT NOT NULL,
  wallet_address TEXT NOT NULL,
  balance TEXT NOT NULL DEFAULT '0',  -- Raw YAP amount (with decimals) as string for bigint
  vote_power REAL NOT NULL DEFAULT 1.0,  -- Calculated: 1 + 4 * (balance / (balance + 1M))
  snapshot_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_wallet_snapshots_user ON wallet_snapshots(user_id);
CREATE INDEX IF NOT EXISTS idx_wallet_snapshots_user_time ON wallet_snapshots(user_id, snapshot_at DESC);

-- Drop the old staking cache table
DROP TABLE IF EXISTS staking_cache;

-- Note: Vote power formula (same as before, but based on wallet balance instead of staked amount)
-- vote_power = 1 + 4 * (balance_yap / (balance_yap + 1,000,000))
-- Where balance_yap = balance / 1e9 (convert from raw lamports)
--
-- Examples:
-- 0 balance       → 1.0
-- 100K balance    → 1.36
-- 500K balance    → 2.33
-- 1M balance      → 3.0
-- 10M balance     → 4.64
-- Max (∞)         → 5.0
