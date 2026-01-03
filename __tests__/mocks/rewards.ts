/**
 * Rewards-specific mocks for testing
 * Extended mock functions for rewards API routes and claim flow
 */
import { vi } from 'vitest';

/**
 * Mock rewards database operations
 * These extend the base mockDb with rewards-specific operations
 */
export const mockRewardsDb = {
  // Distribution operations
  getLatestDistribution: vi.fn(),
  getDistributionRewards: vi.fn(),
  createDistribution: vi.fn(),
  submitDistribution: vi.fn(),
  markDistributionSubmitted: vi.fn(),

  // User rewards operations
  getUserRewards: vi.fn(),
  getUserRewardsWithClaimStatus: vi.fn(),
  createUserReward: vi.fn(),
  getRewardById: vi.fn(),

  // Claimable rewards
  getUserClaimableReward: vi.fn(),
  getClaimableRewardByWallet: vi.fn(),

  // Claim totals
  getUserDistributedTotal: vi.fn(),
  getUserClaimedTotal: vi.fn(),
  getUserUnclaimedTotal: vi.fn(),

  // Claim events (append-only)
  claimEventExistsForTx: vi.fn(),
  createClaimEvent: vi.fn(),
  getUserClaimEvents: vi.fn(),

  // Distributable users
  getDistributableUsers: vi.fn(),
  getTotalPendingPoints: vi.fn(),

  // Wallet operations
  getUsersWithWallets: vi.fn(),
  getUserByWallet: vi.fn(),
  saveUserWallet: vi.fn(),
  batchSaveWalletSnapshots: vi.fn(),
  calculateVotePower: vi.fn(),

  // Vote weight
  getVoteWeight: vi.fn(),
};

/**
 * Reset all rewards mocks
 */
export function resetRewardsMocks(): void {
  Object.values(mockRewardsDb).forEach((mock) => {
    if (typeof mock.mockReset === 'function') {
      mock.mockReset();
    }
  });
}

/**
 * Setup default mock implementations for happy path testing
 */
export function setupDefaultRewardsMocks(): void {
  // Distribution operations
  mockRewardsDb.getLatestDistribution.mockResolvedValue({
    id: 'dist-123',
    merkle_root: 'a'.repeat(64),
    total_amount: '1000000000000',
    user_count: 100,
    created_at: new Date().toISOString(),
    submitted_at: new Date().toISOString(),
    submit_tx: 'abc'.repeat(29),
  });

  mockRewardsDb.getDistributionRewards.mockResolvedValue([
    {
      id: 'reward-123',
      wallet_address: 'So11111111111111111111111111111111111111112',
      amount: '10000000000',
    },
  ]);

  mockRewardsDb.createDistribution.mockResolvedValue(undefined);
  mockRewardsDb.submitDistribution.mockResolvedValue(undefined);
  mockRewardsDb.markDistributionSubmitted.mockResolvedValue(undefined);

  // User rewards operations
  mockRewardsDb.getUserRewards.mockResolvedValue([
    {
      id: 'reward-123',
      amount: '10000000000',
      amount_earned: '5000000000',
      points_converted: 50,
      created_at: new Date().toISOString(),
    },
  ]);

  mockRewardsDb.createUserReward.mockResolvedValue(undefined);

  mockRewardsDb.getRewardById.mockResolvedValue({
    id: 'reward-123',
    distribution_id: 'dist-123',
    user_id: 'user-123',
    wallet_address: 'So11111111111111111111111111111111111111112',
    amount: '10000000000',
    amount_earned: '5000000000',
    points_converted: 50,
    merkle_proof: JSON.stringify(['aa'.repeat(32), 'bb'.repeat(32)]),
    created_at: new Date().toISOString(),
  });

  // Claimable rewards
  mockRewardsDb.getUserClaimableReward.mockResolvedValue({
    id: 'reward-123',
    amount: '10000000000',
    distribution_id: 'dist-123',
  });

  mockRewardsDb.getClaimableRewardByWallet.mockResolvedValue({
    id: 'reward-123',
    distribution_id: 'dist-123',
    wallet_address: 'So11111111111111111111111111111111111111112',
    amount: '10000000000',
    merkle_proof: JSON.stringify(['aa'.repeat(32), 'bb'.repeat(32)]),
  });

  // Claim totals
  mockRewardsDb.getUserDistributedTotal.mockResolvedValue(100);
  mockRewardsDb.getUserClaimedTotal.mockResolvedValue('5000000000');
  mockRewardsDb.getUserUnclaimedTotal.mockResolvedValue('5000000000');

  // Claim events
  mockRewardsDb.claimEventExistsForTx.mockResolvedValue(false);
  mockRewardsDb.createClaimEvent.mockResolvedValue(undefined);
  mockRewardsDb.getUserClaimEvents.mockResolvedValue([
    {
      id: 'claim-123',
      amount_claimed: '5000000000',
      cumulative_claimed: '10000000000',
      tx_signature: 'abc'.repeat(29),
      claimed_at: new Date().toISOString(),
    },
  ]);

  // Distributable users
  mockRewardsDb.getDistributableUsers.mockResolvedValue([
    {
      id: 'user-123',
      wallet_address: 'So11111111111111111111111111111111111111112',
      points: 150,
      points_distributed: 100,
      allocatable_points: 50,
      cumulative_yap: '5000000000',
    },
  ]);

  mockRewardsDb.getTotalPendingPoints.mockResolvedValue(10000);

  // Wallet operations
  mockRewardsDb.getUsersWithWallets.mockResolvedValue([
    {
      id: 'user-123',
      wallet_address: 'So11111111111111111111111111111111111111112',
    },
  ]);

  mockRewardsDb.getUserByWallet.mockResolvedValue(null); // No existing user with wallet
  mockRewardsDb.saveUserWallet.mockResolvedValue(undefined);
  mockRewardsDb.batchSaveWalletSnapshots.mockResolvedValue(undefined);
  mockRewardsDb.calculateVotePower.mockReturnValue(1.5);

  // Vote weight
  mockRewardsDb.getVoteWeight.mockResolvedValue(1.5);
}

