import { describe, it, expect, vi, beforeEach } from 'vitest';
import { mockAuthFn, createMockSession } from '../../mocks/auth';
import { mockDb, resetDbMocks } from '../../mocks/database';
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
import { GET } from '@/app/api/rewards/history/route';

describe('GET /api/rewards/history', () => {
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

  it('returns empty history for new user', async () => {
    mockAuthFn.mockResolvedValue(createMockSession());
    mockDb.getUserRewards.mockResolvedValue([]);
    mockDb.getUserClaimEvents.mockResolvedValue([]);

    const response = await GET();
    const { status, data } = await parseResponse<ApiResponse>(response);

    expect(status).toBe(200);
    expect(data.distributions).toEqual([]);
    expect(data.claims).toEqual([]);
  });

  it('returns distributions with correct mapping', async () => {
    mockAuthFn.mockResolvedValue(createMockSession());
    // Note: DB returns amounts as strings (bigint serialization)
    mockDb.getUserRewards.mockResolvedValue([
      {
        id: 'reward-1',
        amount: '1000000000', // 1 YAP cumulative
        amount_earned: '1000000000', // 1 YAP earned this period
        points_converted: 100,
        created_at: '2024-01-01T00:00:00Z',
      },
      {
        id: 'reward-2',
        amount: '2500000000', // 2.5 YAP cumulative
        amount_earned: '1500000000', // 1.5 YAP earned this period
        points_converted: 150,
        created_at: '2024-01-02T00:00:00Z',
      },
    ]);
    mockDb.getUserClaimEvents.mockResolvedValue([]);

    const response = await GET();
    const { status, data } = await parseResponse<ApiResponse>(response);

    expect(status).toBe(200);
    expect(data.distributions).toHaveLength(2);

    // First distribution
    expect(data.distributions[0].id).toBe('reward-1');
    expect(data.distributions[0].amountEarned).toBe('1000000000');
    expect(data.distributions[0].cumulativeAmount).toBe('1000000000');
    expect(data.distributions[0].pointsConverted).toBe(100);

    // Second distribution
    expect(data.distributions[1].id).toBe('reward-2');
    expect(data.distributions[1].amountEarned).toBe('1500000000');
    expect(data.distributions[1].cumulativeAmount).toBe('2500000000');
    expect(data.distributions[1].pointsConverted).toBe(150);
  });

  it('returns claims from claim_events', async () => {
    mockAuthFn.mockResolvedValue(createMockSession());
    mockDb.getUserRewards.mockResolvedValue([
      {
        id: 'reward-1',
        amount: '5000000000',
        amount_earned: '5000000000',
        points_converted: 500,
        created_at: '2024-01-15T00:00:00Z',
      },
    ]);
    mockDb.getUserClaimEvents.mockResolvedValue([
      {
        id: 'claim-1',
        amount_claimed: '5000000000',
        cumulative_claimed: '5000000000',
        tx_signature: '5KtP9UBw3c8LWQxmVhJqRcZoYHJz7nDhgJhvPGrKpLfVxUMbAcDFGv1234567890abcdefghij',
        claimed_at: '2024-01-15T12:00:00Z',
      },
    ]);

    const response = await GET();
    const { status, data } = await parseResponse<ApiResponse>(response);

    expect(status).toBe(200);

    // Check distribution
    expect(data.distributions).toHaveLength(1);
    expect(data.distributions[0].amountEarned).toBe('5000000000');

    // Check claim
    expect(data.claims).toHaveLength(1);
    expect(data.claims[0].amountClaimed).toBe('5000000000');
    expect(data.claims[0].cumulativeClaimed).toBe('5000000000');
    expect(data.claims[0].txSignature).toBe(
      '5KtP9UBw3c8LWQxmVhJqRcZoYHJz7nDhgJhvPGrKpLfVxUMbAcDFGv1234567890abcdefghij'
    );
    expect(data.claims[0].claimedAt).toBe('2024-01-15T12:00:00Z');
  });

  it('handles distributions with no amount_earned (legacy)', async () => {
    mockAuthFn.mockResolvedValue(createMockSession());
    // Legacy record without amount_earned
    mockDb.getUserRewards.mockResolvedValue([
      {
        id: 'legacy-reward',
        amount: '1000000000',
        amount_earned: null, // Not backfilled yet
        points_converted: 100,
        created_at: '2024-01-01T00:00:00Z',
      },
    ]);
    mockDb.getUserClaimEvents.mockResolvedValue([]);

    const response = await GET();
    const { status, data } = await parseResponse<ApiResponse>(response);

    expect(status).toBe(200);
    expect(data.distributions[0].amountEarned).toBe('0'); // Falls back to '0'
  });

  // ============================================================
  // Multiple Claims Tests
  // ============================================================
  it('returns multiple claims in chronological order', async () => {
    mockAuthFn.mockResolvedValue(createMockSession());
    mockDb.getUserRewards.mockResolvedValue([
      {
        id: 'reward-1',
        amount: '10000000000',
        amount_earned: '10000000000',
        points_converted: 1000,
        created_at: '2024-01-01T00:00:00Z',
      },
    ]);
    mockDb.getUserClaimEvents.mockResolvedValue([
      {
        id: 'claim-1',
        amount_claimed: '3000000000',
        cumulative_claimed: '3000000000',
        tx_signature: 'sig1'.repeat(22),
        claimed_at: '2024-01-02T00:00:00Z',
      },
      {
        id: 'claim-2',
        amount_claimed: '4000000000',
        cumulative_claimed: '7000000000',
        tx_signature: 'sig2'.repeat(22),
        claimed_at: '2024-01-03T00:00:00Z',
      },
      {
        id: 'claim-3',
        amount_claimed: '3000000000',
        cumulative_claimed: '10000000000',
        tx_signature: 'sig3'.repeat(22),
        claimed_at: '2024-01-04T00:00:00Z',
      },
    ]);

    const response = await GET();
    const { status, data } = await parseResponse<ApiResponse>(response);

    expect(status).toBe(200);
    expect(data.claims).toHaveLength(3);
    expect(data.claims[0].amountClaimed).toBe('3000000000');
    expect(data.claims[1].amountClaimed).toBe('4000000000');
    expect(data.claims[2].amountClaimed).toBe('3000000000');
    // Total claimed equals distribution
    expect(data.claims[2].cumulativeClaimed).toBe('10000000000');
  });

  it('handles multiple distributions with partial claims', async () => {
    mockAuthFn.mockResolvedValue(createMockSession());
    mockDb.getUserRewards.mockResolvedValue([
      {
        id: 'dist-1',
        amount: '5000000000',
        amount_earned: '5000000000',
        points_converted: 500,
        created_at: '2024-01-01T00:00:00Z',
      },
      {
        id: 'dist-2',
        amount: '15000000000',
        amount_earned: '10000000000',
        points_converted: 1000,
        created_at: '2024-01-08T00:00:00Z',
      },
    ]);
    mockDb.getUserClaimEvents.mockResolvedValue([
      {
        id: 'claim-1',
        amount_claimed: '5000000000',
        cumulative_claimed: '5000000000',
        tx_signature: 'claim1sig'.repeat(9),
        claimed_at: '2024-01-05T00:00:00Z',
      },
    ]);

    const response = await GET();
    const { status, data } = await parseResponse<ApiResponse>(response);

    expect(status).toBe(200);
    expect(data.distributions).toHaveLength(2);
    expect(data.claims).toHaveLength(1);
    // User has 15B total distributed, 5B claimed, 10B unclaimed
  });

  // ============================================================
  // Error Handling Tests
  // ============================================================
  it('returns 500 on database error fetching rewards', async () => {
    mockAuthFn.mockResolvedValue(createMockSession());
    mockDb.getUserRewards.mockRejectedValue(new Error('DB connection failed'));

    const response = await GET();
    const { status, data } = await parseResponse<ApiResponse>(response);

    expect(status).toBe(500);
    expect(data.error).toBe('Internal server error');
  });

  it('returns 500 on database error fetching claims', async () => {
    mockAuthFn.mockResolvedValue(createMockSession());
    mockDb.getUserRewards.mockResolvedValue([]);
    mockDb.getUserClaimEvents.mockRejectedValue(new Error('DB timeout'));

    const response = await GET();
    const { status, data } = await parseResponse<ApiResponse>(response);

    expect(status).toBe(500);
    expect(data.error).toBe('Internal server error');
  });

  // ============================================================
  // Large Amount Tests
  // ============================================================
  it('handles very large YAP amounts (bigint)', async () => {
    mockAuthFn.mockResolvedValue(createMockSession());
    mockDb.getUserRewards.mockResolvedValue([
      {
        id: 'big-reward',
        amount: '999999999999999999', // ~1 billion YAP
        amount_earned: '999999999999999999',
        points_converted: 99999999,
        created_at: '2024-01-01T00:00:00Z',
      },
    ]);
    mockDb.getUserClaimEvents.mockResolvedValue([
      {
        id: 'big-claim',
        amount_claimed: '999999999999999999',
        cumulative_claimed: '999999999999999999',
        tx_signature: 'bigclaim'.repeat(11),
        claimed_at: '2024-01-02T00:00:00Z',
      },
    ]);

    const response = await GET();
    const { status, data } = await parseResponse<ApiResponse>(response);

    expect(status).toBe(200);
    expect(data.distributions[0].amountEarned).toBe('999999999999999999');
    expect(data.claims[0].amountClaimed).toBe('999999999999999999');
  });

  // ============================================================
  // Timestamp Tests
  // ============================================================
  it('includes distributedAt timestamp in distributions', async () => {
    mockAuthFn.mockResolvedValue(createMockSession());
    const timestamp = '2024-03-15T10:30:00Z';
    mockDb.getUserRewards.mockResolvedValue([
      {
        id: 'reward-with-time',
        amount: '1000000000',
        amount_earned: '1000000000',
        points_converted: 100,
        created_at: timestamp,
      },
    ]);
    mockDb.getUserClaimEvents.mockResolvedValue([]);

    const response = await GET();
    const { status, data } = await parseResponse<ApiResponse>(response);

    expect(status).toBe(200);
    expect(data.distributions[0].distributedAt).toBe(timestamp);
  });

  it('includes claimedAt timestamp in claims', async () => {
    mockAuthFn.mockResolvedValue(createMockSession());
    const claimTimestamp = '2024-03-16T14:45:30Z';
    mockDb.getUserRewards.mockResolvedValue([]);
    mockDb.getUserClaimEvents.mockResolvedValue([
      {
        id: 'claim-with-time',
        amount_claimed: '1000000000',
        cumulative_claimed: '1000000000',
        tx_signature: 'timeclaim'.repeat(10),
        claimed_at: claimTimestamp,
      },
    ]);

    const response = await GET();
    const { status, data } = await parseResponse<ApiResponse>(response);

    expect(status).toBe(200);
    expect(data.claims[0].claimedAt).toBe(claimTimestamp);
  });

  // ============================================================
  // Field Mapping Tests
  // ============================================================
  it('maps all distribution fields correctly', async () => {
    mockAuthFn.mockResolvedValue(createMockSession());
    mockDb.getUserRewards.mockResolvedValue([
      {
        id: 'complete-dist',
        amount: '50000000000',
        amount_earned: '25000000000',
        points_converted: 2500,
        created_at: '2024-06-01T00:00:00Z',
      },
    ]);
    mockDb.getUserClaimEvents.mockResolvedValue([]);

    const response = await GET();
    const { status, data } = await parseResponse<ApiResponse>(response);

    expect(status).toBe(200);
    const dist = data.distributions[0];
    expect(dist).toEqual({
      id: 'complete-dist',
      amountEarned: '25000000000',
      cumulativeAmount: '50000000000',
      pointsConverted: 2500,
      distributedAt: '2024-06-01T00:00:00Z',
    });
  });

  it('maps all claim fields correctly', async () => {
    mockAuthFn.mockResolvedValue(createMockSession());
    mockDb.getUserRewards.mockResolvedValue([]);
    mockDb.getUserClaimEvents.mockResolvedValue([
      {
        id: 'complete-claim',
        amount_claimed: '15000000000',
        cumulative_claimed: '45000000000',
        tx_signature: 'completesig'.repeat(8),
        claimed_at: '2024-06-15T12:00:00Z',
      },
    ]);

    const response = await GET();
    const { status, data } = await parseResponse<ApiResponse>(response);

    expect(status).toBe(200);
    const claim = data.claims[0];
    expect(claim).toEqual({
      id: 'complete-claim',
      amountClaimed: '15000000000',
      cumulativeClaimed: '45000000000',
      txSignature: 'completesig'.repeat(8),
      claimedAt: '2024-06-15T12:00:00Z',
    });
  });
});
