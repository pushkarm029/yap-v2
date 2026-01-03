// Database module barrel export
// Composes all domain modules into unified `db` object
// Import from '@/lib/database' continues to work

// ============ RE-EXPORT TYPES ============
export * from './types';

// ============ RE-EXPORT CLIENT ============
export { getClient } from './client';

// ============ IMPORT DOMAIN MODULES ============
import { users } from './users';
import { posts } from './posts';
import { upvotes } from './upvotes';
import { comments } from './comments';
import { notifications } from './notifications';
import { rewards } from './rewards';
import { follows } from './follows';
import { invites } from './invites';
import { push } from './push';
import { limits } from './limits';
import { feedback } from './feedback';

// ============ RE-EXPORT INDIVIDUAL FUNCTIONS ============
// For consumers who prefer direct imports

// Users
export {
  findUserById,
  findUserByUsername,
  getUserStats,
  getUserProfile,
  upsertUser,
  updateStreak,
  searchUsersByUsername,
  getNewestUsers,
  getPopularUsers,
  getSuggestedUsers,
  extractMentions,
  validateUsernames,
  type StreakUpdateResult,
} from './users';

// Posts
export {
  createPost,
  getAllPostsWithUpvotes,
  getPaginatedPosts,
  getPostByIdWithUpvotes,
  getPostsByUserIdWithUpvotes,
  getLikedPostsByUserIdWithUpvotes,
  getPostThread,
} from './posts';

// Upvotes
export {
  hasUserUpvoted,
  getUpvoteCount,
  checkTotalDailyLimit,
  getVoteWeight,
  createUpvoteTransaction,
  removeUpvoteTransaction,
} from './upvotes';

// Comments
export {
  getCommentCount,
  getTopLevelCommentsWithEnrichment,
  createCommentTransaction,
} from './comments';

// Notifications
export {
  createNotification,
  createNotificationWithMessage,
  createMentionNotifications,
  getNotificationsForUser,
  getUnreadNotificationCount,
  markNotificationsAsRead,
  createSystemNotification,
  createSystemNotificationWithMessage,
  canReceiveGamifiedNotification,
  incrementGamifiedNotificationCount,
  hasReceivedNotificationTypeToday,
  getUsersWithExpiringStreaks,
  getUsersWithBrokenStreaks,
  getUsersWithStreakMilestones,
  getUsersWithPointsMilestones,
  getUsersWithUnclaimedRewards,
  getInactiveUsers,
} from './notifications';

// Rewards
export {
  saveUserWallet,
  getUserByWallet,
  createDistribution,
  getLatestDistribution,
  submitDistribution,
  getDistributionRewards,
  createUserReward,
  getUserRewards,
  getUserClaimableReward,
  getClaimableRewardByWallet,
  getRewardById,
  getUserDistributedTotal,
  getUserClaimedTotal,
  getUserUnclaimedTotal,
  getDistributableUsers,
  getTotalPendingPoints,
  createClaimEvent,
  getUserClaimEvents,
  claimEventExistsForTx,
  getUsersWithWallets,
  calculateVotePower,
  getWalletVotePower,
  getLatestWalletSnapshot,
  batchSaveWalletSnapshots,
  getBatchUnclaimedTotals,
} from './rewards';

// Follows
export {
  followUser,
  unfollowUser,
  isFollowing,
  getFollowStatusBatch,
  getFollowerCount,
  getFollowingCount,
} from './follows';

// Invites
export {
  validateInviteCode,
  linkInvite,
  incrementInviteUsage,
  getUserInviteCode,
  createInviteCodeForUser,
} from './invites';

// Push
export { savePushSubscription, getPushSubscriptions, deletePushSubscription } from './push';

// Feedback
export {
  createBugReport,
  getBugReportsByUser,
  getBugReportById,
  updateBugReportStatus,
  getBugReportStats,
} from './feedback';

// ============ COMPOSED DB OBJECT ============
// Provides backward compatibility with existing code using `db.methodName()`

export const db = {
  // Users
  ...users,
  // Posts
  ...posts,
  // Upvotes
  ...upvotes,
  // Comments
  ...comments,
  // Notifications
  ...notifications,
  // Rewards
  ...rewards,
  // Follows
  ...follows,
  // Invites
  ...invites,
  // Push
  ...push,
  // Limits
  ...limits,
  // Feedback
  ...feedback,
};

export default db;
