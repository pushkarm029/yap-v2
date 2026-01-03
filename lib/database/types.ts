// Database TypeScript interfaces
// Single source of truth for all domain types
// Extracted from lib/database.ts for modularity

import type { Row } from '@libsql/client';

// ============ BRANDED TYPES ============
// Prevent mixing incompatible IDs at compile time
// Usage: const userId: UserId = 'abc' as UserId

declare const __brand: unique symbol;
type Brand<T, B> = T & { readonly [__brand]: B };

/** User identifier - UUID string */
export type UserId = Brand<string, 'UserId'>;

/** Post identifier - UUID string */
export type PostId = Brand<string, 'PostId'>;

/** Comment identifier - same as PostId (comments are posts with parent_id) */
export type CommentId = PostId;

/** Notification identifier - UUID string */
export type NotificationId = Brand<string, 'NotificationId'>;

/** Distribution identifier - UUID string */
export type DistributionId = Brand<string, 'DistributionId'>;

/** Reward identifier - UUID string */
export type RewardId = Brand<string, 'RewardId'>;

/** Solana wallet address - base58 string (32-44 chars) */
export type WalletAddress = Brand<string, 'WalletAddress'>;

/** Solana transaction signature - base58 string (87-88 chars) */
export type TxSignature = Brand<string, 'TxSignature'>;

/** Invite code - alphanumeric string */
export type InviteCodeId = Brand<string, 'InviteCodeId'>;

// ============ HELPER FUNCTIONS FOR BRANDED TYPES ============

/** Create a UserId from a string (runtime no-op, compile-time type) */
export const asUserId = (id: string): UserId => id as UserId;

/** Create a PostId from a string */
export const asPostId = (id: string): PostId => id as PostId;

/** Create a WalletAddress from a string */
export const asWalletAddress = (addr: string): WalletAddress => addr as WalletAddress;

/** Create a TxSignature from a string */
export const asTxSignature = (sig: string): TxSignature => sig as TxSignature;

export interface User {
  id: string;
  name: string | null;
  image: string | null;
  username: string | null;
  bio: string | null;
  points: number;
  created_at: string;
  invited_by_user_id: string | null;
  current_streak: number;
  longest_streak: number;
  last_action_date: string | null;
  wallet_address: string | null;
  // Gamified notification rate limiting
  gamified_notification_count: number;
  gamified_notification_date: string | null;
}

export interface WalletSnapshot {
  id: number;
  userId: string;
  walletAddress: string;
  balance: string; // Raw on-chain wallet YAP amount as string for bigint
  unclaimedBalance: string; // Unclaimed rewards at snapshot time
  effectiveBalance: string; // balance + unclaimedBalance (used for vote power)
  votePower: number; // Calculated from effectiveBalance [1.0, 5.0)
  snapshotAt: string;
}

export interface MerkleDistribution {
  id: string;
  merkle_root: string;
  total_amount: string;
  user_count: number;
  created_at: string;
  submitted_at: string | null;
  submit_tx: string | null;
}

export interface UserReward {
  id: string;
  distribution_id: string;
  user_id: string;
  wallet_address: string;
  amount: string; // CUMULATIVE total at this distribution (for merkle proof)
  amount_earned: string | null; // YAP earned in THIS distribution
  points_converted: number; // Points converted in THIS distribution
  merkle_proof: string | null; // Pre-computed merkle proof (JSON array of hex strings)
  created_at: string;
}

/**
 * Claim event - records an actual on-chain claim transaction
 * This is the source of truth for what was claimed and when
 * Append-only table - never mutated
 */
export interface ClaimEvent {
  id: string;
  user_id: string;
  wallet_address: string;
  amount_claimed: string; // Delta transferred in this specific tx
  cumulative_claimed: string; // Total ever claimed after this tx
  reward_id: string | null; // Links to the user_rewards being claimed
  tx_signature: string; // On-chain tx signature (unique)
  claimed_at: string;
  created_at: string;
}

export interface UserProfile extends User {
  _count: {
    posts: number;
  };
  createdAt: Date;
}

// System user ID for gamified notifications (sentinel approach)
export const SYSTEM_USER_ID = '00000000-0000-0000-0000-000000000000';

// Social notification types (actor-triggered)
export type SocialNotificationType = 'mention' | 'upvote' | 'comment' | 'follow';

// Gamified notification types (system-triggered)
export type GamifiedNotificationType =
  | 'streak_warning'
  | 'streak_broken'
  | 'streak_milestone'
  | 'points_milestone'
  | 'claim_reminder'
  | 'engagement_nudge'
  | 'actions_recharged'
  | 'wallet_connect'
  | 'distribution_complete'
  | 'distribution_missed'
  | 'distribution_nudge'
  | 'post_momentum'
  | 'weekly_summary'
  | 'vote_power_unlocked'
  | 'invite_accepted'
  | 'expiring_popular'
  | 'follower_milestone'
  | 'daily_goal';

// All notification types
export type NotificationType = SocialNotificationType | GamifiedNotificationType;

