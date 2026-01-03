-- Enhanced Vote Power: Include Unclaimed YAP
-- Add columns to track unclaimed balance alongside wallet balance
-- Vote power is now calculated from effective_balance = wallet + unclaimed

-- Add new columns with defaults for backward compatibility
ALTER TABLE wallet_snapshots ADD COLUMN unclaimed_balance TEXT DEFAULT '0';
ALTER TABLE wallet_snapshots ADD COLUMN effective_balance TEXT DEFAULT '0';

-- Backfill existing rows: unclaimed=0, effective=wallet balance
UPDATE wallet_snapshots
SET unclaimed_balance = '0',
    effective_balance = balance
WHERE unclaimed_balance IS NULL OR effective_balance IS NULL;
