/**
 * Notification Message Generator Service
 *
 * Single source of truth for ALL notification message generation.
 * Messages are generated ONCE at creation time and stored in the database.
 * Both push notifications and in-app display use the same stored message.
 *
 * Key principle: Generate once, store, display everywhere.
 */

import {
  generateAnonymousName,
  getNotificationIcon,
  generateGamifiedNotificationMessage,
} from '@/lib/utils/notifications';

/** Threshold for "Power Vote!" notifications - requires ~500K YAP balance */
const HIGH_VOTE_POWER_THRESHOLD = 2.0;
import type {
  SocialNotificationType,
  GamifiedNotificationType,
  GamifiedNotificationMetadata,
} from '@/lib/database/types';

/**
 * Complete notification message ready for storage and push
 */
export interface NotificationMessage {
  title: string;
  body: string;
  icon: string;
  url: string;
}

/**
 * Options for social notification message generation
 */
export interface SocialMessageOptions {
  votePower?: number;
  postId?: string;
  mentionSnippet?: string;
}

/**
 * Generate a complete notification message for social notifications.
 *
 * Uses the notification ID to generate a deterministic anonymous name.
 * The same ID always produces the same name (e.g., "Zesty Bird").
 *
 * @param notificationId - The UUID of the notification (for deterministic name)
 * @param type - The social notification type
 * @param options - Additional context (vote power, post ID, etc.)
 * @returns Complete message ready for storage and push
 *
 * @example
 * const msg = generateSocialMessage('abc-123', 'upvote', { postId: 'xyz', votePower: 2.5 });
 * // Returns: { title: 'New Upvote', body: 'Zesty Bird upvoted your yap with 2.5x power!', ... }
 */
export function generateSocialMessage(
  notificationId: string,
  type: SocialNotificationType,
  options: SocialMessageOptions = {}
): NotificationMessage {
  const anonymousName = generateAnonymousName(notificationId);
  const icon = getNotificationIcon(type);

  switch (type) {
    case 'upvote': {
      const isPowerVote = options.votePower && options.votePower >= HIGH_VOTE_POWER_THRESHOLD;

      if (isPowerVote) {
        return {
          title: 'Power Vote!',
          body: `⚡ ${anonymousName} upvoted your yap with ${options.votePower!.toFixed(1)}x power!`,
          icon,
          url: options.postId ? `/posts/${options.postId}` : '/notifications',
        };
      }

      return {
        title: 'New Upvote',
        body: `${anonymousName} upvoted your yap`,
        icon,
        url: options.postId ? `/posts/${options.postId}` : '/notifications',
      };
    }

    case 'comment':
      return {
        title: 'New Comment',
        body: `💭 ${anonymousName} commented on your yap`,
        icon,
        url: options.postId ? `/posts/${options.postId}` : '/notifications',
      };

    case 'follow':
      return {
        title: 'New Follower',
        body: `🎉 ${anonymousName} started following you!`,
        icon,
        url: '/notifications',
      };

    case 'mention':
      return {
        title: 'You were mentioned',
        body: options.mentionSnippet
          ? `✨ ${options.mentionSnippet}`
          : `✨ ${anonymousName} mentioned you`,
        icon,
        url: options.postId ? `/posts/${options.postId}` : '/notifications',
      };

    default: {
      // TypeScript exhaustive check
      const _exhaustive: never = type;
      return {
        title: 'New Notification',
        body: 'You have a new notification',
        icon: '🔔',
        url: '/notifications',
      };
    }
  }
}

/**
 * Generate a complete notification message for gamified (system) notifications.
 *
 * Uses metadata to generate personalized, dynamic messages.
 *
 * @param type - The gamified notification type
 * @param metadata - Dynamic content (streak count, hours left, etc.)
 * @returns Complete message ready for storage and push
 *
 * @example
 * const msg = generateGamifiedMessage('streak_warning', { streakCount: 7, hoursLeft: 3 });
 * // Returns: { title: '⏰ Streak Alert!', body: 'Your 7-day streak expires in 3 hours!', ... }
 */
export function generateGamifiedMessage(
  type: GamifiedNotificationType,
  metadata: GamifiedNotificationMetadata
): NotificationMessage {
  const icon = getNotificationIcon(type);
  const body = generateGamifiedNotificationMessage(type, metadata);

  // Generate appropriate title based on type
  const title = getGamifiedTitle(type, metadata);
  const url = metadata.actionUrl || getDefaultGamifiedUrl(type);

  return { title, body, icon, url };
}

