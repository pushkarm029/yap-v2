/**
 * Shared notification types for API responses
 *
 * These types define the contract between the API and frontend.
 * The API route must return data matching these types.
 * The frontend hooks consume these types.
 *
 * Privacy-first: No actor PII (name, username, image) is exposed.
 */

// Re-export from database types for consistency
export type {
  NotificationType,
  SocialNotificationType,
  GamifiedNotificationType,
  GamifiedNotificationMetadata,
} from '@/lib/database/types';

export { SYSTEM_USER_ID, GAMIFIED_NOTIFICATION_TYPES } from '@/lib/database/types';

/**
 * Post preview included in notification
 */
export interface NotificationPost {
  id: string;
  content: string;
}

/**
 * API response notification shape
 *
 * Invariants:
 * - vote_power is only present for upvote notifications
 * - post is present for upvote, comment, and mention (not follow or gamified)
 * - metadata is only present for gamified notifications
 * - isSystem is true for gamified notifications
 */
export interface Notification {
  id: string;
  type: import('@/lib/database/types').NotificationType;
  read: boolean;
  created_at: string;
  vote_power?: number;
  post?: NotificationPost;
  metadata?: import('@/lib/database/types').GamifiedNotificationMetadata;
  isSystem?: boolean;
  title: string;
  body: string;
}

/**
 * API response shape for notifications endpoint
 */
export interface NotificationsResponse {
  notifications: Notification[];
}

/**
 * API response shape for marking notifications as read
 */
export interface MarkNotificationsReadResponse {
  success: boolean;
}
