// Privacy-first notification utilities

import type { NotificationType, GamifiedNotificationMetadata } from '@/lib/database/types';

// Word lists for anonymous name generation (Yap-themed)
const ADJECTIVES = [
  'Chatty',
  'Yappy',
  'Witty',
  'Bold',
  'Swift',
  'Cosmic',
  'Jolly',
  'Spicy',
  'Zesty',
  'Peppy',
  'Snappy',
  'Zippy',
  'Perky',
  'Chipper',
  'Lively',
  'Frisky',
  'Quirky',
  'Sassy',
  'Breezy',
  'Plucky',
] as const;

const ANIMALS = [
  'Yak',
  'Penguin',
  'Fox',
  'Owl',
  'Dolphin',
  'Falcon',
  'Panda',
  'Koala',
  'Otter',
  'Gecko',
  'Lemur',
  'Badger',
  'Raccoon',
  'Hedgehog',
  'Flamingo',
  'Toucan',
  'Capybara',
  'Axolotl',
  'Quokka',
  'Wombat',
] as const;

/**
 * Simple hash function for deterministic name generation
 */
function hashCode(str: string): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash = hash & hash; // Convert to 32bit integer
  }
  return Math.abs(hash);
}

/**
 * Generate a deterministic anonymous name from a notification ID
 * Same ID always produces the same name (consistent across refreshes)
 *
 * @example generateAnonymousName('abc123') → "Witty Falcon"
 */
export function generateAnonymousName(notificationId: string): string {
  // Validate input to prevent undefined/null from producing predictable names
  if (!notificationId || typeof notificationId !== 'string') {
    console.warn('[notifications] generateAnonymousName called with invalid ID:', notificationId);
    return 'Anonymous Yapper';
  }

  const hash = hashCode(notificationId);
  const adjIndex = hash % ADJECTIVES.length;
  const animalIndex = Math.floor(hash / ADJECTIVES.length) % ANIMALS.length;
  return `${ADJECTIVES[adjIndex]} ${ANIMALS[animalIndex]}`;
}

/**
 * Get the icon emoji for a notification based on type
 */
export function getNotificationIcon(type: NotificationType): string {
  switch (type) {
    // Social notifications
    case 'upvote':
      return '👍';
    case 'comment':
      return '💬';
    case 'follow':
      return '👀';
    case 'mention':
      return '📣';
    // Gamified notifications
    case 'streak_warning':
      return '⏰';
    case 'streak_broken':
      return '💔';
    case 'streak_milestone':
      return '🔥';
    case 'points_milestone':
      return '🏆';
    case 'claim_reminder':
      return '💰';
    case 'engagement_nudge':
      return '👋';
    case 'actions_recharged':
      return '🔋';
    case 'wallet_connect':
      return '🔗';
    case 'distribution_complete':
    case 'distribution_missed':
    case 'distribution_nudge':
      return '💎';
    case 'post_momentum':
      return '🚀';
    case 'weekly_summary':
      return '📊';
    case 'vote_power_unlocked':
      return '⚡';
    case 'invite_accepted':
      return '🎉';
    case 'expiring_popular':
      return '⏳';
    case 'follower_milestone':
      return '👥';
    case 'daily_goal':
      return '🎯';
    default:
      return '🔔';
  }
}

/**
 * Anonymous push notification icon path
 */
export const ANONYMOUS_PUSH_ICON = '/icons/icon-192x192.png';

/**
 * Action button configuration for gamified notifications
 */
export interface NotificationAction {
  label: string;
  url: string;
}

/**
 * Generate the display message for a gamified (system) notification.
 * Uses metadata to create personalized, dynamic messages with natural CTAs baked in.
 */
