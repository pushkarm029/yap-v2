import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createMockRequest, parseResponse } from '../../mocks/next';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type ApiResponse = Record<string, any>;

// Use vi.hoisted() for mocks referenced in vi.mock() factories
const mockAuthFn = vi.hoisted(() => vi.fn());
const mockDb = vi.hoisted(() => ({
  findUserById: vi.fn(),
  getClaimableRewardByWallet: vi.fn(),
  getUserClaimableReward: vi.fn(),
  getDistribution: vi.fn(),
  getDistributionRewards: vi.fn(),
  claimEventExistsForTx: vi.fn(),
  getRewardById: vi.fn(),
  getUserClaimedTotal: vi.fn(),
  getUserUnclaimedTotal: vi.fn(),
  createClaimEvent: vi.fn(),
}));
const mockBuildMerkleTree = vi.hoisted(() => vi.fn());
const mockGetProof = vi.hoisted(() => vi.fn());

// Mock dependencies before importing the route
vi.mock('@/auth', () => ({ auth: mockAuthFn }));
vi.mock('@/lib/database', () => ({
  db: mockDb,
  findUserById: mockDb.findUserById,
}));
vi.mock('@/lib/logger', () => ({
  apiLogger: { error: vi.fn(), info: vi.fn(), warn: vi.fn() },
}));
vi.mock('@/lib/solana', () => ({
  buildMerkleTree: mockBuildMerkleTree,
  getProof: mockGetProof,
}));
vi.mock('@solana/kit', () => ({
  address: vi.fn((addr: string) => {
    // Validate address format - must be 32-44 chars base58
    if (!addr || addr.length < 32 || addr.length > 44) {
      throw new Error('Invalid address');
    }
    return addr;
  }),
}));

// Helper to create mock session
function createMockSession(overrides: Partial<{ user: { id: string } }> = {}) {
  return {
    user: {
      id: 'test-user-123',
      ...overrides.user,
    },
    expires: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
  };
}

// Reset all mocks helper
function resetDbMocks() {
  Object.values(mockDb).forEach((mock) => {
    if (typeof mock.mockReset === 'function') {
      mock.mockReset();
    }
  });
}

// Import the route handler after mocks are set up
import { GET, POST } from '@/app/api/rewards/claim/route';

// Valid Solana wallet address for testing
const VALID_WALLET = 'TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA';
// Valid Solana transaction signature (87-88 chars base58, no 0/O/I/l)
const VALID_TX_SIG =
  '2xrwzuGQMxzh5K3JjYQ5JqVGKFzFqxhXXVqKz7YoXfzTJKkQnkHLECEfCgDBF8KYJZ3XQFKm4uKQFe6kC5EJdQvH';

