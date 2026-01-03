-- Migration: Stored Notification Messages
-- Adds title and body columns to store pre-generated messages
-- Enables consistent messaging between push notifications and in-app display

-- Add title column (e.g., "New Upvote", "Streak Alert!")
ALTER TABLE notifications ADD COLUMN title TEXT;

-- Add body column (e.g., "Zesty Bird upvoted your yap")
-- Contains the anonymous name baked in at creation time
ALTER TABLE notifications ADD COLUMN body TEXT;

-- NULL values indicate legacy notifications
-- Legacy notifications fall back to runtime message generation
-- No data migration needed for existing rows
