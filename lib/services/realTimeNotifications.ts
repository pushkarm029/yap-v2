/**
 * Real-Time Notification Triggers
 *
 * Event-driven notifications that fire immediately when conditions are met,
 * rather than waiting for a cron job to process them.
 *
 * These replace the cron-based processors for:
 * - points_milestone: When user receives an upvote that crosses a threshold
 * - follower_milestone: When user gains a follower that crosses a threshold
 * - streak_milestone: When user posts and their streak hits a milestone
 * - post_momentum: When a post gets high engagement quickly
 * - daily_goal: When user exhausts all daily actions
 */

import { sendGamifiedNotification } from './notifications';
import { apiLogger } from '@/lib/logger';

const logger = apiLogger.child({ service: 'realtime-notifications' });

// Milestone thresholds
export const POINTS_MILESTONES = [100, 500, 1000, 5000, 10000];
export const FOLLOWER_MILESTONES = [10, 50, 100, 500, 1000];
export const STREAK_MILESTONES = [7, 14, 30, 60, 100, 365];
const POST_MOMENTUM_THRESHOLD = 10; // 10+ upvotes
const POST_MOMENTUM_WINDOW_HOURS = 6; // within 6 hours

/**
 * Check if user has crossed a points milestone and send notification
 *
 * Called from upvote route after successful upvote.
 *
 * @param userId - The post author's user ID
 * @param previousTotal - Total upvotes before this upvote
 * @param newTotal - Total upvotes after this upvote
 */
export async function checkPointsMilestone(
  userId: string,
  previousTotal: number,
  newTotal: number
): Promise<void> {
  try {
    // Find if we crossed a milestone
    const crossedMilestone = POINTS_MILESTONES.find(
      (milestone) => previousTotal < milestone && newTotal >= milestone
    );

    if (!crossedMilestone) return;

    logger.info({ userId, milestone: crossedMilestone, newTotal }, 'Points milestone crossed');

    await sendGamifiedNotification({
      type: 'points_milestone',
      recipientId: userId,
      metadata: {
        milestone: crossedMilestone,
        actionUrl: '/profile',
      },
    });
  } catch (error) {
    // Don't throw - real-time notifications shouldn't break the main flow
    logger.error({ error, userId }, 'Failed to check points milestone');
  }
}

/**
 * Check if user has crossed a follower milestone and send notification
 *
 * Called from follow route after successful follow.
 *
 * @param userId - The user who gained a follower
 * @param previousCount - Follower count before this follow
 * @param newCount - Follower count after this follow
 */
export async function checkFollowerMilestone(
  userId: string,
  previousCount: number,
  newCount: number
): Promise<void> {
  try {
    // Find if we crossed a milestone
    const crossedMilestone = FOLLOWER_MILESTONES.find(
      (milestone) => previousCount < milestone && newCount >= milestone
    );

    if (!crossedMilestone) return;

    logger.info({ userId, milestone: crossedMilestone, newCount }, 'Follower milestone crossed');

    await sendGamifiedNotification({
      type: 'follower_milestone',
      recipientId: userId,
      metadata: {
        followerCount: newCount,
        milestone: crossedMilestone,
        actionUrl: '/profile',
      },
    });
  } catch (error) {
    logger.error({ error, userId }, 'Failed to check follower milestone');
  }
}

/**
 * Check if user has hit a streak milestone and send notification
 *
 * Called from post creation after streak is updated.
 *
 * @param userId - The user who posted
 * @param previousStreak - Streak before this post
 * @param newStreak - Streak after this post
 */
export async function checkStreakMilestone(
  userId: string,
  previousStreak: number,
  newStreak: number
): Promise<void> {
  try {
    // Find if we crossed a milestone
    const crossedMilestone = STREAK_MILESTONES.find(
      (milestone) => previousStreak < milestone && newStreak >= milestone
    );

    if (!crossedMilestone) return;

    logger.info({ userId, milestone: crossedMilestone, newStreak }, 'Streak milestone crossed');

    await sendGamifiedNotification({
      type: 'streak_milestone',
      recipientId: userId,
      metadata: {
        milestone: crossedMilestone,
        streakCount: newStreak,
        actionUrl: '/profile',
      },
    });
  } catch (error) {
    logger.error({ error, userId }, 'Failed to check streak milestone');
  }
}

/**
 * Check if a post has momentum (high engagement in short time)
 *
 * Called from upvote route after successful upvote.
 *
 * @param postId - The post that received an upvote
 * @param authorId - The post author's user ID
 * @param upvoteCount - Current upvote count
 * @param postCreatedAt - When the post was created
 */
export async function checkPostMomentum(
  postId: string,
  authorId: string,
  upvoteCount: number,
  postCreatedAt: string
): Promise<void> {
  try {
    // Check if post is within the momentum window
    const createdAt = new Date(postCreatedAt);
    const now = new Date();
    const hoursOld = (now.getTime() - createdAt.getTime()) / (1000 * 60 * 60);

    if (hoursOld > POST_MOMENTUM_WINDOW_HOURS) return;

    // Check if we just hit the momentum threshold
    // Only notify once - when we hit exactly the threshold
    if (upvoteCount !== POST_MOMENTUM_THRESHOLD) return;

    logger.info({ postId, authorId, upvoteCount, hoursOld }, 'Post momentum detected');

    await sendGamifiedNotification({
      type: 'post_momentum',
      recipientId: authorId,
      metadata: {
        postId,
        upvoteCount,
        actionUrl: `/posts/${postId}`,
      },
    });
  } catch (error) {
    logger.error({ error, postId, authorId }, 'Failed to check post momentum');
  }
}

/**
 * Trigger daily goal notification when user exhausts all actions
 *
 * Called from action limit check when user uses their last action.
 *
 * @param userId - The user who completed their daily goal
 */
export async function triggerDailyGoal(userId: string): Promise<void> {
  try {
    logger.info({ userId }, 'Daily goal achieved');

    await sendGamifiedNotification({
      type: 'daily_goal',
      recipientId: userId,
      metadata: {
        actionUrl: '/profile',
      },
    });
  } catch (error) {
    logger.error({ error, userId }, 'Failed to trigger daily goal notification');
  }
}