describe('GET /api/rewards/claim', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    resetDbMocks();
  });

  it('returns 401 when not authenticated', async () => {
    mockAuthFn.mockResolvedValue(null);

    const request = createMockRequest({
      url: 'http://localhost:3000/api/rewards/claim',
      searchParams: { wallet: VALID_WALLET },
    });

    const response = await GET(request);
    const { status, data } = await parseResponse<ApiResponse>(response);

    expect(status).toBe(401);
    expect(data.error).toBe('Unauthorized');
  });

  it('returns 400 for missing wallet param', async () => {
    mockAuthFn.mockResolvedValue(createMockSession());
    mockDb.findUserById.mockResolvedValue({ id: 'test-user-123', wallet_address: VALID_WALLET });

    const request = createMockRequest({
      url: 'http://localhost:3000/api/rewards/claim',
    });

    const response = await GET(request);
    const { status, data } = await parseResponse<ApiResponse>(response);

    expect(status).toBe(400);
    expect(data.error).toBe('Wallet address required');
  });

  it('returns 400 for invalid wallet format', async () => {
    mockAuthFn.mockResolvedValue(createMockSession());
    mockDb.findUserById.mockResolvedValue({ id: 'test-user-123', wallet_address: VALID_WALLET });

    const request = createMockRequest({
      url: 'http://localhost:3000/api/rewards/claim',
      searchParams: { wallet: 'invalid-wallet' },
    });

    const response = await GET(request);
    const { status, data } = await parseResponse<ApiResponse>(response);

    expect(status).toBe(400);
    expect(data.error).toBe('Invalid wallet address');
  });

  it('returns 400 when user has no wallet linked', async () => {
    mockAuthFn.mockResolvedValue(createMockSession());
    mockDb.findUserById.mockResolvedValue({ id: 'test-user-123', wallet_address: null });

    const request = createMockRequest({
      url: 'http://localhost:3000/api/rewards/claim',
      searchParams: { wallet: VALID_WALLET },
    });

    const response = await GET(request);
    const { status, data } = await parseResponse<ApiResponse>(response);

    expect(status).toBe(400);
    expect(data.error).toBe('No wallet linked to account');
  });

  it('returns 403 when querying different wallet than linked', async () => {
    mockAuthFn.mockResolvedValue(createMockSession());
    mockDb.findUserById.mockResolvedValue({
      id: 'test-user-123',
      wallet_address: 'DifferentWallet111111111111111111111111111111',
    });

    const request = createMockRequest({
      url: 'http://localhost:3000/api/rewards/claim',
      searchParams: { wallet: VALID_WALLET },
    });

    const response = await GET(request);
    const { status, data } = await parseResponse<ApiResponse>(response);

    expect(status).toBe(403);
    expect(data.error).toBe('Wallet mismatch');
  });

  it('returns claimable: false when no rewards', async () => {
    mockAuthFn.mockResolvedValue(createMockSession());
    mockDb.findUserById.mockResolvedValue({ id: 'test-user-123', wallet_address: VALID_WALLET });
    mockDb.getClaimableRewardByWallet.mockResolvedValue(null);

    const request = createMockRequest({
      url: 'http://localhost:3000/api/rewards/claim',
      searchParams: { wallet: VALID_WALLET },
    });

    const response = await GET(request);
    const { status, data } = await parseResponse<ApiResponse>(response);

    expect(status).toBe(200);
    expect(data.claimable).toBe(false);
    expect(data.message).toBe('No claimable rewards found');
  });

  // ============================================================
  // Pre-stored Merkle Proof Tests
  // ============================================================
  describe('pre-stored merkle proof', () => {
    it('returns pre-stored proof without rebuilding tree', async () => {
      mockAuthFn.mockResolvedValue(createMockSession());
      mockDb.findUserById.mockResolvedValue({ id: 'test-user-123', wallet_address: VALID_WALLET });
      mockDb.getClaimableRewardByWallet.mockResolvedValue({
        id: 'reward-123',
        distribution_id: 'dist-123',
        wallet_address: VALID_WALLET,
        amount: '10000000000',
        merkle_proof: JSON.stringify(['aa'.repeat(32), 'bb'.repeat(32)]),
      });

      const request = createMockRequest({
        url: 'http://localhost:3000/api/rewards/claim',
        searchParams: { wallet: VALID_WALLET },
      });

      const response = await GET(request);
      const { status, data } = await parseResponse<ApiResponse>(response);

      expect(status).toBe(200);
      expect(data.claimable).toBe(true);
      expect(data.amount).toBe('10000000000');
      expect(data.proof).toEqual(['aa'.repeat(32), 'bb'.repeat(32)]);
      // Should NOT call buildMerkleTree when proof is pre-stored
      expect(mockBuildMerkleTree).not.toHaveBeenCalled();
    });

    it('rebuilds tree when stored proof is invalid JSON', async () => {
      mockAuthFn.mockResolvedValue(createMockSession());
      mockDb.findUserById.mockResolvedValue({ id: 'test-user-123', wallet_address: VALID_WALLET });
      mockDb.getClaimableRewardByWallet.mockResolvedValue({
        id: 'reward-123',
        distribution_id: 'dist-123',
        wallet_address: VALID_WALLET,
        amount: '10000000000',
        merkle_proof: 'not-valid-json',
      });
      mockDb.getDistributionRewards.mockResolvedValue([
        { wallet_address: VALID_WALLET, amount: '10000000000' },
      ]);
      mockBuildMerkleTree.mockReturnValue({
        root: new Uint8Array(32).fill(0xaa),
        tree: [],
      });
      mockGetProof.mockReturnValue({
        wallet: VALID_WALLET,
        amount: BigInt('10000000000'),
        proof: [Buffer.from('cc'.repeat(32), 'hex')],
      });

      const request = createMockRequest({
        url: 'http://localhost:3000/api/rewards/claim',
        searchParams: { wallet: VALID_WALLET },
      });

      const response = await GET(request);
      const { status, data } = await parseResponse<ApiResponse>(response);

      expect(status).toBe(200);
      expect(data.claimable).toBe(true);
      // Should rebuild when JSON is invalid
      expect(mockBuildMerkleTree).toHaveBeenCalled();
    });
  });

  // ============================================================
  // Fallback Proof Generation Tests
  // ============================================================
  describe('fallback proof generation', () => {
    it('returns claimable=false when wallet not in rebuilt distribution', async () => {
      // Use a different valid wallet address
      const OTHER_WALLET = 'ATokenGPvbdGVxr1b2hvZbsiqW5xWH25efTNsLJA8knL';
      mockAuthFn.mockResolvedValue(createMockSession());
      mockDb.findUserById.mockResolvedValue({ id: 'test-user-123', wallet_address: VALID_WALLET });
      mockDb.getClaimableRewardByWallet.mockResolvedValue({
        id: 'reward-123',
        distribution_id: 'dist-123',
        wallet_address: VALID_WALLET,
        amount: '10000000000',
        merkle_proof: null,
      });
      mockDb.getDistributionRewards.mockResolvedValue([
        { wallet_address: OTHER_WALLET, amount: '5000000000' },
      ]);
      mockBuildMerkleTree.mockReturnValue({
        root: new Uint8Array(32).fill(0xaa),
        tree: [],
      });
      mockGetProof.mockReturnValue(null); // Wallet not in tree

      const request = createMockRequest({
        url: 'http://localhost:3000/api/rewards/claim',
        searchParams: { wallet: VALID_WALLET },
      });

      const response = await GET(request);
      const { status, data } = await parseResponse<ApiResponse>(response);

      expect(status).toBe(200);
      expect(data.claimable).toBe(false);
      expect(data.message).toBe('Wallet not found in distribution');
    });
  });

  // ============================================================
  // Error Handling Tests
  // ============================================================
  describe('error handling', () => {
    it('returns 500 on database error', async () => {
      mockAuthFn.mockResolvedValue(createMockSession());
      mockDb.findUserById.mockRejectedValue(new Error('DB connection failed'));

      const request = createMockRequest({
        url: 'http://localhost:3000/api/rewards/claim',
        searchParams: { wallet: VALID_WALLET },
      });

      const response = await GET(request);
      const { status } = await parseResponse<ApiResponse>(response);

      expect(status).toBe(500);
    });
  });
});

