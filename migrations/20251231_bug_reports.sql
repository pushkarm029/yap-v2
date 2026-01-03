-- Bug Reports table for user feedback and bug reports
-- Supports both authenticated and anonymous submissions

CREATE TABLE IF NOT EXISTS bug_reports (
  id TEXT PRIMARY KEY,
  user_id TEXT,                              -- NULL for anonymous reports
  type TEXT NOT NULL DEFAULT 'bug',          -- 'bug' | 'feedback'
  description TEXT NOT NULL,
  screenshot_url TEXT,                       -- Optional R2 image URL
  diagnostic_info TEXT,                      -- JSON: browser, device, page context
  status TEXT NOT NULL DEFAULT 'new',        -- 'new' | 'reviewed' | 'resolved'
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL
);

-- Index for filtering by status (admin panel queries)
CREATE INDEX IF NOT EXISTS idx_bug_reports_status ON bug_reports(status);

-- Index for chronological listing
CREATE INDEX IF NOT EXISTS idx_bug_reports_created ON bug_reports(created_at DESC);

-- Index for user's own reports
CREATE INDEX IF NOT EXISTS idx_bug_reports_user ON bug_reports(user_id);
