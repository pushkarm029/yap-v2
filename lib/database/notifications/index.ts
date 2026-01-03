// Notifications database operations - barrel export
// Re-exports all notification-related functions from domain-specific modules

// Social notifications
export {
  createNotification,
  createNotificationWithMessage,
  createMentionNotifications,
  getNotificationsForUser,
  getUnreadNotificationCount,
  markNotificationsAsRead,
} from './social';

// Gamified notifications and rate limiting
export {
  createSystemNotification,
  createSystemNotificationWithMessage,
  canReceiveGamifiedNotification,
  incrementGamifiedNotificationCount,
  hasReceivedNotificationTypeToday,
} from './gamified';

// Bulk query helpers for cron jobs
export {
  getUsersWithExpiringStreaks,
  getUsersWithBrokenStreaks,
  getUsersWithStreakMilestones,
  getUsersWithPointsMilestones,
  getUsersWithUnclaimedRewards,
  getActiveUsers,
  getInactiveUsers,
  getUsersWithoutWalletAndPoints,
  getActiveUsersWithNoPoints,
  getUsersFromLatestDistribution,
  getUserWeeklyStats,
  getPopularPostsExpiringSoon,
  getPostsWithMomentum,
  getUsersWithFollowerMilestones,
  FOLLOWER_MILESTONES,
} from './queries';

// Import for aggregate object
import * as social from './social';
import * as gamified from './gamified';
import * as queries from './queries';

// Aggregate export for backwards compatibility with db.notifications.* pattern
export const notifications = {
  // Social notifications
  createNotification: social.createNotification,
  createNotificationWithMessage: social.createNotificationWithMessage,
  createMentionNotifications: social.createMentionNotifications,
  getNotificationsForUser: social.getNotificationsForUser,
  getUnreadNotificationCount: social.getUnreadNotificationCount,
  markNotificationsAsRead: social.markNotificationsAsRead,
  // Gamified notifications
  createSystemNotification: gamified.createSystemNotification,
  createSystemNotificationWithMessage: gamified.createSystemNotificationWithMessage,
  canReceiveGamifiedNotification: gamified.canReceiveGamifiedNotification,
  incrementGamifiedNotificationCount: gamified.incrementGamifiedNotificationCount,
  hasReceivedNotificationTypeToday: gamified.hasReceivedNotificationTypeToday,
  // Query helpers for cron jobs
  getUsersWithExpiringStreaks: queries.getUsersWithExpiringStreaks,
  getUsersWithBrokenStreaks: queries.getUsersWithBrokenStreaks,
  getUsersWithStreakMilestones: queries.getUsersWithStreakMilestones,
  getUsersWithPointsMilestones: queries.getUsersWithPointsMilestones,
  getUsersWithUnclaimedRewards: queries.getUsersWithUnclaimedRewards,
  getActiveUsers: queries.getActiveUsers,
  getInactiveUsers: queries.getInactiveUsers,
  getUsersWithoutWalletAndPoints: queries.getUsersWithoutWalletAndPoints,
  getActiveUsersWithNoPoints: queries.getActiveUsersWithNoPoints,
  getUsersFromLatestDistribution: queries.getUsersFromLatestDistribution,
  getUserWeeklyStats: queries.getUserWeeklyStats,
  getPopularPostsExpiringSoon: queries.getPopularPostsExpiringSoon,
  getPostsWithMomentum: queries.getPostsWithMomentum,
  getUsersWithFollowerMilestones: queries.getUsersWithFollowerMilestones,
  FOLLOWER_MILESTONES: queries.FOLLOWER_MILESTONES,
};