/**
 * Get the title for a gamified notification
 */
function getGamifiedTitle(
  type: GamifiedNotificationType,
  metadata: GamifiedNotificationMetadata
): string {
  switch (type) {
    case 'streak_warning': {
      const hours = metadata.hoursLeft ?? 3;
      return hours <= 1 ? '🔥 URGENT: Streak Expiring!' : '⏰ Streak Alert!';
    }
    case 'streak_broken':
      return '💔 Streak Ended';
    case 'streak_milestone': {
      const milestone = metadata.milestone ?? 0;
      if (milestone === 7) return '🎉 1 WEEK STREAK!';
      if (milestone === 14) return '🎉 2 WEEK STREAK!';
      if (milestone === 30) return '🏆 30-DAY STREAK!';
      if (milestone === 60) return '🏆 60-DAY STREAK!';
      if (milestone === 100) return '👑 100-DAY STREAK!';
      if (milestone === 365) return '🌟 1 YEAR STREAK!';
      return `🔥 ${milestone}-Day Streak!`;
    }
    case 'points_milestone': {
      const points = metadata.milestone ?? 0;
      if (points === 100) return '💯 100 Upvotes!';
      if (points === 500) return '⭐ 500 Upvotes!';
      if (points === 1000) return '🌟 1,000 Upvotes!';
      if (points === 5000) return '🏆 5,000 Upvotes!';
      if (points === 10000) return '👑 10,000 Upvotes!';
      return `🎉 ${points.toLocaleString()} Upvotes!`;
    }
    case 'claim_reminder':
      return '💰 Rewards Waiting!';
    case 'engagement_nudge':
      return '👋 We Miss You!';
    case 'actions_recharged':
      return '🔋 Actions Recharged!';
    case 'wallet_connect':
      return '🔗 Connect Your Wallet';
    case 'distribution_complete':
      return '💎 You Earned YAP!';
    case 'distribution_missed':
      return '💎 Rewards Just Dropped!';
    case 'distribution_nudge':
      return '💎 Distribution Complete!';
    case 'post_momentum':
      return '🚀 Your Post is Taking Off!';
    case 'weekly_summary':
      return '📊 Your Week in Yap';
    case 'vote_power_unlocked': {
      const power = metadata.newVotePower ?? 1;
      if (power >= 3.0) return '⚡ Major Vote Power!';
      if (power >= 2.0) return '⚡ Vote Power Doubled!';
      return '⚡ Vote Power Upgraded!';
    }
    case 'invite_accepted':
      return '🎉 You Grew the Community!';
    case 'expiring_popular':
      return '⏳ Popular Post Expiring';
    case 'follower_milestone': {
      const count = metadata.followerCount ?? 0;
      if (count >= 1000) return '👥 1,000+ Followers!';
      if (count >= 500) return '👥 500 Followers!';
      if (count >= 100) return '👥 100 Followers!';
      if (count >= 50) return '👥 50 Followers!';
      return '👥 New Follower Milestone!';
    }
    case 'daily_goal':
      return '🎯 Daily Goal Complete!';
    default: {
      const _exhaustive: never = type;
      return '🔔 Notification';
    }
  }
}

/**
 * Get the default URL for a gamified notification type
 */
function getDefaultGamifiedUrl(type: GamifiedNotificationType): string {
  switch (type) {
    case 'streak_warning':
    case 'streak_broken':
    case 'engagement_nudge':
      return '/'; // Encourage posting
    case 'claim_reminder':
      return '/rewards';
    case 'streak_milestone':
    case 'points_milestone':
      return '/profile';
    case 'actions_recharged':
      return '/'; // Encourage posting with fresh actions
    case 'wallet_connect':
    case 'distribution_complete':
    case 'distribution_missed':
      return '/rewards';
    case 'distribution_nudge':
      return '/'; // Encourage posting
    case 'post_momentum':
    case 'expiring_popular':
      return '/'; // Post-related, encourage more posting
    case 'weekly_summary':
    case 'vote_power_unlocked':
    case 'invite_accepted':
    case 'follower_milestone':
    case 'daily_goal':
      return '/profile';
    default:
      return '/notifications';
  }
}
