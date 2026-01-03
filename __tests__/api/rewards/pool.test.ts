import { describe, it, expect, vi, beforeEach } from 'vitest';
import { mockAuthFn, createMockSession } from '../../mocks/auth';
import { mockDb, createMockUser, resetDbMocks } from '../../mocks/database';
import { parseResponse } from '../../mocks/next';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type ApiResponse = Record<string, any>;

// Use vi.hoisted() so mock is available when vi.mock() is hoisted
const mockGetRateLimitedAvailable = vi.hoisted(() => vi.fn());

// Mock dependencies before importing the route
vi.mock('@/auth', () => ({ auth: mockAuthFn }));
vi.mock('@/lib/database', () => ({ db: mockDb }));
vi.mock('@/lib/logger', () => ({
  apiLogger: { error: vi.fn(), info: vi.fn(), warn: vi.fn() },
}));
vi.mock('@/lib/solana', () => ({
  getRateLimitedAvailable: mockGetRateLimitedAvailable,
}));

// Import the route handler after mocks are set up
import { GET } from '@/app/api/rewards/pool/route';

describe('GET /api/rewards/pool', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    resetDbMocks();
  });

  it('returns 401 when not authenticated', async () => {
    mockAuthFn.mockResolvedValue(null);

    const response = await GET();
    const { status, data } = await parseResponse<ApiResponse>(response);

    expect(status).toBe(401);
    expect(data.error).toBe('Unauthorized');
  });

  it('returns 404 when user not found', async () => {
    mockAuthFn.mockResolvedValue(createMockSession());
    mockDb.findUserById.mockResolvedValue(null);

    const response = await GET();
    const { status, data } = await parseResponse<ApiResponse>(response);

    expect(status).toBe(404);
    expect(data.error).toBe('User not found');
  });

  it('calculates user share percentage correctly', async () => {
    mockAuthFn.mockResolvedValue(createMockSession());
    mockDb.findUserById.mockResolvedValue(
      createMockUser({ points: 100, wallet_address: 'TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA' })
    );
    mockDb.getUserDistributedTotal.mockResolvedValue(0);
    mockDb.getTotalPendingPoints.mockResolvedValue(1000);
    mockGetRateLimitedAvailable.mockResolvedValue(BigInt(10_000_000_000)); // 10 YAP daily pool

    const response = await GET();
    const { status, data } = await parseResponse<ApiResponse>(response);

    expect(status).toBe(200);
    expect(data.walletConnected).toBe(true);
    expect(data.userSharePercent).toBe(10); // 100 / 1000 = 10%
    expect(data.dailyPool).toBe('10000000000');
    expect(data.totalPendingPoints).toBe(1000);
    // estimatedReward = (100 * 10_000_000_000) / 1000 = 1_000_000_000 (1 YAP)
    expect(data.estimatedReward).toBe('1000000000');
  });

  it('returns 0 estimated reward when no wallet connected', async () => {
    mockAuthFn.mockResolvedValue(createMockSession());
    mockDb.findUserById.mockResolvedValue(createMockUser({ points: 0, wallet_address: null }));
    mockDb.getUserDistributedTotal.mockResolvedValue(0);
    mockDb.getTotalPendingPoints.mockResolvedValue(0);
    mockGetRateLimitedAvailable.mockResolvedValue(BigInt(0));

    const response = await GET();
    const { status, data } = await parseResponse<ApiResponse>(response);

    expect(status).toBe(200);
    expect(data.walletConnected).toBe(false);
    expect(data.estimatedReward).toBe('0');
    expect(data.userSharePercent).toBe(0);
  });

  // ============================================================
  // P2: Pool Boundary Edge Cases
  // ============================================================
  describe('pool boundary conditions', () => {
    it('handles user with dominant share (99.99%)', async () => {
      mockAuthFn.mockResolvedValue(createMockSession());
      mockDb.findUserById.mockResolvedValue(
        createMockUser({
          points: 9999,
          wallet_address: 'TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA',
        })
      );
      mockDb.getUserDistributedTotal.mockResolvedValue(0);
      mockDb.getTotalPendingPoints.mockResolvedValue(10000);
      mockGetRateLimitedAvailable.mockResolvedValue(BigInt(1_000_000_000));

      const response = await GET();
      const { status, data } = await parseResponse<ApiResponse>(response);

      expect(status).toBe(200);
      expect(data.userSharePercent).toBeCloseTo(99.99, 1);
      // estimatedReward should be ~99.99% of pool
      const estimated = BigInt(data.estimatedReward);
      expect(estimated).toBeGreaterThan(BigInt(990_000_000));
    });

    it('handles user with minimal share (0.01%)', async () => {
      mockAuthFn.mockResolvedValue(createMockSession());
      mockDb.findUserById.mockResolvedValue(
        createMockUser({
          points: 1,
          wallet_address: 'TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA',
        })
      );
      mockDb.getUserDistributedTotal.mockResolvedValue(0);
      mockDb.getTotalPendingPoints.mockResolvedValue(10000);
      mockGetRateLimitedAvailable.mockResolvedValue(BigInt(1_000_000_000));

      const response = await GET();
      const { status, data } = await parseResponse<ApiResponse>(response);

      expect(status).toBe(200);
      expect(data.userSharePercent).toBeCloseTo(0.01, 2);
      // Still should get something (not rounded to 0)
      const estimated = BigInt(data.estimatedReward);
      expect(estimated).toBeGreaterThan(BigInt(0));
    });

    it('returns 0 when pool is exhausted', async () => {
      mockAuthFn.mockResolvedValue(createMockSession());
      mockDb.findUserById.mockResolvedValue(
        createMockUser({
          points: 1000,
          wallet_address: 'TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA',
        })
      );
      mockDb.getUserDistributedTotal.mockResolvedValue(0);
      mockDb.getTotalPendingPoints.mockResolvedValue(10000);
      mockGetRateLimitedAvailable.mockResolvedValue(BigInt(0)); // Pool exhausted

      const response = await GET();
      const { status, data } = await parseResponse<ApiResponse>(response);

      expect(status).toBe(200);
      expect(data.dailyPool).toBe('0');
      expect(data.estimatedReward).toBe('0');
    });

    it('handles very large pool amounts', async () => {
      mockAuthFn.mockResolvedValue(createMockSession());
      mockDb.findUserById.mockResolvedValue(
        createMockUser({
          points: 100,
          wallet_address: 'TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA',
        })
      );
      mockDb.getUserDistributedTotal.mockResolvedValue(0);
      mockDb.getTotalPendingPoints.mockResolvedValue(1000);
      // 1 trillion YAP in pool (10^21 raw units)
      mockGetRateLimitedAvailable.mockResolvedValue(BigInt('1000000000000000000000'));

      const response = await GET();
      const { status, data } = await parseResponse<ApiResponse>(response);

      expect(status).toBe(200);
      // Should handle large numbers without overflow
      expect(data.dailyPool).toBeDefined();
      expect(data.estimatedReward).toBeDefined();
    });

    it('handles zero total pending points gracefully', async () => {
      mockAuthFn.mockResolvedValue(createMockSession());
      mockDb.findUserById.mockResolvedValue(
        createMockUser({
          points: 0,
          wallet_address: 'TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA',
        })
      );
      mockDb.getUserDistributedTotal.mockResolvedValue(0);
      mockDb.getTotalPendingPoints.mockResolvedValue(0); // No one has points
      mockGetRateLimitedAvailable.mockResolvedValue(BigInt(1_000_000_000));

      const response = await GET();
      const { status, data } = await parseResponse<ApiResponse>(response);

      // Should not divide by zero
      expect(status).toBe(200);
      expect(data.userSharePercent).toBe(0);
      expect(data.estimatedReward).toBe('0');
    });
  });

  // ============================================================
  // Error Handling Tests
  // ============================================================
  describe('error handling', () => {
    it('returns 500 on database error fetching total pending', async () => {
      mockAuthFn.mockResolvedValue(createMockSession());
      mockDb.findUserById.mockResolvedValue(
        createMockUser({ wallet_address: 'TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA' })
      );
      mockDb.getUserDistributedTotal.mockResolvedValue(0);
      mockDb.getTotalPendingPoints.mockRejectedValue(new Error('Database timeout'));
      mockGetRateLimitedAvailable.mockResolvedValue(BigInt(1_000_000_000));

      const response = await GET();
      const { status, data } = await parseResponse<ApiResponse>(response);

      expect(status).toBe(500);
      expect(data.error).toBe('Internal server error');
    });

    it('returns 0 daily pool when on-chain program not initialized', async () => {
      mockAuthFn.mockResolvedValue(createMockSession());
      mockDb.findUserById.mockResolvedValue(
        createMockUser({
          points: 100,
          wallet_address: 'TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA',
        })
      );
      mockDb.getUserDistributedTotal.mockResolvedValue(0);
      mockDb.getTotalPendingPoints.mockResolvedValue(1000);
      // Simulate program not initialized error
      mockGetRateLimitedAvailable.mockRejectedValue(new Error('Account does not exist'));

      const response = await GET();
      const { status, data } = await parseResponse<ApiResponse>(response);

      // Should gracefully handle and return 0 for pool
      expect(status).toBe(200);
      expect(data.dailyPool).toBe('0');
      expect(data.estimatedReward).toBe('0');
    });

    it('includes nextDistributionIn in response', async () => {
      mockAuthFn.mockResolvedValue(createMockSession());
      mockDb.findUserById.mockResolvedValue(
        createMockUser({ wallet_address: 'TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA' })
      );
      mockDb.getUserDistributedTotal.mockResolvedValue(0);
      mockDb.getTotalPendingPoints.mockResolvedValue(1000);
      mockGetRateLimitedAvailable.mockResolvedValue(BigInt(1_000_000_000));

      const response = await GET();
      const { status, data } = await parseResponse<ApiResponse>(response);

      expect(status).toBe(200);
      expect(data.nextDistributionIn).toBeDefined();
      // Should be between 0 and 86400 seconds (24 hours)
      expect(data.nextDistributionIn).toBeGreaterThanOrEqual(0);
      expect(data.nextDistributionIn).toBeLessThanOrEqual(86400);
    });
  });
});
