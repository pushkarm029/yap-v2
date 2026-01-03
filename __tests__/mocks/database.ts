// Database operation mocks for API testing
import { vi } from 'vitest';

/**
 * Mock database operations object
 * Mirrors the structure of `db` from @/lib/database
 *
 * Usage:
 * ```
 * vi.mock('@/lib/database', () => mockDatabaseModule);
 * mockDb.findUserById.mockResolvedValue({ id: '123', points: 500 });
 * ```
 */
export const mockDb = {
  // User operations
  findUserById: vi.fn(),
  findUserByTwitterId: vi.fn(),
  getUserByWallet: vi.fn(),
  saveUserWallet: vi.fn(),
  createUser: vi.fn(),
  updateUser: vi.fn(),
  validateUsernames: vi.fn(),

  // Posts operations
  createPost: vi.fn(),
  getPost: vi.fn(),
  getPostWithDetails: vi.fn(),
  deletePost: vi.fn(),
  getAllPostsWithUpvotes: vi.fn(),
  getPaginatedPosts: vi.fn(),
  extractMentions: vi.fn(),

  // Upvotes
  upvotePost: vi.fn(),
  removeUpvote: vi.fn(),
  hasUpvoted: vi.fn(),
  createUpvoteTransaction: vi.fn(),
  removeUpvoteTransaction: vi.fn(),

  // Comments
  createComment: vi.fn(),
  createCommentTransaction: vi.fn(),
  getPostComments: vi.fn(),
  getPostThread: vi.fn(),

  // Follows
  followUser: vi.fn(),
  unfollowUser: vi.fn(),
  isFollowing: vi.fn(),
  getFollowers: vi.fn(),
  getFollowing: vi.fn(),
  getFollowerCount: vi.fn(),
  findUserByUsername: vi.fn(),

  // Notifications
  getNotifications: vi.fn(),
  getNotificationsForUser: vi.fn(),
  getUnreadCount: vi.fn(),
  getUnreadNotificationCount: vi.fn(),
  markNotificationsRead: vi.fn(),
  markNotificationsAsRead: vi.fn(),
  createNotification: vi.fn(),

  // Daily limits
  checkTotalDailyLimit: vi.fn(),
  checkDailyLimit: vi.fn(),
  incrementDailyAction: vi.fn(),

  // Streak
  updateStreak: vi.fn(),

  // Rewards operations
  getUserDistributedTotal: vi.fn(),
  getUserRewards: vi.fn(),
  getUserRewardsWithClaimStatus: vi.fn(),
  getUserClaimedTotal: vi.fn(),
  getUserUnclaimedTotal: vi.fn(),
  getUserClaimableReward: vi.fn(),
  getClaimableRewardByWallet: vi.fn(),
  getRewardById: vi.fn(),

  // Claim events (append-only)
  claimEventExistsForTx: vi.fn(),
  createClaimEvent: vi.fn(),
  getUserClaimEvents: vi.fn(),

  // Distribution operations
  getLatestDistribution: vi.fn(),
  getDistributionRewards: vi.fn(),
  createDistribution: vi.fn(),
  createUserReward: vi.fn(),
  submitDistribution: vi.fn(),
  markDistributionSubmitted: vi.fn(),
  getDistributableUsers: vi.fn(),
  getTotalPendingPoints: vi.fn(),

  // Wallet snapshots
  getUsersWithWallets: vi.fn(),
  calculateVotePower: vi.fn(),
  getWalletVotePower: vi.fn(),
  getLatestWalletSnapshot: vi.fn(),
  batchSaveWalletSnapshots: vi.fn(),
  saveWalletSnapshotsBatch: vi.fn(),

  // Vote weight
  getVoteWeight: vi.fn(),

  // Invites
  getInviteCode: vi.fn(),
  redeemInviteCode: vi.fn(),
  validateInviteCode: vi.fn(),
};

/**
 * Complete mock module for @/lib/database
 * Exports both `db` object and direct function exports
 * Use this for vi.mock('@/lib/database', () => mockDatabaseModule)
 */
export const mockDatabaseModule = {
  db: mockDb,
  // Direct exports for functions used by @/lib/api/auth.ts
  findUserById: mockDb.findUserById,
  // Add other direct exports as needed
};

/**
 * Reset all database mocks
 * Call in beforeEach to ensure clean state
 */
export function resetDbMocks(): void {
  Object.values(mockDb).forEach((mock) => {
    if (typeof mock.mockReset === 'function') {
      mock.mockReset();
    }
  });
}

/**
 * Mock user object matching database User type
 */
export interface MockUser {
  id: string;
  twitter_id: string;
  username: string;
  display_name: string;
  avatar_url: string | null;
  points: number;
  wallet_address: string | null;
  created_at: string;
  updated_at: string;
}

/**
 * Create a mock user with defaults
 */
export function createMockUser(overrides: Partial<MockUser> = {}): MockUser {
  return {
    id: 'test-user-123',
    twitter_id: 'twitter-123',
    username: 'testuser',
    display_name: 'Test User',
    avatar_url: null,
    points: 100,
    wallet_address: null,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    ...overrides,
  };
}

/**
 * Mock reward object
 */
export interface MockReward {
  id: string;
  user_id: string;
  distribution_id: string;
  wallet_address: string;
  amount: string;
  points_converted: number;
  claimed_at: string | null;
  claim_tx: string | null;
  created_at: string;
}

/**
 * Create a mock reward
 */
export function createMockReward(overrides: Partial<MockReward> = {}): MockReward {
  return {
    id: 'reward-123',
    user_id: 'test-user-123',
    distribution_id: 'dist-123',
    wallet_address: 'TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA',
    amount: '1000000000', // 1 YAP as string
    points_converted: 100,
    claimed_at: null,
    claim_tx: null,
    created_at: new Date().toISOString(),
    ...overrides,
  };
}
