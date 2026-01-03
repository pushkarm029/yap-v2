/**
 * Rewards-specific test fixtures
 * Used for testing rewards API routes, claim flow, and distribution logic
 */

import type {
  MerkleDistribution,
  UserReward,
  ClaimEvent,
  DistributableUser,
} from '@/lib/database/types';

// ============ DISTRIBUTION FIXTURES ============

export type MockDistribution = MerkleDistribution;

export function createMockDistribution(
  overrides: Partial<MockDistribution> = {}
): MockDistribution {
  const now = new Date().toISOString();
  return {
    id: 'dist-123',
    merkle_root: 'a'.repeat(64), // 64 hex chars = 32 bytes
    total_amount: '1000000000000', // 1000 YAP (9 decimals)
    user_count: 100,
    created_at: now,
    submitted_at: null,
    submit_tx: null,
    ...overrides,
  };
}

export function createSubmittedDistribution(
  overrides: Partial<MockDistribution> = {}
): MockDistribution {
  const now = new Date().toISOString();
  return createMockDistribution({
    submitted_at: now,
    submit_tx: 'abc'.repeat(29), // ~87 char base58 tx signature
    ...overrides,
  });
}

// ============ USER REWARD FIXTURES ============

export type MockUserReward = UserReward;

export function createMockUserReward(overrides: Partial<MockUserReward> = {}): MockUserReward {
  const now = new Date().toISOString();
  return {
    id: 'reward-123',
    distribution_id: 'dist-123',
    user_id: 'user-123',
    wallet_address: 'So11111111111111111111111111111111111111112',
    amount: '10000000000', // 10 YAP cumulative
    amount_earned: '5000000000', // 5 YAP earned this period
    points_converted: 50,
    merkle_proof: JSON.stringify(['aa'.repeat(32), 'bb'.repeat(32)]),
    created_at: now,
    ...overrides,
  };
}

export function createMockUserRewardWithoutProof(
  overrides: Partial<MockUserReward> = {}
): MockUserReward {
  return createMockUserReward({
    merkle_proof: null,
    ...overrides,
  });
}

// ============ CLAIM EVENT FIXTURES ============

export type MockClaimEvent = ClaimEvent;

export function createMockClaimEvent(overrides: Partial<MockClaimEvent> = {}): MockClaimEvent {
  const now = new Date().toISOString();
  return {
    id: 'claim-123',
    user_id: 'user-123',
    wallet_address: 'So11111111111111111111111111111111111111112',
    amount_claimed: '5000000000', // 5 YAP delta
    cumulative_claimed: '10000000000', // 10 YAP total
    reward_id: 'reward-123',
    tx_signature: 'abc'.repeat(29), // ~87 char base58
    claimed_at: now,
    created_at: now,
    ...overrides,
  };
}

// ============ DISTRIBUTABLE USER FIXTURES ============

export type MockDistributableUser = DistributableUser;

export function createMockDistributableUser(
  overrides: Partial<MockDistributableUser> = {}
): MockDistributableUser {
  return {
    id: 'user-123',
    wallet_address: 'So11111111111111111111111111111111111111112',
    points: 150,
    points_distributed: 100,
    allocatable_points: 50,
    cumulative_yap: '5000000000', // Previous cumulative YAP
    ...overrides,
  };
}

// ============ WALLET & PROOF FIXTURES ============

// Valid Solana wallet addresses for testing
export const TEST_WALLETS = {
  user1: 'So11111111111111111111111111111111111111112',
  user2: '4zMMC9srt5Ri5X14GAgXhaHii3GnPAEERYPJgZJDncDU',
  user3: 'Gh9ZwEmdLJ8DscKNTkTqPbNwLNNBjuSzaG9Vp2KGtKJr',
  invalid: 'not-a-valid-wallet',
  empty: '',
} as const;

// Valid transaction signatures for testing
export const TEST_TX_SIGNATURES = {
  valid1:
    '5VERv8NMvzbJMEkV8xnrLkEaWRtSz9CosKDYjCJjBRnbJLgp8uirBgmQpjKhoR4tjF3ZpRzrFmBV6UjKdiSZkQUW',
  valid2:
    '2nBhEBYYvfaAe16UMNqRHre4YNSskvuYgx3M6E4JP1ooRgKgBGxZHqLAAWQkGcFgFmE8WJJpf9Pv3JujFy8xfQK2',
  invalid: 'not-a-valid-signature',
  short: 'abc',
} as const;

// Pre-calculated merkle proof for testing
export const TEST_MERKLE_PROOF = [
  'aa'.repeat(32), // 64 hex chars = 32 bytes
  'bb'.repeat(32),
  'cc'.repeat(32),
];

// ============ API RESPONSE FIXTURES ============

export interface ClaimProofResponse {
  wallet: string;
  amount: string;
  proof: string[];
  claimable: boolean;
  message?: string;
  rewardId?: string;
}

export function createClaimProofResponse(
  overrides: Partial<ClaimProofResponse> = {}
): ClaimProofResponse {
  return {
    wallet: TEST_WALLETS.user1,
    amount: '10000000000',
    proof: TEST_MERKLE_PROOF,
    claimable: true,
    rewardId: 'reward-123',
    ...overrides,
  };
}