/**
 * Mock Solana client operations for rewards testing
 */
export const mockSolanaClient = {
  getRateLimitedAvailable: vi.fn(),
  buildMerkleTree: vi.fn(),
  getProof: vi.fn(),
  submitMerkleRoot: vi.fn(),
  getMintPda: vi.fn(),
  getRpcEndpoint: vi.fn(),
};

/**
 * Reset all Solana mocks
 */
export function resetSolanaMocks(): void {
  Object.values(mockSolanaClient).forEach((mock) => {
    if (typeof mock.mockReset === 'function') {
      mock.mockReset();
    }
  });
}

/**
 * Setup default Solana mock implementations
 */
export function setupDefaultSolanaMocks(): void {
  mockSolanaClient.getRateLimitedAvailable.mockResolvedValue(BigInt('1000000000000'));

  mockSolanaClient.buildMerkleTree.mockReturnValue({
    root: Buffer.from('a'.repeat(64), 'hex'),
    tree: [],
  });

  mockSolanaClient.getProof.mockReturnValue({
    wallet: 'So11111111111111111111111111111111111111112',
    amount: BigInt('10000000000'),
    proof: [Buffer.from('aa'.repeat(32), 'hex'), Buffer.from('bb'.repeat(32), 'hex')],
  });

  mockSolanaClient.submitMerkleRoot.mockResolvedValue('abc'.repeat(29));

  mockSolanaClient.getMintPda.mockReturnValue([
    { toBytes: () => Buffer.from('mint-pda', 'utf8') },
    255,
  ]);

  mockSolanaClient.getRpcEndpoint.mockReturnValue('https://api.devnet.solana.com');
}

/**
 * Combined setup for all rewards-related mocks
 */
export function setupAllRewardsMocks(): void {
  setupDefaultRewardsMocks();
  setupDefaultSolanaMocks();
}

/**
 * Combined reset for all rewards-related mocks
 */
export function resetAllRewardsMocks(): void {
  resetRewardsMocks();
  resetSolanaMocks();
}
