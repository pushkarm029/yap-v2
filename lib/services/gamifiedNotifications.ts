/**
 * Gamified Notifications Service
 *
 * Handles BATCH processing of gamified notification types that need cron jobs:
 * - Streak warnings (3h, 1h before expiry)
 * - Streak broken notifications
 * - Claim reminders (unclaimed YAP)
 * - Engagement nudges (inactive 2+ days)
 * - Wallet connect reminders
 * - Expiring popular posts
 * - Weekly summary
 *
 * NOTE: The following are now handled in real-time (see realTimeNotifications.ts):
 * - Streak milestones → triggered on post creation
 * - Points milestones → triggered on upvote
 * - Follower milestones → triggered on follow
 * - Post momentum → triggered on upvote
 * - Daily goal → triggered when actions exhausted
 */

import { db } from '@/lib/database';
import { apiLogger } from '@/lib/logger';
import { sendGamifiedNotification } from './notifications';
import { processWithJitter, shuffle } from '@/lib/utils/jitter';

// Milestone thresholds
export const STREAK_MILESTONES = [7, 14, 30, 60, 100, 365];
export const POINTS_MILESTONES = [100, 500, 1000, 5000, 10000];

// Create a child logger for gamified notifications
const logger = apiLogger.child({ service: 'gamified-notifications' });

/**
 * Process 3-hour streak warning notifications
 * For users whose streaks expire in ~3 hours
 */
export async function processStreakWarning3h(): Promise<number> {
  const users = shuffle(await db.getUsersWithExpiringStreaks(3));

  const result = await processWithJitter(
    users,
    async (user) => {
      const notificationId = await sendGamifiedNotification({
        type: 'streak_warning',
        recipientId: user.id,
        metadata: { streakCount: user.current_streak, hoursLeft: 3, actionUrl: '/' },
      });
      return !!notificationId;
    },
    3, // 0-3 seconds jitter between notifications
    'streak_warning_3h'
  );

  logger.info({ ...result, hoursLeft: 3 }, 'Processed 3-hour streak warnings');
  return result.successCount;
}

/**
 * Process 1-hour streak warning notifications (urgent)
 * Last chance warnings for users about to lose their streak
 * NOTE: No jitter for urgent notifications - time is critical!
 */
export async function processStreakWarning1h(): Promise<number> {
  let count = 0;

  // No shuffle or jitter - send immediately, these are time-critical
  const users = await db.getUsersWithExpiringStreaks(1);
  for (const user of users) {
    const notificationId = await sendGamifiedNotification({
      type: 'streak_warning',
      recipientId: user.id,
      metadata: { streakCount: user.current_streak, hoursLeft: 1, actionUrl: '/' },
    });
    if (notificationId) count++;
  }

  logger.info({ count, hoursLeft: 1 }, 'Processed 1-hour streak warnings (urgent)');
  return count;
}

/**
 * Process streak broken notifications
 * Notifies users when their streak has ended
 */
export async function processStreakBroken(): Promise<number> {
  const users = shuffle(await db.getUsersWithBrokenStreaks());

  const result = await processWithJitter(
    users,
    async (user) => {
      const notificationId = await sendGamifiedNotification({
        type: 'streak_broken',
        recipientId: user.id,
        metadata: { previousStreak: user.current_streak, actionUrl: '/' },
      });
      return !!notificationId;
    },
    3,
    'streak_broken'
  );

  logger.info(result, 'Processed streak broken notifications');
  return result.successCount;
}

// NOTE: Streak milestones are now real-time (see realTimeNotifications.ts)
// NOTE: Points milestones are now real-time (see realTimeNotifications.ts)

/**
 * Process claim reminder notifications
 * Reminds users with unclaimed YAP rewards
 */
export async function processClaimReminders(): Promise<number> {
  const usersWithRewards = shuffle(await db.getUsersWithUnclaimedRewards());

  const result = await processWithJitter(
    usersWithRewards,
    async ({ userId, amount }) => {
      const notificationId = await sendGamifiedNotification({
        type: 'claim_reminder',
        recipientId: userId,
        metadata: { unclaimedAmount: amount, actionUrl: '/rewards' },
      });
      return !!notificationId;
    },
    3,
    'claim_reminder'
  );

  logger.info(result, 'Processed claim reminders');
  return result.successCount;
}

/**
 * Process engagement nudge notifications
 * Nudges users who have been inactive for 2+ days
 */
export async function processEngagementNudges(): Promise<number> {
  const inactiveUsers = shuffle(await db.getInactiveUsers(2));

  const result = await processWithJitter(
    inactiveUsers,
    async (user) => {
      const lastAction = user.last_action_date ? new Date(user.last_action_date) : null;
      const now = new Date();
      const inactiveDays = lastAction
        ? Math.floor((now.getTime() - lastAction.getTime()) / (1000 * 60 * 60 * 24))
        : 0;

      const notificationId = await sendGamifiedNotification({
        type: 'engagement_nudge',
        recipientId: user.id,
        metadata: { inactiveDays, actionUrl: '/' },
      });
      return !!notificationId;
    },
    3,
    'engagement_nudge'
  );

  logger.info(result, 'Processed engagement nudges');
  return result.successCount;
}

