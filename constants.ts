// API Configuration
export const APP_CONFIG = {
  DAILY_ACTION_LIMIT: 8, // Total limit for all actions (posts, comments, upvotes)
  MAX_MENTIONS_PER_POST: 10,
  MAX_POST_LENGTH: 500,
  TWEET_MAX_LENGTH: 500,
  MOBILE_BREAKPOINT: 768,

  // Content Truncation
  MENTION_SNIPPET_LENGTH: 100, // Characters to show in notification snippets

  // Invite System Configuration
  INVITE_DAILY_REDEMPTION_LIMIT: 5, // Max invites a user can redeem per day
  INVITE_CODE_LENGTH: 8, // Character count after prefix
  INVITE_CODE_PREFIX: 'YAP-', // Code prefix
  INVITE_RATE_LIMIT_WINDOW: 24 * 60 * 60 * 1000, // 24 hours in milliseconds

  // Streak Configuration
  DEFAULT_STREAK: 0,
  STREAK_RESET_VALUE: 1,
};

// Solana RPC Configuration
export const SOLANA_CONFIG = {
  RPC_BATCH_SIZE: 100, // Maximum accounts per getMultipleAccountsInfo call
  POINTS_PRECISION: 1e12, // BigInt precision multiplier for point calculations
};
