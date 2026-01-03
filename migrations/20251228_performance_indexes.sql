-- Performance indexes for common query patterns
-- Identified in codebase audit 2025-12-27

-- Posts: parent_id + created_at for comment queries
CREATE INDEX IF NOT EXISTS idx_posts_parent_created ON posts(parent_id, created_at DESC);

-- Upvotes: post_id for upvote lookups
CREATE INDEX IF NOT EXISTS idx_upvotes_post ON upvotes(post_id);

-- Follows: follower_id for follow queries
CREATE INDEX IF NOT EXISTS idx_follows_follower ON follows(follower_id);

-- Notifications: recipient + created_at for notification feeds
CREATE INDEX IF NOT EXISTS idx_notifications_recipient_created ON notifications(recipient_id, created_at DESC);

-- Wallet snapshots: user_id + snapshot_at for latest balance lookups
CREATE INDEX IF NOT EXISTS idx_wallet_snapshots_user_latest ON wallet_snapshots(user_id, snapshot_at DESC);

-- User rewards: wallet + created_at for reward queries
CREATE INDEX IF NOT EXISTS idx_user_rewards_wallet_created ON user_rewards(wallet_address, created_at DESC);
