CREATE TABLE IF NOT EXISTS invite_codes (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL UNIQUE,
  code TEXT NOT NULL UNIQUE,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  used_count INTEGER DEFAULT 0,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_invite_code ON invite_codes(code);
CREATE UNIQUE INDEX IF NOT EXISTS idx_invite_user_id ON invite_codes(user_id);
CREATE INDEX IF NOT EXISTS idx_users_invited_by ON users(invited_by_user_id);