/**
 * Process actions recharged notifications
 * Notifies active users that their daily actions have reset
 *
 * NOTE: This runs at midnight UTC (distribute cron)
 */
export async function processActionsRecharged(): Promise<number> {
  const activeUsers = shuffle(await db.getActiveUsers(7));

  const result = await processWithJitter(
    activeUsers,
    async (user) => {
      const notificationId = await sendGamifiedNotification({
        type: 'actions_recharged',
        recipientId: user.id,
        metadata: { actionUrl: '/' },
      });
      return !!notificationId;
    },
    3,
    'actions_recharged'
  );

  logger.info(result, 'Processed actions recharged notifications');
  return result.successCount;
}

/**
 * Process wallet connect reminders
 * Nudges users with points but no wallet before distribution
 */
export async function processWalletConnectReminders(): Promise<number> {
  const usersWithoutWallet = shuffle(await db.getUsersWithoutWalletAndPoints());

  const result = await processWithJitter(
    usersWithoutWallet,
    async (user) => {
      const notificationId = await sendGamifiedNotification({
        type: 'wallet_connect',
        recipientId: user.id,
        metadata: { pendingPoints: user.points, actionUrl: '/rewards' },
      });
      return !!notificationId;
    },
    3,
    'wallet_connect'
  );

  logger.info(result, 'Processed wallet connect reminders');
  return result.successCount;
}

/**
 * Process distribution complete notifications
 * Notifies users of their YAP earnings after distribution
 * NOTE: Called from distribute cron
 */
export async function processDistributionComplete(): Promise<number> {
  const usersWithRewards = shuffle(await db.getUsersFromLatestDistribution());

  const result = await processWithJitter(
    usersWithRewards,
    async (user) => {
      const notificationId = await sendGamifiedNotification({
        type: 'distribution_complete',
        recipientId: user.userId,
        metadata: {
          yapEarned: user.yapEarned,
          pointsConverted: user.pointsConverted,
          actionUrl: '/rewards',
        },
      });
      return !!notificationId;
    },
    3,
    'distribution_complete'
  );

  logger.info(result, 'Processed distribution complete notifications');
  return result.successCount;
}

/**
 * Process distribution missed notifications
 * Notifies users who had points but no wallet - FOMO trigger
 * NOTE: Called from distribute cron after distribution
 */
export async function processDistributionMissed(): Promise<number> {
  const usersWithoutWallet = shuffle(await db.getUsersWithoutWalletAndPoints());

  const result = await processWithJitter(
    usersWithoutWallet,
    async (user) => {
      const notificationId = await sendGamifiedNotification({
        type: 'distribution_missed',
        recipientId: user.id,
        metadata: {
          pendingPoints: user.points,
          actionUrl: '/rewards',
        },
      });
      return !!notificationId;
    },
    3,
    'distribution_missed'
  );

  logger.info(result, 'Processed distribution missed notifications');
  return result.successCount;
}

/**
 * Process distribution nudge notifications
 * Notifies active users with no points - encourage them to post
 * NOTE: Called from distribute cron after distribution
 */
export async function processDistributionNudge(): Promise<number> {
  const usersWithNoPoints = shuffle(await db.getActiveUsersWithNoPoints());

  const result = await processWithJitter(
    usersWithNoPoints,
    async (user) => {
      const notificationId = await sendGamifiedNotification({
        type: 'distribution_nudge',
        recipientId: user.id,
        metadata: { actionUrl: '/' },
      });
      return !!notificationId;
    },
    3,
    'distribution_nudge'
  );

  logger.info(result, 'Processed distribution nudge notifications');
  return result.successCount;
}

/**
 * Process weekly summary notifications
 * Sends weekly recap on Sundays
 */
export async function processWeeklySummary(): Promise<number> {
  // Only run on Sundays
  const now = new Date();
  if (now.getUTCDay() !== 0) {
    logger.info('Skipping weekly summary - not Sunday');
    return 0;
  }

  const userStats = shuffle(await db.getUserWeeklyStats());

  const result = await processWithJitter(
    userStats,
    async (user) => {
      const notificationId = await sendGamifiedNotification({
        type: 'weekly_summary',
        recipientId: user.userId,
        metadata: {
          postCount: user.postCount,
          weeklyUpvotes: user.upvoteCount,
          streakCount: user.currentStreak,
          actionUrl: '/profile',
        },
      });
      return !!notificationId;
    },
    3,
    'weekly_summary'
  );

  logger.info(result, 'Processed weekly summary notifications');
  return result.successCount;
}

// NOTE: Post momentum is now real-time (see realTimeNotifications.ts)

/**
 * Process expiring popular post notifications
 * Notifies users when their popular posts are about to expire
 */