// Gamified notification types as array (for type checking)
export const GAMIFIED_NOTIFICATION_TYPES: GamifiedNotificationType[] = [
  'streak_warning',
  'streak_broken',
  'streak_milestone',
  'points_milestone',
  'claim_reminder',
  'engagement_nudge',
  'actions_recharged',
  'wallet_connect',
  'distribution_complete',
  'distribution_missed',
  'distribution_nudge',
  'post_momentum',
  'weekly_summary',
  'vote_power_unlocked',
  'invite_accepted',
  'expiring_popular',
  'follower_milestone',
  'daily_goal',
];

/**
 * Metadata for gamified notifications
 * Stored as JSON in notifications.metadata column
 */
export interface GamifiedNotificationMetadata {
  // Streak-related
  streakCount?: number; // Current streak count
  hoursLeft?: number; // Hours until streak expires
  previousStreak?: number; // Streak before it broke

  // Milestone-related
  milestone?: number; // Milestone reached (7, 30, 100, etc.)

  // Rewards-related
  unclaimedAmount?: string; // YAP amount as string
  pendingPoints?: number; // Points waiting to become YAP (wallet_connect)
  yapEarned?: string; // YAP earned in distribution
  pointsConverted?: number; // Points converted to YAP

  // Engagement-related
  inactiveDays?: number; // Days since last action
  upvoteCount?: number; // Number of upvotes on post
  postId?: string; // Related post ID

  // Weekly summary
  postCount?: number; // Posts this week
  weeklyUpvotes?: number; // Upvotes received this week
  weeklyYapEarned?: string; // YAP earned this week

  // Vote power
  newVotePower?: number; // New vote power level
  previousVotePower?: number; // Previous vote power

  // Follower milestone
  followerCount?: number; // Current follower count

  // Expiring post
  hoursUntilExpiry?: number; // Hours until post expires

  // Common
  actionUrl?: string; // URL for action button
}

export interface Notification {
  id: string;
  recipient_id: string;
  actor_id: string;
  type: NotificationType;
  post_id: string | null;
  is_read: number;
  created_at: string;
  metadata: string | null; // JSON string
}

export interface NotificationWithDetails {
  id: string;
  type: NotificationType;
  created_at: string;
  is_read: number;
  post_id: string | null;
  post_content: string | null;
  vote_power: number | null;
  metadata: string | null;
  actor_id: string;
  title: string;
  body: string;
}

export interface InviteCode {
  id: string;
  user_id: string;
  code: string;
  created_at: string;
  used_count: number;
}

export interface PushSubscription {
  id: string;
  user_id: string;
  endpoint: string;
  p256dh: string;
  auth: string;
  created_at: string;
}

export interface PushSubscriptionData {
  endpoint: string;
  p256dh: string;
  auth: string;
}

export interface Post {
  id: string;
  parent_id: string | null;
  user_id: string;
  content: string;
  image_url: string | null;
  created_at: string;
  updated_at: string;
}

export interface PostWithUser extends Post {
  name: string | null;
  username: string | null;
  image: string | null;
}

export interface PostWithUserAndUpvotes extends PostWithUser {
  upvote_count: number;
  user_upvoted?: boolean;
  comment_count: number;
}

export interface DailyLimit {
  used: number;
  limit: number;
  remaining: number;
}

export interface CreateUserData {
  id: string;
  name: string;
  image: string;
  username?: string | null;
}

// Distributable user type returned by getDistributableUsers
export interface DistributableUser {
  id: string;
  wallet_address: string;
  points: number;
  points_distributed: number;
  allocatable_points: number;
  cumulative_yap: string; // Raw YAP as string for bigint
}

// ============ BUG REPORTS ============

/** Bug report type - user-submitted issues or feature requests */
export type BugReportType = 'bug' | 'feedback';

/** Bug report status - tracks resolution workflow */
export type BugReportStatus = 'new' | 'reviewed' | 'resolved';

/** Diagnostic info auto-captured from browser */
export interface DiagnosticInfo {
  currentUrl: string;
  referrerUrl: string;
  userAgent: string;
  platform: string;
  screenSize: string;
  viewportSize: string;
  language: string;
  timezone: string;
  timestamp: string;
  onLine: boolean;
  // From error boundaries
  errorMessage?: string;
  errorStack?: string;
}

/** Bug report stored in database */
export interface BugReport {
  id: string;
  user_id: string | null;
  type: BugReportType;
  description: string;
  screenshot_url: string | null;
  diagnostic_info: string | null; // JSON string of DiagnosticInfo
  status: BugReportStatus;
  created_at: string;
}

// ============ TYPE UTILITIES ============

/**
 * Type-safe row mapper for database results
 * Eliminates `as unknown as T` pattern
 */
export function mapRow<T>(row: Row): T {
  return row as T;
}

/**
 * Type-safe array mapper for database results
 */
export function mapRows<T>(rows: Row[]): T[] {
  return rows as T[];
}

/**
 * Get first row or null (type-safe)
 */
export function firstRow<T>(rows: Row[]): T | null {
  return rows.length > 0 ? (rows[0] as T) : null;
}