export function generateGamifiedNotificationMessage(
  type: NotificationType,
  metadata?: GamifiedNotificationMetadata
): string {
  switch (type) {
    case 'streak_warning': {
      const streak = metadata?.streakCount ?? 0;
      const hours = metadata?.hoursLeft ?? 0;
      if (hours <= 1) {
        return `Only 1 hour left to save your ${streak}-day streak! Post now`;
      }
      return `Your ${streak}-day streak expires in ${hours} hours. Post to keep it alive!`;
    }
    case 'streak_broken': {
      const prev = metadata?.previousStreak ?? 0;
      return `Your ${prev}-day streak ended. Tap to start fresh!`;
    }
    case 'streak_milestone': {
      const milestone = metadata?.milestone ?? metadata?.streakCount ?? 0;
      if (milestone === 7) return "1 WEEK STREAK! You're on fire. Keep it going!";
      if (milestone === 30) return "30-DAY STREAK! You're a true Yapper. See your progress";
      if (milestone === 100) return '100-DAY STREAK! Legendary. View your profile';
      if (milestone === 365) return '1 YEAR STREAK! Absolute legend. Check your stats';
      return `Amazing! ${milestone}-day streak achieved. View your profile`;
    }
    case 'points_milestone': {
      const points = metadata?.milestone ?? 0;
      if (points === 100) return 'Your posts hit 100 upvotes! See your profile';
      if (points === 1000) return 'Rising star! 1,000 upvotes. Check your stats';
      if (points === 10000) return 'Legendary! 10,000 upvotes. View your profile';
      return `${points.toLocaleString()} total upvotes! View your profile`;
    }
    case 'claim_reminder': {
      const amount = metadata?.unclaimedAmount ?? '0';
      const displayAmount = BigInt(amount) / BigInt(1e9);
      return `${displayAmount.toLocaleString()} YAP waiting for you. Tap to claim`;
    }
    case 'engagement_nudge': {
      const days = metadata?.inactiveDays ?? 2;
      return `It's been ${days} days! Share something new`;
    }
    case 'actions_recharged':
      return 'Your actions recharged. Time to post!';
    case 'wallet_connect': {
      const points = metadata?.pendingPoints ?? 0;
      return `You have ${points.toLocaleString()} points waiting to become YAP. Connect your wallet before tonight's distribution!`;
    }
    case 'distribution_complete': {
      const yap = metadata?.yapEarned ?? '0';
      const points = metadata?.pointsConverted ?? 0;
      const displayYap = BigInt(yap) / BigInt(1e9);
      return `${displayYap.toLocaleString()} YAP from today's distribution! ${points.toLocaleString()} points converted. Claim anytime`;
    }
    case 'distribution_missed':
      return 'Rewards just dropped! Connect your wallet to join the next distribution';
    case 'distribution_nudge':
      return 'Rewards just distributed to active yappers! Post to earn your share next time';
    case 'post_momentum': {
      const upvotes = metadata?.upvoteCount ?? 0;
      return `${upvotes} upvotes and counting! Your post is taking off`;
    }
    case 'weekly_summary': {
      const posts = metadata?.postCount ?? 0;
      const upvotes = metadata?.weeklyUpvotes ?? 0;
      const streak = metadata?.streakCount ?? 0;
      return `This week: ${posts} posts, ${upvotes} upvotes, ${streak}-day streak. Keep it up!`;
    }
    case 'vote_power_unlocked': {
      const power = metadata?.newVotePower ?? 1;
      return `Your vote power is now ${power.toFixed(1)}x. Your upvotes count more!`;
    }
    case 'invite_accepted':
      return 'Someone joined Yap using your invite. Welcome them!';
    case 'expiring_popular': {
      const upvotes = metadata?.upvoteCount ?? 0;
      const hours = metadata?.hoursUntilExpiry ?? 2;
      return `Your ${upvotes}-upvote post expires in ${hours}h. Keep the momentum going!`;
    }
    case 'follower_milestone': {
      const count = metadata?.followerCount ?? 0;
      return `${count.toLocaleString()} people are following your yaps!`;
    }
    case 'daily_goal':
      return 'All actions used today! Maximum engagement achieved';
    default:
      return 'You have a new notification';
  }
}

/**
 * Get the action button for a gamified notification
 * Returns null for notification types without actions
 */
export function getGamifiedNotificationAction(
  type: NotificationType,
  metadata?: GamifiedNotificationMetadata
): NotificationAction | null {
  switch (type) {
    case 'streak_warning':
    case 'streak_broken':
    case 'engagement_nudge':
      return { label: 'Post Now', url: metadata?.actionUrl ?? '/' };
    case 'claim_reminder':
      return { label: 'Claim Rewards', url: metadata?.actionUrl ?? '/rewards' };
    case 'streak_milestone':
    case 'points_milestone':
      // Milestones are celebrations - no urgent action needed
      return { label: 'View Profile', url: '/profile' };
    case 'actions_recharged':
      return { label: 'Start Yapping', url: '/' };
    case 'wallet_connect':
      return { label: 'Connect Wallet', url: '/rewards' };
    case 'distribution_complete':
      return { label: 'Claim Rewards', url: '/rewards' };
    case 'distribution_missed':
      return { label: 'Connect Wallet', url: '/rewards' };
    case 'distribution_nudge':
      return { label: 'Start Posting', url: '/' };
    case 'post_momentum':
      return { label: 'View Post', url: metadata?.postId ? `/posts/${metadata.postId}` : '/' };
    case 'weekly_summary':
      return { label: 'View Profile', url: '/profile' };
    case 'vote_power_unlocked':
      return { label: 'Start Voting', url: '/' };
    case 'invite_accepted':
      return { label: 'View Profile', url: '/profile' };
    case 'expiring_popular':
      return { label: 'Post Again', url: '/' };
    case 'follower_milestone':
      return { label: 'View Followers', url: '/profile' };
    case 'daily_goal':
      return { label: 'See Progress', url: '/profile' };
    default:
      return null;
  }
}
