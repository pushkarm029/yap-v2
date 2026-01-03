// Frontend types - re-exports from database types + frontend-specific additions
// Single source of truth: lib/database/types.ts

// Re-export all database types
export type {
  UserId,
  PostId,
  CommentId,
  NotificationId,
  DistributionId,
  RewardId,
  WalletAddress,
  TxSignature,
  InviteCodeId,
  User,
  Post,
  PostWithUser,
  PostWithUserAndUpvotes,
  Notification,
  NotificationWithDetails,
  NotificationType,
  SocialNotificationType,
  GamifiedNotificationType,
  GamifiedNotificationMetadata,
  MerkleDistribution,
  UserReward,
  ClaimEvent,
  WalletSnapshot,
  InviteCode,
  PushSubscription,
  PushSubscriptionData,
  DailyLimit,
  CreateUserData,
  DistributableUser,
  UserProfile,
} from '@/lib/database/types';

// Re-export helper functions
export {
  asUserId,
  asPostId,
  asWalletAddress,
  asTxSignature,
  mapRow,
  mapRows,
  firstRow,
  SYSTEM_USER_ID,
  GAMIFIED_NOTIFICATION_TYPES,
} from '@/lib/database/types';

// ============ FRONTEND-SPECIFIC TYPES ============
// Types used only by frontend components (not in database)

/** Comment is a Post with parent_id set - includes upvote/comment counts */
export interface Comment {
  id: string;
  content: string;
  user_id: string;
  parent_id: string;
  created_at: string;
  updated_at: string;
  name: string | null;
  username: string | null;
  image: string | null;
  upvote_count: number;
  user_upvoted?: boolean;
  comment_count: number;
  image_url: string | null;
}

/** Thread response from /api/posts/[postId]/thread */
export interface ThreadResponse {
  comments: Comment[];
}

/** Paginated feed response */
export interface FeedPage {
  posts: import('@/lib/database/types').PostWithUserAndUpvotes[];
  nextCursor: string | null;
}
