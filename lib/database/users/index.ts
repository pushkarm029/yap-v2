// Users database operations - barrel export
// Re-exports all user-related functions from domain-specific modules

// Core operations and streaks
export {
  findUserById,
  findUserByUsername,
  getUserStats,
  getUserProfile,
  upsertUser,
  updateStreak,
  type StreakUpdateResult,
} from './core';

// Search, discovery, and mentions
export {
  searchUsersByUsername,
  getNewestUsers,
  getPopularUsers,
  getSuggestedUsers,
  extractMentions,
  validateUsernames,
} from './search';

// Import for aggregate object
import * as core from './core';
import * as search from './search';

// Aggregate export for backwards compatibility with db.users.* pattern
export const users = {
  // Core operations
  findUserById: core.findUserById,
  findUserByUsername: core.findUserByUsername,
  getUserStats: core.getUserStats,
  getUserProfile: core.getUserProfile,
  upsertUser: core.upsertUser,
  updateStreak: core.updateStreak,
  // Search and discovery
  searchUsersByUsername: search.searchUsersByUsername,
  getNewestUsers: search.getNewestUsers,
  getPopularUsers: search.getPopularUsers,
  getSuggestedUsers: search.getSuggestedUsers,
  extractMentions: search.extractMentions,
  validateUsernames: search.validateUsernames,
};