describe('POST /api/rewards/claim', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    resetDbMocks();
  });

  it('returns 401 when not authenticated', async () => {
    mockAuthFn.mockResolvedValue(null);

    const request = createMockRequest({
      method: 'POST',
      body: { rewardId: 'reward-123', claimTx: 'tx-abc' },
    });

    const response = await POST(request);
    const { status, data } = await parseResponse<ApiResponse>(response);

    expect(status).toBe(401);
    expect(data.error).toBe('Unauthorized');
  });

  it('returns 400 for missing rewardId', async () => {
    mockAuthFn.mockResolvedValue(createMockSession());
    mockDb.findUserById.mockResolvedValue({ id: 'test-user-123', wallet_address: VALID_WALLET });

    const request = createMockRequest({
      method: 'POST',
      body: { claimTx: 'tx-abc' },
    });

    const response = await POST(request);
    const { status, data } = await parseResponse<ApiResponse>(response);

    expect(status).toBe(400);
    expect(data.error).toBe('rewardId is required');
  });

  it('returns 400 for missing claimTx', async () => {
    mockAuthFn.mockResolvedValue(createMockSession());
    mockDb.findUserById.mockResolvedValue({ id: 'test-user-123', wallet_address: VALID_WALLET });

    const request = createMockRequest({
      method: 'POST',
      body: { rewardId: 'reward-123' },
    });

    const response = await POST(request);
    const { status, data } = await parseResponse<ApiResponse>(response);

    expect(status).toBe(400);
    expect(data.error).toBe('Transaction signature required');
  });

  it('returns 404 when reward not found', async () => {
    mockAuthFn.mockResolvedValue(createMockSession());
    mockDb.findUserById.mockResolvedValue({ id: 'test-user-123', wallet_address: VALID_WALLET });
    mockDb.claimEventExistsForTx.mockResolvedValue(false);
    mockDb.getRewardById.mockResolvedValue(null);

    const request = createMockRequest({
      method: 'POST',
      body: {
        rewardId: 'nonexistent-reward',
        claimTx: VALID_TX_SIG,
      },
    });

    const response = await POST(request);
    const { status, data } = await parseResponse<ApiResponse>(response);

    expect(status).toBe(404);
    expect(data.error).toBe('Reward not found');
  });

  it('returns 403 when claiming reward belonging to different user', async () => {
    mockAuthFn.mockResolvedValue(createMockSession()); // user id: test-user-123
    mockDb.findUserById.mockResolvedValue({ id: 'test-user-123', wallet_address: VALID_WALLET });
    mockDb.claimEventExistsForTx.mockResolvedValue(false);
    mockDb.getRewardById.mockResolvedValue({
      id: 'reward-123',
      user_id: 'different-user-456', // Different user
      wallet_address: VALID_WALLET,
      amount: '1000000000',
    });

    const request = createMockRequest({
      method: 'POST',
      body: {
        rewardId: 'reward-123',
        claimTx: VALID_TX_SIG,
      },
    });

    const response = await POST(request);
    const { status, data } = await parseResponse<ApiResponse>(response);

    expect(status).toBe(403);
    expect(data.error).toBe('Not your reward');
  });

  it('successfully records claim event', async () => {
    mockAuthFn.mockResolvedValue(createMockSession());
    mockDb.findUserById.mockResolvedValue({ id: 'test-user-123', wallet_address: VALID_WALLET });
    mockDb.claimEventExistsForTx.mockResolvedValue(false);
    mockDb.getRewardById.mockResolvedValue({
      id: 'reward-123',
      user_id: 'test-user-123', // Same user as session
      wallet_address: VALID_WALLET,
      amount: '1000000000',
    });
    mockDb.getUserClaimedTotal.mockResolvedValue('0');
    mockDb.createClaimEvent.mockResolvedValue(undefined);

    const request = createMockRequest({
      method: 'POST',
      body: {
        rewardId: 'reward-123',
        claimTx: VALID_TX_SIG,
      },
    });

    const response = await POST(request);
    const { status, data } = await parseResponse<ApiResponse>(response);

    expect(status).toBe(200);
    expect(data.success).toBe(true);
    expect(data.message).toBe('Claim recorded');
    expect(mockDb.createClaimEvent).toHaveBeenCalled();
  });

  it('calculates correct delta for partial claim', async () => {
    mockAuthFn.mockResolvedValue(createMockSession());
    mockDb.findUserById.mockResolvedValue({ id: 'test-user-123', wallet_address: VALID_WALLET });
    mockDb.claimEventExistsForTx.mockResolvedValue(false);
    mockDb.getRewardById.mockResolvedValue({
      id: 'reward-123',
      user_id: 'test-user-123',
      wallet_address: VALID_WALLET,
      amount: '10000000000', // 10 YAP cumulative
    });
    mockDb.getUserClaimedTotal.mockResolvedValue('3000000000'); // Previously claimed 3 YAP
    mockDb.createClaimEvent.mockResolvedValue(undefined);

    const request = createMockRequest({
      method: 'POST',
      body: { rewardId: 'reward-123', claimTx: VALID_TX_SIG },
    });

    const response = await POST(request);
    const { status, data } = await parseResponse<ApiResponse>(response);

    expect(status).toBe(200);
    expect(data.amountClaimed).toBe('7000000000'); // 10 - 3 = 7 YAP
    expect(mockDb.createClaimEvent).toHaveBeenCalledWith(
      expect.any(String),
      'test-user-123',
      VALID_WALLET,
      BigInt('7000000000'), // delta
      BigInt('10000000000'), // cumulative
      'reward-123',
      VALID_TX_SIG
    );
  });

  it('returns 400 when nothing to claim (fully claimed)', async () => {
    mockAuthFn.mockResolvedValue(createMockSession());
    mockDb.findUserById.mockResolvedValue({ id: 'test-user-123', wallet_address: VALID_WALLET });
    mockDb.claimEventExistsForTx.mockResolvedValue(false);
    mockDb.getRewardById.mockResolvedValue({
      id: 'reward-123',
      user_id: 'test-user-123',
      wallet_address: VALID_WALLET,
      amount: '10000000000', // 10 YAP cumulative
    });
    mockDb.getUserClaimedTotal.mockResolvedValue('10000000000'); // Already claimed all 10 YAP

    const request = createMockRequest({
      method: 'POST',
      body: { rewardId: 'reward-123', claimTx: VALID_TX_SIG },
    });

    const response = await POST(request);
    const { status, data } = await parseResponse<ApiResponse>(response);

    expect(status).toBe(400);
    expect(data.error).toBe('Nothing to claim');
    expect(mockDb.createClaimEvent).not.toHaveBeenCalled();
  });

  it('handles large BigInt amounts correctly', async () => {
    mockAuthFn.mockResolvedValue(createMockSession());
    mockDb.findUserById.mockResolvedValue({ id: 'test-user-123', wallet_address: VALID_WALLET });
    mockDb.claimEventExistsForTx.mockResolvedValue(false);
    mockDb.getRewardById.mockResolvedValue({
      id: 'reward-123',
      user_id: 'test-user-123',
      wallet_address: VALID_WALLET,
      amount: '999999999999999999', // ~1 billion YAP
    });
    mockDb.getUserClaimedTotal.mockResolvedValue('0');
    mockDb.createClaimEvent.mockResolvedValue(undefined);

    const request = createMockRequest({
      method: 'POST',
      body: { rewardId: 'reward-123', claimTx: VALID_TX_SIG },
    });

    const response = await POST(request);
    const { status, data } = await parseResponse<ApiResponse>(response);

    expect(status).toBe(200);
    expect(data.amountClaimed).toBe('999999999999999999');
  });

  // ============================================================
  // P0 Critical: Security & Double Claim Prevention
  // ============================================================
  describe('double claim prevention', () => {
    it('returns success for idempotent claim (same tx already recorded)', async () => {
      // New behavior: claimEventExistsForTx returns true = idempotent success
      mockAuthFn.mockResolvedValue(createMockSession());
      mockDb.findUserById.mockResolvedValue({ id: 'test-user-123', wallet_address: VALID_WALLET });
      mockDb.claimEventExistsForTx.mockResolvedValue(true); // Already recorded

      const request = createMockRequest({
        method: 'POST',
        body: {
          rewardId: 'reward-already-claimed',
          claimTx: VALID_TX_SIG,
        },
      });

      const response = await POST(request);
      const { status, data } = await parseResponse<ApiResponse>(response);

      // Idempotent: returns success if tx already recorded
      expect(status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.message).toBe('Claim already recorded');
    });

    it('handles concurrent claim attempts gracefully', async () => {
      mockAuthFn.mockResolvedValue(createMockSession());
      mockDb.findUserById.mockResolvedValue({ id: 'test-user-123', wallet_address: VALID_WALLET });

      // First call: tx not yet recorded
      mockDb.claimEventExistsForTx.mockResolvedValueOnce(false);
      mockDb.getRewardById.mockResolvedValueOnce({
        id: 'reward-concurrent',
        user_id: 'test-user-123',
        wallet_address: VALID_WALLET,
        amount: '1000000000',
      });
      mockDb.getUserClaimedTotal.mockResolvedValueOnce('0');
      mockDb.createClaimEvent.mockResolvedValueOnce(undefined);

      // Second call: tx now recorded (idempotent check)
      mockDb.claimEventExistsForTx.mockResolvedValueOnce(true);

      const claimBody = {
        rewardId: 'reward-concurrent',
        claimTx: VALID_TX_SIG,
      };

      const request1 = createMockRequest({ method: 'POST', body: claimBody });
      const request2 = createMockRequest({ method: 'POST', body: claimBody });

      const response1 = await POST(request1);
      const response2 = await POST(request2);

      const result1 = await parseResponse<ApiResponse>(response1);
      const result2 = await parseResponse<ApiResponse>(response2);

      // Both succeed (idempotent)
      expect(result1.status).toBe(200);
      expect(result2.status).toBe(200);
    });

    it('validates transaction signature format', async () => {
      mockAuthFn.mockResolvedValue(createMockSession());
      mockDb.findUserById.mockResolvedValue({ id: 'test-user-123', wallet_address: VALID_WALLET });

      const request = createMockRequest({
        method: 'POST',
        body: {
          rewardId: 'reward-123',
          claimTx: 'invalid-tx-format', // Not a valid Solana signature
        },
      });

      const response = await POST(request);
      const { status, data } = await parseResponse<ApiResponse>(response);

      // Should reject invalid tx format early
      expect(status).toBe(400);
      expect(data.error).toBe('Invalid transaction signature format');
    });
  });

  describe('authorization checks', () => {
    it('handles database errors gracefully', async () => {
      mockAuthFn.mockResolvedValue(createMockSession());
      mockDb.findUserById.mockResolvedValue({ id: 'test-user-123', wallet_address: VALID_WALLET });
      mockDb.claimEventExistsForTx.mockResolvedValue(false);
      mockDb.getRewardById.mockResolvedValue({
        id: 'reward-123',
        user_id: 'test-user-123',
        wallet_address: VALID_WALLET,
        amount: '1000000000',
      });
      mockDb.getUserClaimedTotal.mockResolvedValue('0');
      mockDb.createClaimEvent.mockRejectedValue(new Error('Database connection lost'));

      const request = createMockRequest({
        method: 'POST',
        body: {
          rewardId: 'reward-123',
          claimTx: VALID_TX_SIG,
        },
      });

      const response = await POST(request);
      const { status, data } = await parseResponse<ApiResponse>(response);

      // Should return 500 for database errors
      expect(status).toBe(500);
      expect(data.error).toBeDefined();
    });

    it('returns 400 for empty rewardId', async () => {
      mockAuthFn.mockResolvedValue(createMockSession());
      mockDb.findUserById.mockResolvedValue({ id: 'test-user-123', wallet_address: VALID_WALLET });

      const request = createMockRequest({
        method: 'POST',
        body: {
          rewardId: '',
          claimTx: '5KtP9UBw3c8LWQxmVhJqRcZoYHJz7nDhgJhvPGrKpLfVxUMbAcDFGv',
        },
      });

      const response = await POST(request);
      const { status, data } = await parseResponse<ApiResponse>(response);

      expect(status).toBe(400);
      expect(data.error).toBeDefined();
    });

    it('returns 400 for empty claimTx', async () => {
      mockAuthFn.mockResolvedValue(createMockSession());
      mockDb.findUserById.mockResolvedValue({ id: 'test-user-123', wallet_address: VALID_WALLET });

      const request = createMockRequest({
        method: 'POST',
        body: {
          rewardId: 'reward-123',
          claimTx: '',
        },
      });

      const response = await POST(request);
      const { status, data } = await parseResponse<ApiResponse>(response);

      expect(status).toBe(400);
      expect(data.error).toBeDefined();
    });
  });

  // ============================================================
  // Multi-Distribution Claim Scenarios
  // ============================================================
  describe('multi-distribution claim scenarios', () => {
    // ============================================================
    // STRING MAX Regression Tests (P0)
    // Tests for the bug where MAX() on TEXT columns did lexicographic
    // comparison: '1077...' < '794...' because '1' < '7' in ASCII
    // ============================================================
    describe('STRING MAX regression tests', () => {
      it('handles amounts where 1xxx > 9xx numerically (regression)', async () => {
        // This is the exact pattern that broke: amounts starting with 1 vs 9
        // Lexicographically '1000000000' < '999999999' but numerically 1B > 999M
        mockAuthFn.mockResolvedValue(createMockSession());
        mockDb.findUserById.mockResolvedValue({
          id: 'test-user-123',
          wallet_address: VALID_WALLET,
        });
        mockDb.claimEventExistsForTx.mockResolvedValue(false);
        mockDb.getRewardById.mockResolvedValue({
          id: 'reward-regression',
          user_id: 'test-user-123',
          wallet_address: VALID_WALLET,
          amount: '1000000000', // 1B (starts with 1)
        });
        // Previously claimed 999M (starts with 9)
        // Lexicographic: '999999999' > '1000000000' would wrongly show nothing to claim
        mockDb.getUserClaimedTotal.mockResolvedValue('999999999');
        mockDb.createClaimEvent.mockResolvedValue(undefined);

        const request = createMockRequest({
          method: 'POST',
          body: { rewardId: 'reward-regression', claimTx: VALID_TX_SIG },
        });

        const response = await POST(request);
        const { status, data } = await parseResponse<ApiResponse>(response);

        // Should claim the delta: 1B - 999M = 1M
        expect(status).toBe(200);
        expect(data.amountClaimed).toBe('1');
        expect(mockDb.createClaimEvent).toHaveBeenCalledWith(
          expect.any(String),
          'test-user-123',
          VALID_WALLET,
          BigInt('1'), // delta: 1000000000 - 999999999 = 1
          BigInt('1000000000'), // cumulative
          'reward-regression',
          VALID_TX_SIG
        );
      });

      it('returns correct unclaimed with MirageAudits-style amounts', async () => {
        // Exact reproduction of the production bug
        // Dist 1: amount=794098092902287 (Dec 30)
        // Dist 2: amount=1077878318175223 (Dec 31) - HIGHER but starts with 1
        mockAuthFn.mockResolvedValue(createMockSession());
        mockDb.findUserById.mockResolvedValue({
          id: 'test-user-123',
          wallet_address: VALID_WALLET,
        });
        mockDb.claimEventExistsForTx.mockResolvedValue(false);
        mockDb.getRewardById.mockResolvedValue({
          id: 'reward-mirage',
          user_id: 'test-user-123',
          wallet_address: VALID_WALLET,
          amount: '1077878318175223', // Latest cumulative (starts with 1)
        });
        // No previous claims
        mockDb.getUserClaimedTotal.mockResolvedValue('0');
        mockDb.createClaimEvent.mockResolvedValue(undefined);

        const request = createMockRequest({
          method: 'POST',
          body: { rewardId: 'reward-mirage', claimTx: VALID_TX_SIG },
        });

        const response = await POST(request);
        const { status, data } = await parseResponse<ApiResponse>(response);

        expect(status).toBe(200);
        // Should claim the full amount, not the smaller one due to string MAX
        expect(data.amountClaimed).toBe('1077878318175223');
        expect(mockDb.createClaimEvent).toHaveBeenCalledWith(
          expect.any(String),
          'test-user-123',
          VALID_WALLET,
          BigInt('1077878318175223'),
          BigInt('1077878318175223'),
          'reward-mirage',
          VALID_TX_SIG
        );
      });
    });

    // ============================================================
    // Sequential Claims Across 4+ Distributions (P1)
    // ============================================================
    describe('sequential claims across 4+ distributions', () => {
      const DIST_AMOUNTS = {
        dist1: '100000000000', // 100B
        dist2: '350000000000', // 350B cumulative
        dist3: '600000000000', // 600B cumulative
        dist4: '1000000000000', // 1T cumulative
      };

      it('tracks cumulative correctly through 4 sequential claims', async () => {
        mockAuthFn.mockResolvedValue(createMockSession());
        mockDb.findUserById.mockResolvedValue({
          id: 'test-user-123',
          wallet_address: VALID_WALLET,
        });
        mockDb.claimEventExistsForTx.mockResolvedValue(false);
        mockDb.createClaimEvent.mockResolvedValue(undefined);

        // Claim 1: First distribution, no previous claims
        mockDb.getRewardById.mockResolvedValueOnce({
          id: 'reward-1',
          user_id: 'test-user-123',
          wallet_address: VALID_WALLET,
          amount: DIST_AMOUNTS.dist1,
        });
        mockDb.getUserClaimedTotal.mockResolvedValueOnce('0');

        // Valid Solana tx signatures (base58, 87-88 chars)
        const txSig1 =
          '3xrwzuGQMxzh5K3JjYQ5JqVGKFzFqxhXXVqKz7YoXfzTJKkQnkHLECEfCgDBF8KYJZ3XQFKm4uKQFe6kC5EJdQvA';
        const txSig2 =
          '4xrwzuGQMxzh5K3JjYQ5JqVGKFzFqxhXXVqKz7YoXfzTJKkQnkHLECEfCgDBF8KYJZ3XQFKm4uKQFe6kC5EJdQvB';
        const txSig3 =
          '5xrwzuGQMxzh5K3JjYQ5JqVGKFzFqxhXXVqKz7YoXfzTJKkQnkHLECEfCgDBF8KYJZ3XQFKm4uKQFe6kC5EJdQvC';
        const txSig4 =
          '6xrwzuGQMxzh5K3JjYQ5JqVGKFzFqxhXXVqKz7YoXfzTJKkQnkHLECEfCgDBF8KYJZ3XQFKm4uKQFe6kC5EJdQvD';

        const req1 = createMockRequest({
          method: 'POST',
          body: { rewardId: 'reward-1', claimTx: txSig1 },
        });
        const res1 = await POST(req1);
        const data1 = await parseResponse<ApiResponse>(res1);

        expect(data1.status).toBe(200);
        expect(data1.data.amountClaimed).toBe('100000000000'); // 100B delta

        // Claim 2: Second distribution, previously claimed 100B
        mockDb.getRewardById.mockResolvedValueOnce({
          id: 'reward-2',
          user_id: 'test-user-123',
          wallet_address: VALID_WALLET,
          amount: DIST_AMOUNTS.dist2,
        });
        mockDb.getUserClaimedTotal.mockResolvedValueOnce('100000000000');

        const req2 = createMockRequest({
          method: 'POST',
          body: { rewardId: 'reward-2', claimTx: txSig2 },
        });
        const res2 = await POST(req2);
        const data2 = await parseResponse<ApiResponse>(res2);

        expect(data2.status).toBe(200);
        expect(data2.data.amountClaimed).toBe('250000000000'); // 350B - 100B = 250B

        // Claim 3: Third distribution, previously claimed 350B
        mockDb.getRewardById.mockResolvedValueOnce({
          id: 'reward-3',
          user_id: 'test-user-123',
          wallet_address: VALID_WALLET,
          amount: DIST_AMOUNTS.dist3,
        });
        mockDb.getUserClaimedTotal.mockResolvedValueOnce('350000000000');

        const req3 = createMockRequest({
          method: 'POST',
          body: { rewardId: 'reward-3', claimTx: txSig3 },
        });
        const res3 = await POST(req3);
        const data3 = await parseResponse<ApiResponse>(res3);

        expect(data3.status).toBe(200);
        expect(data3.data.amountClaimed).toBe('250000000000'); // 600B - 350B = 250B

        // Claim 4: Fourth distribution, previously claimed 600B
        mockDb.getRewardById.mockResolvedValueOnce({
          id: 'reward-4',
          user_id: 'test-user-123',
          wallet_address: VALID_WALLET,
          amount: DIST_AMOUNTS.dist4,
        });
        mockDb.getUserClaimedTotal.mockResolvedValueOnce('600000000000');

        const req4 = createMockRequest({
          method: 'POST',
          body: { rewardId: 'reward-4', claimTx: txSig4 },
        });
        const res4 = await POST(req4);
        const data4 = await parseResponse<ApiResponse>(res4);

        expect(data4.status).toBe(200);
        expect(data4.data.amountClaimed).toBe('400000000000'); // 1T - 600B = 400B

        // Verify createClaimEvent calls
        expect(mockDb.createClaimEvent).toHaveBeenCalledTimes(4);
      });

      it('returns 400 after all distributions fully claimed', async () => {
        mockAuthFn.mockResolvedValue(createMockSession());
        mockDb.findUserById.mockResolvedValue({
          id: 'test-user-123',
          wallet_address: VALID_WALLET,
        });
        mockDb.claimEventExistsForTx.mockResolvedValue(false);
        mockDb.getRewardById.mockResolvedValue({
          id: 'reward-final',
          user_id: 'test-user-123',
          wallet_address: VALID_WALLET,
          amount: '1000000000000', // 1T cumulative (latest dist)
        });
        // Already claimed 1T
        mockDb.getUserClaimedTotal.mockResolvedValue('1000000000000');

        const request = createMockRequest({
          method: 'POST',
          body: { rewardId: 'reward-final', claimTx: VALID_TX_SIG },
        });

        const response = await POST(request);
        const { status, data } = await parseResponse<ApiResponse>(response);

        expect(status).toBe(400);
        expect(data.error).toBe('Nothing to claim');
        expect(mockDb.createClaimEvent).not.toHaveBeenCalled();
      });
    });

    // ============================================================
    // Partial Claims Spanning Distributions (P2)
    // ============================================================
    describe('partial claims spanning distributions', () => {
      it('allows claiming partial amount less than first distribution', async () => {
        // Setup: Dist1=500B, Dist2=1000B (cumulative)
        // User claims 200B (partial of dist1)
        mockAuthFn.mockResolvedValue(createMockSession());
        mockDb.findUserById.mockResolvedValue({
          id: 'test-user-123',
          wallet_address: VALID_WALLET,
        });
        mockDb.claimEventExistsForTx.mockResolvedValue(false);

        // Claiming from dist2 (cumulative 1000B)
        mockDb.getRewardById.mockResolvedValue({
          id: 'reward-partial',
          user_id: 'test-user-123',
          wallet_address: VALID_WALLET,
          amount: '1000000000000', // 1T cumulative
        });
        // Previously claimed only 200B
        mockDb.getUserClaimedTotal.mockResolvedValue('200000000000');
        mockDb.createClaimEvent.mockResolvedValue(undefined);

        const request = createMockRequest({
          method: 'POST',
          body: { rewardId: 'reward-partial', claimTx: VALID_TX_SIG },
        });

        const response = await POST(request);
        const { status, data } = await parseResponse<ApiResponse>(response);

        expect(status).toBe(200);
        // Should claim remaining: 1T - 200B = 800B
        expect(data.amountClaimed).toBe('800000000000');
      });

      it('calculates correct delta when spanning from partial to next dist', async () => {
        // User claimed 450B from dist1 (500B), now claims rest up to dist2 (1000B)
        mockAuthFn.mockResolvedValue(createMockSession());
        mockDb.findUserById.mockResolvedValue({
          id: 'test-user-123',
          wallet_address: VALID_WALLET,
        });
        mockDb.claimEventExistsForTx.mockResolvedValue(false);

        mockDb.getRewardById.mockResolvedValue({
          id: 'reward-span',
          user_id: 'test-user-123',
          wallet_address: VALID_WALLET,
          amount: '1000000000000', // Latest cumulative
        });
        mockDb.getUserClaimedTotal.mockResolvedValue('450000000000'); // Partial claim
        mockDb.createClaimEvent.mockResolvedValue(undefined);

        const request = createMockRequest({
          method: 'POST',
          body: { rewardId: 'reward-span', claimTx: VALID_TX_SIG },
        });

        const response = await POST(request);
        const { status, data } = await parseResponse<ApiResponse>(response);

        expect(status).toBe(200);
        // Delta: 1T - 450B = 550B (spans across dist1 remainder + dist2)
        expect(data.amountClaimed).toBe('550000000000');
        expect(mockDb.createClaimEvent).toHaveBeenCalledWith(
          expect.any(String),
          'test-user-123',
          VALID_WALLET,
          BigInt('550000000000'),
          BigInt('1000000000000'),
          'reward-span',
          VALID_TX_SIG
        );
      });
    });

    // ============================================================
    // Edge Cases for Cumulative Tracking
    // ============================================================
    describe('cumulative tracking edge cases', () => {
      it('handles claim when previous claimed exceeds current reward (edge case)', async () => {
        // This shouldn't happen in production, but test defensive handling
        // Previous claimed: 500B, Current reward amount: 300B
        mockAuthFn.mockResolvedValue(createMockSession());
        mockDb.findUserById.mockResolvedValue({
          id: 'test-user-123',
          wallet_address: VALID_WALLET,
        });
        mockDb.claimEventExistsForTx.mockResolvedValue(false);

        mockDb.getRewardById.mockResolvedValue({
          id: 'reward-edge',
          user_id: 'test-user-123',
          wallet_address: VALID_WALLET,
          amount: '300000000000', // Lower than claimed (shouldn't happen)
        });
        mockDb.getUserClaimedTotal.mockResolvedValue('500000000000');

        const request = createMockRequest({
          method: 'POST',
          body: { rewardId: 'reward-edge', claimTx: VALID_TX_SIG },
        });

        const response = await POST(request);
        const { status, data } = await parseResponse<ApiResponse>(response);

        // Should return 400 since delta would be negative
        expect(status).toBe(400);
        expect(data.error).toBe('Nothing to claim');
      });

      it('handles exact equality between claimed and reward amount', async () => {
        mockAuthFn.mockResolvedValue(createMockSession());
        mockDb.findUserById.mockResolvedValue({
          id: 'test-user-123',
          wallet_address: VALID_WALLET,
        });
        mockDb.claimEventExistsForTx.mockResolvedValue(false);

        mockDb.getRewardById.mockResolvedValue({
          id: 'reward-exact',
          user_id: 'test-user-123',
          wallet_address: VALID_WALLET,
          amount: '500000000000',
        });
        mockDb.getUserClaimedTotal.mockResolvedValue('500000000000'); // Exactly equal

        const request = createMockRequest({
          method: 'POST',
          body: { rewardId: 'reward-exact', claimTx: VALID_TX_SIG },
        });

        const response = await POST(request);
        const { status, data } = await parseResponse<ApiResponse>(response);

        expect(status).toBe(400);
        expect(data.error).toBe('Nothing to claim');
      });
    });

    describe('unsubmitted distribution handling', () => {
      // Scenario: Dist 1 (200B, submitted) -> Dist 2 (500B, NOT submitted) -> Dist 3 (800B, submitted)
      // The GET endpoint should skip Dist 2 and return Dist 3 as claimable

      it('returns submitted distribution skipping unsubmitted ones', async () => {
        mockAuthFn.mockResolvedValue(createMockSession());
        mockDb.findUserById.mockResolvedValue({
          id: 'test-user-123',
          wallet_address: VALID_WALLET,
        });

        // getClaimableRewardByWallet should return dist-3 (the latest submitted), not dist-2 (unsubmitted)
        // The database layer filters by submitted_at IS NOT NULL
        mockDb.getClaimableRewardByWallet.mockResolvedValue({
          id: 'reward-dist3',
          distribution_id: 'dist-3',
          user_id: 'test-user-123',
          wallet_address: VALID_WALLET,
          amount: '800000000000', // 800B cumulative from dist-3
          merkle_proof: JSON.stringify(['abc123', 'def456']),
        });

        const request = createMockRequest({
          method: 'GET',
          url: `http://localhost/api/rewards/claim?wallet=${VALID_WALLET}`,
        });

        const response = await GET(request);
        const { status, data } = await parseResponse<{
          claimable: boolean;
          rewardId?: string;
          amount?: string;
        }>(response);

        expect(status).toBe(200);
        expect(data.claimable).toBe(true);
        // Should return dist-3 reward, skipping unsubmitted dist-2
        expect(data.rewardId).toBe('reward-dist3');
        expect(data.amount).toBe('800000000000'); // Cumulative amount in merkle tree
      });

      it('calculates unclaimed total excluding unsubmitted distributions', async () => {
        // Even though dist-2 has 500B, getUserUnclaimedTotal should only count submitted dists
        mockAuthFn.mockResolvedValue(createMockSession());
        mockDb.findUserById.mockResolvedValue({
          id: 'test-user-123',
          wallet_address: VALID_WALLET,
        });

        // No claimable reward returned (user has no submitted rewards)
        mockDb.getClaimableRewardByWallet.mockResolvedValue(null);

        const request = createMockRequest({
          method: 'GET',
          url: `http://localhost/api/rewards/claim?wallet=${VALID_WALLET}`,
        });

        const response = await GET(request);
        const { status, data } = await parseResponse<{ claimable: boolean }>(response);

        expect(status).toBe(200);
        expect(data.claimable).toBe(false);
        // When no claimable reward, returns early without calculating unclaimed total
      });

      it('allows claiming from later submitted dist after earlier unsubmitted', async () => {
        // User claimed 200B from dist-1, dist-2 is unsubmitted, can claim from dist-3
        mockAuthFn.mockResolvedValue(createMockSession());
        mockDb.findUserById.mockResolvedValue({
          id: 'test-user-123',
          wallet_address: VALID_WALLET,
        });
        mockDb.claimEventExistsForTx.mockResolvedValue(false);

        // Claiming from dist-3 (800B cumulative, 200B already claimed)
        mockDb.getRewardById.mockResolvedValue({
          id: 'reward-dist3',
          user_id: 'test-user-123',
          wallet_address: VALID_WALLET,
          amount: '800000000000', // 800B cumulative
        });
        mockDb.getUserClaimedTotal.mockResolvedValue('200000000000'); // 200B claimed from dist-1
        mockDb.createClaimEvent.mockResolvedValue(undefined);

        const txSig =
          '5xrwzuGQMxzh5K3JjYQ5JqVGKFzFqxhXXVqKz7YoXfzTJKkQnkHLECEfCgDBF8KYJZ3XQFKm4uKQFe6kC5EJdQvE';
        const request = createMockRequest({
          method: 'POST',
          body: { rewardId: 'reward-dist3', claimTx: txSig },
        });

        const response = await POST(request);
        const { status, data } = await parseResponse<{ success: boolean }>(response);

        expect(status).toBe(200);
        expect(data.success).toBe(true);

        // Should claim delta of 600B (800B - 200B)
        expect(mockDb.createClaimEvent).toHaveBeenCalledWith(
          expect.any(String),
          'test-user-123',
          VALID_WALLET,
          BigInt('600000000000'), // delta: 800B - 200B
          BigInt('800000000000'), // cumulative: 800B total
          'reward-dist3',
          txSig
        );
      });
    });
  });
});
