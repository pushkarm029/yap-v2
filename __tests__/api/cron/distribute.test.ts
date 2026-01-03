import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { createMockRequest, createCronRequest, parseResponse } from '../../mocks/next';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type ApiResponse = Record<string, any>;

// Use vi.hoisted() for mocks referenced in vi.mock() factories
const mockDb = vi.hoisted(() => ({
  getDistributableUsers: vi.fn(),
  createDistribution: vi.fn(),
  createUserReward: vi.fn(),
  submitDistribution: vi.fn(),
  // Wallet snapshot functions
  getUsersWithWallets: vi.fn(),
  batchSaveWalletSnapshots: vi.fn(),
  calculateVotePower: vi.fn(),
}));

const mockBuildMerkleTree = vi.hoisted(() => vi.fn());
const mockSubmitMerkleRoot = vi.hoisted(() => vi.fn());
const mockGetRateLimitedAvailable = vi.hoisted(() => vi.fn());
const mockGetProof = vi.hoisted(() => vi.fn());
const mockGetRpcEndpoint = vi.hoisted(() => vi.fn());
const mockGetMintPda = vi.hoisted(() => vi.fn());
const mockGetNowISO = vi.hoisted(() => vi.fn());

// Mock dependencies before importing the route
vi.mock('@/lib/database', () => ({ db: mockDb }));
vi.mock('@/lib/logger', () => ({
  apiLogger: {
    child: () => ({
      info: vi.fn(),
      warn: vi.fn(),
      error: vi.fn(),
      debug: vi.fn(),
    }),
  },
  // pushLogger is used by webpush.ts (imported via gamifiedNotifications)
  pushLogger: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
  },
}));
vi.mock('@/lib/solana', () => ({
  buildMerkleTree: mockBuildMerkleTree,
  submitMerkleRoot: mockSubmitMerkleRoot,
  getRateLimitedAvailable: mockGetRateLimitedAvailable,
  getProof: mockGetProof,
  getRpcEndpoint: mockGetRpcEndpoint,
  getMintPda: mockGetMintPda,
}));
vi.mock('@/lib/utils/dates', () => ({
  getNowISO: mockGetNowISO,
}));
// Mock gamified notifications to prevent actual notification sending in tests
vi.mock('@/lib/services/gamifiedNotifications', () => ({
  processActionsRecharged: vi.fn().mockResolvedValue(0),
}));
vi.mock('crypto', () => ({
  randomUUID: vi.fn(() => 'test-uuid-123'),
}));
// Mock Solana dependencies to prevent real network calls in snapshot
vi.mock('@solana/kit', () => ({
  address: vi.fn((addr: string) => addr), // Just return the string as-is for testing
}));
vi.mock('@solana/web3.js', () => ({
  Connection: vi.fn().mockImplementation(() => ({
    getMultipleAccountsInfo: vi.fn().mockResolvedValue([]),
  })),
  PublicKey: vi.fn().mockImplementation((key: string) => ({ toBase58: () => key })),
}));
vi.mock('@solana/spl-token', () => ({
  getAssociatedTokenAddressSync: vi.fn().mockReturnValue('mock-ata'),
}));

// Import the route handler after mocks are set up
import { GET } from '@/app/api/cron/distribute/route';

const VALID_WALLET = 'TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA';
const CRON_SECRET = 'test-cron-secret';

