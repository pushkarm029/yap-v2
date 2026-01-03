import { describe, it, expect, vi, beforeEach } from 'vitest';
import { mockAuthFn, createMockSession } from '../../mocks/auth';
import { mockDb, createMockUser, resetDbMocks } from '../../mocks/database';
import { parseResponse } from '../../mocks/next';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type ApiResponse = Record<string, any>;

// Mock dependencies before importing the route
vi.mock('@/auth', () => ({ auth: mockAuthFn }));
vi.mock('@/lib/database', () => ({ db: mockDb }));
vi.mock('@/lib/logger', () => ({
  apiLogger: { error: vi.fn(), info: vi.fn(), warn: vi.fn() },
}));

// Import the route handler after mocks are set up
import { GET } from '@/app/api/rewards/yap/route';

describe('GET /api/rewards/yap', () => {
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

  it('returns walletConnected: false when no wallet', async () => {
    mockAuthFn.mockResolvedValue(createMockSession());
    mockDb.findUserById.mockResolvedValue(createMockUser({ wallet_address: null }));
    mockDb.getUserClaimedTotal.mockResolvedValue('0');
    mockDb.getUserUnclaimedTotal.mockResolvedValue('0');
    mockDb.getUserClaimableReward.mockResolvedValue(null);

    const response = await GET();
    const { status, data } = await parseResponse<ApiResponse>(response);

    expect(status).toBe(200);
    expect(data.walletConnected).toBe(false);
    expect(data.claimable).toBeNull();
  });

  it('returns claimable reward when exists', async () => {
    mockAuthFn.mockResolvedValue(createMockSession());
    mockDb.findUserById.mockResolvedValue(
      createMockUser({ wallet_address: 'TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA' })
    );
    mockDb.getUserClaimedTotal.mockResolvedValue('1000000000');
    mockDb.getUserUnclaimedTotal.mockResolvedValue('500000000');
    mockDb.getUserClaimableReward.mockResolvedValue({
      id: 'reward-123',
      amount: '1500000000',
      distribution_id: 'dist-456',
    });

    const response = await GET();
    const { status, data } = await parseResponse<ApiResponse>(response);

    expect(status).toBe(200);
    expect(data.walletConnected).toBe(true);
    expect(data.claimable).toEqual({
      id: 'reward-123',
      amount: '1500000000',
      distributionId: 'dist-456',
    });
    expect(data.claimableTotal).toBe('500000000');
    expect(data.claimedTotal).toBe('1000000000');
  });

  it('returns null claimable when none available', async () => {
    mockAuthFn.mockResolvedValue(createMockSession());
    mockDb.findUserById.mockResolvedValue(
      createMockUser({ wallet_address: 'TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA' })
    );
    mockDb.getUserClaimedTotal.mockResolvedValue('5000000000');
    mockDb.getUserUnclaimedTotal.mockResolvedValue('0');
    mockDb.getUserClaimableReward.mockResolvedValue(null);

    const response = await GET();
    const { status, data } = await parseResponse<ApiResponse>(response);

    expect(status).toBe(200);
    expect(data.walletConnected).toBe(true);
    expect(data.claimable).toBeNull();
    expect(data.claimedTotal).toBe('5000000000');
  });

  // ============================================================
  // Large Amount Tests
  // ============================================================
  it('handles very large YAP amounts (bigint)', async () => {
    mockAuthFn.mockResolvedValue(createMockSession());
    mockDb.findUserById.mockResolvedValue(
      createMockUser({ wallet_address: 'TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA' })
    );
    // ~100 billion YAP (with 9 decimals)
    mockDb.getUserClaimedTotal.mockResolvedValue('100000000000000000000');
    mockDb.getUserUnclaimedTotal.mockResolvedValue('50000000000000000000');
    mockDb.getUserClaimableReward.mockResolvedValue({
      id: 'reward-whale',
      amount: '150000000000000000000',
      distribution_id: 'dist-big',
    });

    const response = await GET();
    const { status, data } = await parseResponse<ApiResponse>(response);

    expect(status).toBe(200);
    expect(data.claimedTotal).toBe('100000000000000000000');
    expect(data.claimableTotal).toBe('50000000000000000000');
    expect(data.claimable.amount).toBe('150000000000000000000');
  });

  // ============================================================
  // New User Tests
  // ============================================================
  it('returns zero totals for new user with wallet', async () => {
    mockAuthFn.mockResolvedValue(createMockSession());
    mockDb.findUserById.mockResolvedValue(
      createMockUser({ wallet_address: 'TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA' })
    );
    mockDb.getUserClaimedTotal.mockResolvedValue('0');
    mockDb.getUserUnclaimedTotal.mockResolvedValue('0');
    mockDb.getUserClaimableReward.mockResolvedValue(null);

    const response = await GET();
    const { status, data } = await parseResponse<ApiResponse>(response);

    expect(status).toBe(200);
    expect(data.walletConnected).toBe(true);
    expect(data.claimedTotal).toBe('0');
    expect(data.claimableTotal).toBe('0');
    expect(data.claimable).toBeNull();
  });

  // ============================================================
  // Error Handling Tests
  // ============================================================
  it('returns 500 on database error fetching claimed total', async () => {
    mockAuthFn.mockResolvedValue(createMockSession());
    mockDb.findUserById.mockResolvedValue(createMockUser());
    mockDb.getUserClaimedTotal.mockRejectedValue(new Error('Database timeout'));

    const response = await GET();
    const { status, data } = await parseResponse<ApiResponse>(response);

    expect(status).toBe(500);
    expect(data.error).toBe('Internal server error');
  });

  it('returns 500 on database error fetching unclaimed total', async () => {
    mockAuthFn.mockResolvedValue(createMockSession());
    mockDb.findUserById.mockResolvedValue(createMockUser());
    mockDb.getUserClaimedTotal.mockResolvedValue('0');
    mockDb.getUserUnclaimedTotal.mockRejectedValue(new Error('Query failed'));

    const response = await GET();
    const { status, data } = await parseResponse<ApiResponse>(response);

    expect(status).toBe(500);
    expect(data.error).toBe('Internal server error');
  });

  it('returns 500 on database error fetching claimable reward', async () => {
    mockAuthFn.mockResolvedValue(createMockSession());
    mockDb.findUserById.mockResolvedValue(createMockUser());
    mockDb.getUserClaimedTotal.mockResolvedValue('0');
    mockDb.getUserUnclaimedTotal.mockResolvedValue('0');
    mockDb.getUserClaimableReward.mockRejectedValue(new Error('Connection lost'));

    const response = await GET();
    const { status, data } = await parseResponse<ApiResponse>(response);

    expect(status).toBe(500);
    expect(data.error).toBe('Internal server error');
  });
});