export function createNoClaimResponse(
  overrides: Partial<ClaimProofResponse> = {}
): ClaimProofResponse {
  return {
    wallet: TEST_WALLETS.user1,
    amount: '0',
    proof: [],
    claimable: false,
    message: 'No claimable rewards found',
    ...overrides,
  };
}

// ============ POOL INFO FIXTURES ============

export interface PoolInfoResponse {
  walletConnected: boolean;
  dailyPool: string;
  totalPendingPoints: number;
  userSharePercent: number;
  estimatedReward: string;
  nextDistributionIn: number;
}

export function createMockPoolInfo(overrides: Partial<PoolInfoResponse> = {}): PoolInfoResponse {
  return {
    walletConnected: true,
    dailyPool: '1000000000000', // 1000 YAP
    totalPendingPoints: 10000,
    userSharePercent: 5.0,
    estimatedReward: '50000000000', // 50 YAP
    nextDistributionIn: 3600, // 1 hour until midnight
    ...overrides,
  };
}

// ============ YAP BALANCE FIXTURES ============

export interface YapBalanceResponse {
  walletConnected: boolean;
  claimable: {
    id: string;
    amount: string;
    distributionId: string;
  } | null;
  claimableTotal: string;
  claimedTotal: string;
}

export function createMockYapBalance(
  overrides: Partial<YapBalanceResponse> = {}
): YapBalanceResponse {
  return {
    walletConnected: true,
    claimable: {
      id: 'reward-123',
      amount: '10000000000',
      distributionId: 'dist-123',
    },
    claimableTotal: '10000000000',
    claimedTotal: '5000000000',
    ...overrides,
  };
}

// ============ SCORE FIXTURES ============

export interface ScoreResponse {
  points: number;
  pending: number;
  votePower: number;
}

export function createMockScore(overrides: Partial<ScoreResponse> = {}): ScoreResponse {
  return {
    points: 150,
    pending: 50,
    votePower: 1.5,
    ...overrides,
  };
}

// ============ HISTORY FIXTURES ============

export interface DistributionHistoryItem {
  id: string;
  amountEarned: string;
  cumulativeAmount: string;
  pointsConverted: number;
  distributedAt: string;
}

export interface ClaimHistoryItem {
  id: string;
  amountClaimed: string;
  cumulativeClaimed: string;
  txSignature: string;
  claimedAt: string;
}

export function createMockDistributionHistory(
  overrides: Partial<DistributionHistoryItem> = {}
): DistributionHistoryItem {
  return {
    id: 'reward-123',
    amountEarned: '5000000000',
    cumulativeAmount: '10000000000',
    pointsConverted: 50,
    distributedAt: new Date().toISOString(),
    ...overrides,
  };
}

export function createMockClaimHistory(
  overrides: Partial<ClaimHistoryItem> = {}
): ClaimHistoryItem {
  return {
    id: 'claim-123',
    amountClaimed: '5000000000',
    cumulativeClaimed: '10000000000',
    txSignature: TEST_TX_SIGNATURES.valid1,
    claimedAt: new Date().toISOString(),
    ...overrides,
  };
}

// ============ MERKLE TEST VECTORS ============

/**
 * Pre-calculated merkle test vectors for deterministic testing
 * These can be used to verify merkle tree implementation matches expectations
 */
export const MERKLE_TEST_VECTORS = {
  // Single leaf tree
  singleLeaf: {
    entries: [{ wallet: TEST_WALLETS.user1, amount: BigInt('1000000000') }],
    // Root is hash of single leaf (no sibling)
    expectedProofLength: 0,
  },

  // Two leaf tree (simplest binary tree)
  twoLeaves: {
    entries: [
      { wallet: TEST_WALLETS.user1, amount: BigInt('1000000000') },
      { wallet: TEST_WALLETS.user2, amount: BigInt('2000000000') },
    ],
    expectedProofLength: 1,
  },

  // Four leaf tree (perfect binary tree)
  fourLeaves: {
    entries: [
      { wallet: TEST_WALLETS.user1, amount: BigInt('1000000000') },
      { wallet: TEST_WALLETS.user2, amount: BigInt('2000000000') },
      { wallet: TEST_WALLETS.user3, amount: BigInt('3000000000') },
      { wallet: 'GQQqiKUKhDHrFHwgscQq1bde2SpqfzNnGTWYV9Dr3LBj', amount: BigInt('4000000000') },
    ],
    expectedProofLength: 2,
  },

  // Non-power-of-2 (requires padding)
  threeLeaves: {
    entries: [
      { wallet: TEST_WALLETS.user1, amount: BigInt('1000000000') },
      { wallet: TEST_WALLETS.user2, amount: BigInt('2000000000') },
      { wallet: TEST_WALLETS.user3, amount: BigInt('3000000000') },
    ],
    expectedProofLength: 2, // Padded to 4 leaves
  },

  // Large amounts (BigInt edge case)
  largeAmounts: {
    entries: [
      { wallet: TEST_WALLETS.user1, amount: BigInt('999999999999999999') }, // ~1B YAP
      { wallet: TEST_WALLETS.user2, amount: BigInt('888888888888888888') },
    ],
    expectedProofLength: 1,
  },
};
