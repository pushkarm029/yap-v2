-- Migration: Gamified Personalized Notifications
-- Adds support for system-generated notifications with metadata

-- Add metadata column for dynamic notification content (streak count, hours left, etc.)
ALTER TABLE notifications ADD COLUMN metadata TEXT;

-- Add rate limiting columns to users for gamified notifications
-- Max 3 gamified notifications per day per user
ALTER TABLE users ADD COLUMN gamified_notification_count INTEGER DEFAULT 0;
ALTER TABLE users ADD COLUMN gamified_notification_date TEXT;

-- Create system user for gamified notifications (sentinel approach)
-- This avoids making actor_id nullable which would require table recreation in SQLite
INSERT OR IGNORE INTO users (id, name, username, created_at)
VALUES (
  '00000000-0000-0000-0000-000000000000',
  'Yap.Network',
  'system',
  CURRENT_TIMESTAMP
);

-- Index for efficient lookup of gamified notifications by type and recipient
-- Helps with deduplication check (no duplicate type within 24h)
CREATE INDEX IF NOT EXISTS idx_notifications_type_recipient_created
ON notifications(recipient_id, type, created_at);