describe('GET /api/cron/distribute', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.CRON_SECRET = CRON_SECRET;
    mockGetNowISO.mockReturnValue('2024-01-15T00:00:00Z');
    // Default wallet snapshot mocks (run before distribution)
    mockDb.getUsersWithWallets.mockResolvedValue([]);
    mockDb.batchSaveWalletSnapshots.mockResolvedValue(undefined);
    mockDb.calculateVotePower.mockReturnValue(1.0);
    // Mock RPC endpoint for snapshot (won't actually be called due to empty users)
    mockGetRpcEndpoint.mockReturnValue('https://api.devnet.solana.com');
    mockGetMintPda.mockReturnValue([{ toBase58: () => 'mock-mint' }, 0]);
    // Default getProof mock returns a valid proof structure
    mockGetProof.mockReturnValue({ wallet: 'test', amount: BigInt(0), proof: [] });
  });

  afterEach(() => {
    delete process.env.CRON_SECRET;
  });

  it('returns 500 when CRON_SECRET not set', async () => {
    delete process.env.CRON_SECRET;

    const request = createCronRequest('any-secret', 'http://localhost:3000/api/cron/distribute');
    const response = await GET(request);
    const { status, data } = await parseResponse<ApiResponse>(response);

    expect(status).toBe(500);
    expect(data.error).toBe('Server configuration error');
  });

  it('returns 401 without authorization header', async () => {
    const request = createMockRequest({
      url: 'http://localhost:3000/api/cron/distribute',
    });

    const response = await GET(request);
    const { status, data } = await parseResponse<ApiResponse>(response);

    expect(status).toBe(401);
    expect(data.error).toBe('Unauthorized');
  });

  it('returns 401 with wrong secret', async () => {
    const request = createCronRequest('wrong-secret', 'http://localhost:3000/api/cron/distribute');

    const response = await GET(request);
    const { status, data } = await parseResponse<ApiResponse>(response);

    expect(status).toBe(401);
    expect(data.error).toBe('Unauthorized');
  });

  it('returns success when no distributable users', async () => {
    mockDb.getDistributableUsers.mockResolvedValue([]);

    const request = createCronRequest(CRON_SECRET, 'http://localhost:3000/api/cron/distribute');

    const response = await GET(request);
    const { status, data } = await parseResponse<ApiResponse>(response);

    expect(status).toBe(200);
    expect(data.success).toBe(true);
    expect(data.message).toBe('No distribution needed');
    expect(data.usersProcessed).toBe(0);
    expect(data.totalAmount).toBe('0');
  });

  it('calculates proportional distribution correctly', async () => {
    // Setup: 2 users with different points
    const users = [
      {
        id: 'user-1',
        wallet_address: VALID_WALLET,
        allocatable_points: 100,
        cumulative_yap: '0',
      },
      {
        id: 'user-2',
        wallet_address: '7nYBK55BHK27dKSyxRfHDMXbzgJbXz5Xvgj2bBr2gMPV',
        allocatable_points: 300,
        cumulative_yap: '0',
      },
    ];
    mockDb.getDistributableUsers.mockResolvedValue(users);
    // Mock wallet snapshot for these users
    mockDb.getUsersWithWallets.mockResolvedValue(
      users.map((u) => ({ id: u.id, wallet_address: u.wallet_address }))
    );

    // 10 YAP daily pool
    mockGetRateLimitedAvailable.mockResolvedValue(BigInt(10_000_000_000));

    // Mock merkle tree building
    const mockRoot = new Uint8Array(32).fill(1);
    mockBuildMerkleTree.mockReturnValue({
      root: mockRoot,
      proofs: new Map(),
    });

    mockSubmitMerkleRoot.mockResolvedValue('tx-abc123');
    mockDb.createDistribution.mockResolvedValue(undefined);
    mockDb.createUserReward.mockResolvedValue(undefined);
    mockDb.submitDistribution.mockResolvedValue(undefined);

    const request = createCronRequest(CRON_SECRET, 'http://localhost:3000/api/cron/distribute');

    const response = await GET(request);
    const { status, data } = await parseResponse<ApiResponse>(response);

    expect(status).toBe(200);
    expect(data.success).toBe(true);
    expect(data.usersProcessed).toBe(2);
    // Total: 100 + 300 = 400 points
    // User1: 100/400 * 10B = 2.5B
    // User2: 300/400 * 10B = 7.5B
    // Total new: 10B
    expect(data.totalNewAmount).toBe('10000000000');
    expect(data.totalAllocatablePoints).toBe(400);
    expect(data.submitTx).toBe('tx-abc123');

    // Verify distribution was created
    expect(mockDb.createDistribution).toHaveBeenCalledWith(
      'test-uuid-123',
      expect.any(String), // merkle root hex
      BigInt('10000000000'),
      2
    );

    // Verify rewards were created for both users
    expect(mockDb.createUserReward).toHaveBeenCalledTimes(2);
  });

  it('handles chain submission failure gracefully', async () => {
    const users = [
      {
        id: 'user-1',
        wallet_address: VALID_WALLET,
        allocatable_points: 100,
        cumulative_yap: '0',
      },
    ];
    mockDb.getDistributableUsers.mockResolvedValue(users);
    mockDb.getUsersWithWallets.mockResolvedValue(
      users.map((u) => ({ id: u.id, wallet_address: u.wallet_address }))
    );

    mockGetRateLimitedAvailable.mockResolvedValue(BigInt(1_000_000_000));
    mockBuildMerkleTree.mockReturnValue({
      root: new Uint8Array(32).fill(1),
      proofs: new Map(),
    });
    mockSubmitMerkleRoot.mockRejectedValue(new Error('Network error'));
    mockDb.createDistribution.mockResolvedValue(undefined);
    mockDb.createUserReward.mockResolvedValue(undefined);

    const request = createCronRequest(CRON_SECRET, 'http://localhost:3000/api/cron/distribute');

    const response = await GET(request);
    const { status, data } = await parseResponse<ApiResponse>(response);

    // Should still succeed - chain submission is non-blocking
    expect(status).toBe(200);
    expect(data.success).toBe(true);
    expect(data.submitTx).toBeUndefined();
  });

  // ============================================================
  // P0 Critical: Precision & Edge Cases
  // ============================================================

  describe('precision edge cases', () => {
    it('handles indivisible fractional distribution (1/3 scenario)', async () => {
      // 3 users with equal points, pool not divisible by 3
      // Risk: Rounding errors could over-distribute or lose funds
      const users = [
        { id: 'u1', wallet_address: VALID_WALLET, allocatable_points: 1, cumulative_yap: '0' },
        {
          id: 'u2',
          wallet_address: '7nYBK55BHK27dKSyxRfHDMXbzgJbXz5Xvgj2bBr2gMPV',
          allocatable_points: 1,
          cumulative_yap: '0',
        },
        {
          id: 'u3',
          wallet_address: 'ATokenGPvbdGVxr1b2hvZbsiqW5xWH25efTNsLJA8knL',
          allocatable_points: 1,
          cumulative_yap: '0',
        },
      ];
      mockDb.getDistributableUsers.mockResolvedValue(users);
      mockDb.getUsersWithWallets.mockResolvedValue(
        users.map((u) => ({ id: u.id, wallet_address: u.wallet_address }))
      );

      // Pool of 1_000_000_001 (not divisible by 3)
      // Each user should get floor(1_000_000_001 / 3) = 333_333_333
      // Total distributed: 999_999_999 (2 lamports remainder - acceptable)
      mockGetRateLimitedAvailable.mockResolvedValue(BigInt(1_000_000_001));
      mockBuildMerkleTree.mockReturnValue({
        root: new Uint8Array(32).fill(1),
        proofs: new Map(),
      });
      mockSubmitMerkleRoot.mockResolvedValue('tx-precision');
      mockDb.createDistribution.mockResolvedValue(undefined);
      mockDb.createUserReward.mockResolvedValue(undefined);
      mockDb.submitDistribution.mockResolvedValue(undefined);

      const request = createCronRequest(CRON_SECRET, 'http://localhost:3000/api/cron/distribute');
      const response = await GET(request);
      const { status, data } = await parseResponse<ApiResponse>(response);

      expect(status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.usersProcessed).toBe(3);

      // Critical: Total distributed must NOT exceed pool
      const totalDistributed = BigInt(data.totalNewAmount);
      expect(totalDistributed).toBeLessThanOrEqual(BigInt(1_000_000_001));
    });

    it('distributes with prime number total points', async () => {
      // 7 users with 1 point each = 7 total points (prime)
      // Pool: 1_000_000_000
      // Each gets floor(1B / 7) = 142_857_142
      // Total: 999_999_994 (6 lamports remainder)
      const wallets = [
        VALID_WALLET,
        '7nYBK55BHK27dKSyxRfHDMXbzgJbXz5Xvgj2bBr2gMPV',
        'ATokenGPvbdGVxr1b2hvZbsiqW5xWH25efTNsLJA8knL',
        'SysvarRent111111111111111111111111111111111',
        'SysvarC1ock11111111111111111111111111111111',
        'Vote111111111111111111111111111111111111111',
        'Stake11111111111111111111111111111111111111',
      ];

      const users = wallets.map((wallet, i) => ({
        id: `user-${i}`,
        wallet_address: wallet,
        allocatable_points: 1,
        cumulative_yap: '0',
      }));
      mockDb.getDistributableUsers.mockResolvedValue(users);
      mockDb.getUsersWithWallets.mockResolvedValue(
        users.map((u) => ({ id: u.id, wallet_address: u.wallet_address }))
      );

      mockGetRateLimitedAvailable.mockResolvedValue(BigInt(1_000_000_000));
      mockBuildMerkleTree.mockReturnValue({
        root: new Uint8Array(32).fill(2),
        proofs: new Map(),
      });
      mockSubmitMerkleRoot.mockResolvedValue('tx-prime');
      mockDb.createDistribution.mockResolvedValue(undefined);
      mockDb.createUserReward.mockResolvedValue(undefined);
      mockDb.submitDistribution.mockResolvedValue(undefined);

      const request = createCronRequest(CRON_SECRET, 'http://localhost:3000/api/cron/distribute');
      const response = await GET(request);
      const { status, data } = await parseResponse<ApiResponse>(response);

      expect(status).toBe(200);
      expect(data.usersProcessed).toBe(7);

      // Verify total distributed ≤ pool
      const totalDistributed = BigInt(data.totalNewAmount);
      expect(totalDistributed).toBeLessThanOrEqual(BigInt(1_000_000_000));
      // 7 rewards created
      expect(mockDb.createUserReward).toHaveBeenCalledTimes(7);
    });

    it('handles zero total allocatable points gracefully', async () => {
      mockDb.getDistributableUsers.mockResolvedValue([
        { id: 'u1', wallet_address: VALID_WALLET, allocatable_points: 0, cumulative_yap: '0' },
        {
          id: 'u2',
          wallet_address: '7nYBK55BHK27dKSyxRfHDMXbzgJbXz5Xvgj2bBr2gMPV',
          allocatable_points: 0,
          cumulative_yap: '0',
        },
      ]);

      const request = createCronRequest(CRON_SECRET, 'http://localhost:3000/api/cron/distribute');
      const response = await GET(request);
      const { status, data } = await parseResponse<ApiResponse>(response);

      // Should handle gracefully - no division by zero
      expect(status).toBe(200);
      expect(data.success).toBe(true);
      // Implementation returns "No points to distribute" for zero-point users
      expect(data.message).toBe('No points to distribute');
    });

    it('skips users with NULL wallet gracefully (defense in depth)', async () => {
      // Test that NULL wallets are filtered out at runtime (defense in depth)
      // Primary protection is at DB level (WHERE wallet_address IS NOT NULL AND != '')
      // Runtime check prevents crashes if invalid data somehow reaches this point
      const users = [
        { id: 'u1', wallet_address: VALID_WALLET, allocatable_points: 100, cumulative_yap: '0' },
        { id: 'u2', wallet_address: null, allocatable_points: 100, cumulative_yap: '0' }, // NULL - skipped
      ];
      mockDb.getDistributableUsers.mockResolvedValue(users);
      mockDb.getUsersWithWallets.mockResolvedValue([{ id: 'u1', wallet_address: VALID_WALLET }]);

      mockGetRateLimitedAvailable.mockResolvedValue(BigInt(2_000_000_000));
      mockBuildMerkleTree.mockReturnValue({
        root: new Uint8Array(32).fill(3),
        proofs: new Map(),
      });
      mockSubmitMerkleRoot.mockResolvedValue('tx-skip-null');
      mockDb.createDistribution.mockResolvedValue(undefined);
      mockDb.createUserReward.mockResolvedValue(undefined);
      mockDb.submitDistribution.mockResolvedValue(undefined);

      const request = createCronRequest(CRON_SECRET, 'http://localhost:3000/api/cron/distribute');
      const response = await GET(request);
      const { status, data } = await parseResponse<ApiResponse>(response);

      // Should succeed by skipping the invalid user
      expect(status).toBe(200);
      expect(data.success).toBe(true);
      // Only 1 user processed (u2 with NULL wallet was skipped)
      expect(mockDb.createUserReward).toHaveBeenCalledTimes(1);
    });

    it('succeeds when all users have valid wallets', async () => {
      // Control test: verify distribution works with valid wallets only
      const users = [
        { id: 'u1', wallet_address: VALID_WALLET, allocatable_points: 100, cumulative_yap: '0' },
        {
          id: 'u2',
          wallet_address: '7nYBK55BHK27dKSyxRfHDMXbzgJbXz5Xvgj2bBr2gMPV',
          allocatable_points: 100,
          cumulative_yap: '0',
        },
      ];
      mockDb.getDistributableUsers.mockResolvedValue(users);
      mockDb.getUsersWithWallets.mockResolvedValue(
        users.map((u) => ({ id: u.id, wallet_address: u.wallet_address }))
      );

      mockGetRateLimitedAvailable.mockResolvedValue(BigInt(2_000_000_000));
      mockBuildMerkleTree.mockReturnValue({
        root: new Uint8Array(32).fill(4),
        proofs: new Map(),
      });
      mockSubmitMerkleRoot.mockResolvedValue('tx-valid-wallets');
      mockDb.createDistribution.mockResolvedValue(undefined);
      mockDb.createUserReward.mockResolvedValue(undefined);
      mockDb.submitDistribution.mockResolvedValue(undefined);

      const request = createCronRequest(CRON_SECRET, 'http://localhost:3000/api/cron/distribute');
      const response = await GET(request);
      const { status, data } = await parseResponse<ApiResponse>(response);

      expect(status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.usersProcessed).toBe(2);
    });
  });

  // ============================================================
  // Error Handling Tests
  // ============================================================
  describe('error handling', () => {
    it('returns 500 when getRateLimitedAvailable fails', async () => {
      mockDb.getDistributableUsers.mockResolvedValue([
        { id: 'u1', wallet_address: VALID_WALLET, allocatable_points: 100, cumulative_yap: '0' },
      ]);

      mockGetRateLimitedAvailable.mockRejectedValue(new Error('RPC connection failed'));

      const request = createCronRequest(CRON_SECRET, 'http://localhost:3000/api/cron/distribute');
      const response = await GET(request);
      const { status, data } = await parseResponse<ApiResponse>(response);

      expect(status).toBe(500);
      expect(data.error).toBe('Failed to query chain for daily available');
    });

    it('returns 500 on database error fetching distributable users', async () => {
      mockDb.getDistributableUsers.mockRejectedValue(new Error('Database timeout'));

      const request = createCronRequest(CRON_SECRET, 'http://localhost:3000/api/cron/distribute');
      const response = await GET(request);
      const { status, data } = await parseResponse<ApiResponse>(response);

      expect(status).toBe(500);
      expect(data.error).toBe('Distribution failed');
    });

    it('returns 500 on database error creating distribution', async () => {
      mockDb.getDistributableUsers.mockResolvedValue([
        { id: 'u1', wallet_address: VALID_WALLET, allocatable_points: 100, cumulative_yap: '0' },
      ]);
      mockGetRateLimitedAvailable.mockResolvedValue(BigInt(1_000_000_000));
      mockBuildMerkleTree.mockReturnValue({
        root: new Uint8Array(32).fill(5),
        proofs: new Map(),
      });
      mockDb.createDistribution.mockRejectedValue(new Error('Failed to insert distribution'));

      const request = createCronRequest(CRON_SECRET, 'http://localhost:3000/api/cron/distribute');
      const response = await GET(request);
      const { status, data } = await parseResponse<ApiResponse>(response);

      expect(status).toBe(500);
      expect(data.error).toBe('Distribution failed');
    });
  });

  // ============================================================
  // Cumulative YAP Handling
  // ============================================================
  describe('cumulative YAP handling', () => {
    it('adds new YAP to existing cumulative amount', async () => {
      // User already has 5 YAP cumulative, earns 2.5 more
      const users = [
        {
          id: 'returning-user',
          wallet_address: VALID_WALLET,
          allocatable_points: 100,
          cumulative_yap: '5000000000', // 5 YAP existing
        },
      ];
      mockDb.getDistributableUsers.mockResolvedValue(users);
      mockDb.getUsersWithWallets.mockResolvedValue(
        users.map((u) => ({ id: u.id, wallet_address: u.wallet_address }))
      );

      mockGetRateLimitedAvailable.mockResolvedValue(BigInt(2_500_000_000)); // 2.5 YAP pool
      mockBuildMerkleTree.mockReturnValue({
        root: new Uint8Array(32).fill(6),
        proofs: new Map(),
      });
      mockSubmitMerkleRoot.mockResolvedValue('tx-cumulative');
      mockDb.createDistribution.mockResolvedValue(undefined);
      mockDb.createUserReward.mockResolvedValue(undefined);
      mockDb.submitDistribution.mockResolvedValue(undefined);

      const request = createCronRequest(CRON_SECRET, 'http://localhost:3000/api/cron/distribute');
      const response = await GET(request);
      const { status, data } = await parseResponse<ApiResponse>(response);

      expect(status).toBe(200);
      expect(data.success).toBe(true);

      // Verify createUserReward was called with cumulative amount (5 + 2.5 = 7.5 YAP)
      expect(mockDb.createUserReward).toHaveBeenCalledWith(
        expect.any(String), // rewardId
        expect.any(String), // distributionId
        'returning-user',
        VALID_WALLET,
        BigInt('7500000000'), // Cumulative: 5B + 2.5B = 7.5B
        100, // points converted
        BigInt('2500000000'), // amount_earned (new YAP)
        expect.any(Array) // merkle proof
      );
    });

    it('handles first-time users with zero cumulative', async () => {
      const users = [
        {
          id: 'new-user',
          wallet_address: VALID_WALLET,
          allocatable_points: 50,
          cumulative_yap: '0',
        },
      ];
      mockDb.getDistributableUsers.mockResolvedValue(users);
      mockDb.getUsersWithWallets.mockResolvedValue(
        users.map((u) => ({ id: u.id, wallet_address: u.wallet_address }))
      );

      mockGetRateLimitedAvailable.mockResolvedValue(BigInt(1_000_000_000));
      mockBuildMerkleTree.mockReturnValue({
        root: new Uint8Array(32).fill(7),
        proofs: new Map(),
      });
      mockSubmitMerkleRoot.mockResolvedValue('tx-first-time');
      mockDb.createDistribution.mockResolvedValue(undefined);
      mockDb.createUserReward.mockResolvedValue(undefined);
      mockDb.submitDistribution.mockResolvedValue(undefined);

      const request = createCronRequest(CRON_SECRET, 'http://localhost:3000/api/cron/distribute');
      const response = await GET(request);
      const { status, data } = await parseResponse<ApiResponse>(response);

      expect(status).toBe(200);
      expect(data.success).toBe(true);

      // For new user, cumulative equals new amount
      expect(mockDb.createUserReward).toHaveBeenCalledWith(
        expect.any(String),
        expect.any(String),
        'new-user',
        VALID_WALLET,
        BigInt('1000000000'), // Cumulative = new amount for first-timer
        50,
        BigInt('1000000000'), // amount_earned same as cumulative
        expect.any(Array)
      );
    });
  });

  // ============================================================
  // Large Amount & Single User Tests
  // ============================================================
  describe('large amounts and edge cases', () => {
    it('handles very large pool amounts (trillion YAP)', async () => {
      const users = [
        { id: 'u1', wallet_address: VALID_WALLET, allocatable_points: 500, cumulative_yap: '0' },
        {
          id: 'u2',
          wallet_address: '7nYBK55BHK27dKSyxRfHDMXbzgJbXz5Xvgj2bBr2gMPV',
          allocatable_points: 500,
          cumulative_yap: '0',
        },
      ];
      mockDb.getDistributableUsers.mockResolvedValue(users);
      mockDb.getUsersWithWallets.mockResolvedValue(
        users.map((u) => ({ id: u.id, wallet_address: u.wallet_address }))
      );

      // 1 trillion YAP pool (10^21 raw units with 9 decimals)
      const hugePool = BigInt('1000000000000000000000');
      mockGetRateLimitedAvailable.mockResolvedValue(hugePool);
      mockBuildMerkleTree.mockReturnValue({
        root: new Uint8Array(32).fill(8),
        proofs: new Map(),
      });
      mockSubmitMerkleRoot.mockResolvedValue('tx-huge-pool');
      mockDb.createDistribution.mockResolvedValue(undefined);
      mockDb.createUserReward.mockResolvedValue(undefined);
      mockDb.submitDistribution.mockResolvedValue(undefined);

      const request = createCronRequest(CRON_SECRET, 'http://localhost:3000/api/cron/distribute');
      const response = await GET(request);
      const { status, data } = await parseResponse<ApiResponse>(response);

      expect(status).toBe(200);
      expect(data.success).toBe(true);
      // Total should be close to pool (accounting for rounding)
      const totalDistributed = BigInt(data.totalNewAmount);
      expect(totalDistributed).toBeLessThanOrEqual(hugePool);
      expect(totalDistributed).toBeGreaterThan(hugePool - BigInt(1000)); // Within 1000 units
    });

    it('single user gets entire pool', async () => {
      const users = [
        {
          id: 'sole-user',
          wallet_address: VALID_WALLET,
          allocatable_points: 999,
          cumulative_yap: '0',
        },
      ];
      mockDb.getDistributableUsers.mockResolvedValue(users);
      mockDb.getUsersWithWallets.mockResolvedValue(
        users.map((u) => ({ id: u.id, wallet_address: u.wallet_address }))
      );

      mockGetRateLimitedAvailable.mockResolvedValue(BigInt(5_000_000_000)); // 5 YAP
      mockBuildMerkleTree.mockReturnValue({
        root: new Uint8Array(32).fill(9),
        proofs: new Map(),
      });
      mockSubmitMerkleRoot.mockResolvedValue('tx-sole-user');
      mockDb.createDistribution.mockResolvedValue(undefined);
      mockDb.createUserReward.mockResolvedValue(undefined);
      mockDb.submitDistribution.mockResolvedValue(undefined);

      const request = createCronRequest(CRON_SECRET, 'http://localhost:3000/api/cron/distribute');
      const response = await GET(request);
      const { status, data } = await parseResponse<ApiResponse>(response);

      expect(status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.usersProcessed).toBe(1);
      // Single user gets entire pool
      expect(data.totalNewAmount).toBe('5000000000');
    });
  });

  // ============================================================
  // Snapshot Integration
  // ============================================================
  describe('snapshot integration', () => {
    it('includes snapshot stats in response', async () => {
      mockDb.getUsersWithWallets.mockResolvedValue([{ id: 'u1', wallet_address: VALID_WALLET }]);
      mockDb.getDistributableUsers.mockResolvedValue([]);

      const request = createCronRequest(CRON_SECRET, 'http://localhost:3000/api/cron/distribute');
      const response = await GET(request);
      const { status, data } = await parseResponse<ApiResponse>(response);

      expect(status).toBe(200);
      // Snapshot stats should be included even when no distribution occurs
      expect(data.snapshot).toBeDefined();
      expect(data.snapshot.usersProcessed).toBeDefined();
      expect(data.snapshot.avgVotePower).toBeDefined();
    });

    it('continues distribution even if snapshot fails', async () => {
      // Snapshot will fail, but distribution should proceed
      mockDb.getUsersWithWallets.mockRejectedValue(new Error('Snapshot query failed'));

      const users = [
        { id: 'u1', wallet_address: VALID_WALLET, allocatable_points: 100, cumulative_yap: '0' },
      ];
      mockDb.getDistributableUsers.mockResolvedValue(users);
      mockGetRateLimitedAvailable.mockResolvedValue(BigInt(1_000_000_000));
      mockBuildMerkleTree.mockReturnValue({
        root: new Uint8Array(32).fill(10),
        proofs: new Map(),
      });
      mockSubmitMerkleRoot.mockResolvedValue('tx-snapshot-failed');
      mockDb.createDistribution.mockResolvedValue(undefined);
      mockDb.createUserReward.mockResolvedValue(undefined);
      mockDb.submitDistribution.mockResolvedValue(undefined);

      const request = createCronRequest(CRON_SECRET, 'http://localhost:3000/api/cron/distribute');
      const response = await GET(request);
      const { status, data } = await parseResponse<ApiResponse>(response);

      // Distribution should succeed despite snapshot failure
      expect(status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.usersProcessed).toBe(1);
    });
  });
});
