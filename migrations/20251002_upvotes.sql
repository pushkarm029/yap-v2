-- Upvotes table - post voting with weighted votes
CREATE TABLE IF NOT EXISTS upvotes (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  post_id TEXT NOT NULL,
  vote_weight REAL DEFAULT 1.0,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (post_id) REFERENCES posts(id) ON DELETE CASCADE,
  UNIQUE(user_id, post_id)
);

CREATE INDEX IF NOT EXISTS idx_upvotes_post_id ON upvotes(post_id);
CREATE INDEX IF NOT EXISTS idx_upvotes_user_id ON upvotes(user_id);
