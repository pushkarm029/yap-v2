-- Users table - core user accounts
CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  name TEXT,
  image TEXT,
  username TEXT UNIQUE,
  bio TEXT,
  points REAL DEFAULT 0,
  wallet_address TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  invited_by_user_id TEXT,
  current_streak INTEGER DEFAULT 0,
  longest_streak INTEGER DEFAULT 0,
  last_action_date TEXT
);

CREATE INDEX IF NOT EXISTS idx_users_username ON users(username);
CREATE INDEX IF NOT EXISTS idx_users_wallet ON users(wallet_address);
CREATE INDEX IF NOT EXISTS idx_users_invited_by ON users(invited_by_user_id);
CREATE INDEX IF NOT EXISTS idx_users_last_action_date ON users(last_action_date);