export async function processExpiringPopular(): Promise<number> {
  const expiringPosts = shuffle(await db.getPopularPostsExpiringSoon(24, 10)); // 10+ upvotes, expiring in 24h

  const result = await processWithJitter(
    expiringPosts,
    async (post) => {
      const notificationId = await sendGamifiedNotification({
        type: 'expiring_popular',
        recipientId: post.userId,
        metadata: {
          postId: post.postId,
          upvoteCount: post.upvoteCount,
          hoursUntilExpiry: post.hoursLeft,
          actionUrl: '/',
        },
      });
      return !!notificationId;
    },
    3,
    'expiring_popular'
  );

  logger.info(result, 'Processed expiring popular notifications');
  return result.successCount;
}

// NOTE: Follower milestones are now real-time (see realTimeNotifications.ts)

// ============ GROUPED PROCESSORS FOR SPLIT CRONS ============

/** Result type for grouped processors - includes error tracking */
export interface GroupedProcessorResult {
  [key: string]: number;
  /** Errors encountered during processing (empty if successful) */
}

/**
 * Morning notifications (08:00 UTC)
 * - Engagement nudges for inactive users
 * - Claim reminders for unclaimed rewards
 *
 * Each notification type is processed independently - one failure doesn't block others.
 */
export async function processMorningNotifications(): Promise<{
  engagementNudges: number;
  claimReminders: number;
  errors: string[];
}> {
  const stats = { engagementNudges: 0, claimReminders: 0, errors: [] as string[] };

  // Process each type independently - one failure doesn't block others
  try {
    stats.engagementNudges = await processEngagementNudges();
  } catch (error) {
    stats.errors.push('engagementNudges');
    logger.error({ error }, 'Error processing engagement nudges');
  }

  try {
    stats.claimReminders = await processClaimReminders();
  } catch (error) {
    stats.errors.push('claimReminders');
    logger.error({ error }, 'Error processing claim reminders');
  }

  if (stats.errors.length > 0) {
    logger.warn(stats, 'Morning notifications completed with errors');
  } else {
    logger.info(stats, 'Morning notifications processed');
  }

  return stats;
}

/**
 * Afternoon notifications (15:00 UTC)
 * - Expiring popular posts
 */
export async function processAfternoonNotifications(): Promise<{
  expiringPopular: number;
  errors: string[];
}> {
  const stats = { expiringPopular: 0, errors: [] as string[] };

  try {
    stats.expiringPopular = await processExpiringPopular();
  } catch (error) {
    stats.errors.push('expiringPopular');
    logger.error({ error }, 'Error processing expiring popular');
  }

  if (stats.errors.length > 0) {
    logger.warn(stats, 'Afternoon notifications completed with errors');
  } else {
    logger.info(stats, 'Afternoon notifications processed');
  }

  return stats;
}

/**
 * Evening notifications (18:00 UTC)
 * - Streak broken notifications
 */
export async function processEveningNotifications(): Promise<{
  streakBroken: number;
  errors: string[];
}> {
  const stats = { streakBroken: 0, errors: [] as string[] };

  try {
    stats.streakBroken = await processStreakBroken();
  } catch (error) {
    stats.errors.push('streakBroken');
    logger.error({ error }, 'Error processing streak broken');
  }

  if (stats.errors.length > 0) {
    logger.warn(stats, 'Evening notifications completed with errors');
  } else {
    logger.info(stats, 'Evening notifications processed');
  }

  return stats;
}

/**
 * Pre-distribution notifications (21:00 UTC)
 * - Wallet connect reminders
 * - 3-hour streak warnings
 *
 * Each notification type is processed independently - one failure doesn't block others.
 */
export async function processPreDistributionNotifications(): Promise<{
  walletConnectReminders: number;
  streakWarnings3h: number;
  errors: string[];
}> {
  const stats = { walletConnectReminders: 0, streakWarnings3h: 0, errors: [] as string[] };

  try {
    stats.walletConnectReminders = await processWalletConnectReminders();
  } catch (error) {
    stats.errors.push('walletConnectReminders');
    logger.error({ error }, 'Error processing wallet connect reminders');
  }

  try {
    stats.streakWarnings3h = await processStreakWarning3h();
  } catch (error) {
    stats.errors.push('streakWarnings3h');
    logger.error({ error }, 'Error processing 3h streak warnings');
  }

  if (stats.errors.length > 0) {
    logger.warn(stats, 'Pre-distribution notifications completed with errors');
  } else {
    logger.info(stats, 'Pre-distribution notifications processed');
  }

  return stats;
}

/**
 * Urgent notifications (23:00 UTC)
 * - 1-hour streak warnings (last chance!)
 */
export async function processUrgentNotifications(): Promise<{
  streakWarnings1h: number;
  errors: string[];
}> {
  const stats = { streakWarnings1h: 0, errors: [] as string[] };

  try {
    stats.streakWarnings1h = await processStreakWarning1h();
  } catch (error) {
    stats.errors.push('streakWarnings1h');
    logger.error({ error }, 'Error processing 1h streak warnings');
  }

  if (stats.errors.length > 0) {
    logger.warn(stats, 'Urgent notifications completed with errors');
  } else {
    logger.info(stats, 'Urgent notifications processed');
  }

  return stats;
}
