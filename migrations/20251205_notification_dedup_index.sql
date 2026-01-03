-- Add unique index for notification deduplication
-- This prevents duplicate notifications when actor+type+post already exists
-- and enables efficient upsert operations

-- Drop old index if exists (recreating with unique constraint)
DROP INDEX IF EXISTS idx_notifications_dedup;

-- Create unique index for notifications with post_id
CREATE UNIQUE INDEX IF NOT EXISTS idx_notifications_dedup
ON notifications(recipient_id, actor_id, type, post_id)
WHERE post_id IS NOT NULL;

-- Create unique index for notifications without post_id (like follow)
CREATE UNIQUE INDEX IF NOT EXISTS idx_notifications_dedup_no_post
ON notifications(recipient_id, actor_id, type)
WHERE post_id IS NULL;
