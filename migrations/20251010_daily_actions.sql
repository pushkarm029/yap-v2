CREATE TABLE IF NOT EXISTS daily_actions (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  action_type TEXT NOT NULL,
  target_id TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_daily_actions_user_created ON daily_actions(user_id, created_at);
CREATE INDEX IF NOT EXISTS idx_daily_actions_type_created ON daily_actions(action_type, created_at);
CREATE INDEX IF NOT EXISTS idx_daily_actions_target ON daily_actions(target_id);
