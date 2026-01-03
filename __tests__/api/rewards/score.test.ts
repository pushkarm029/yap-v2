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
import { GET } from '@/app/api/rewards/score/route';

describe('GET /api/rewards/score', () => {
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

  it('returns correct score for user with points', async () => {
    mockAuthFn.mockResolvedValue(createMockSession());
    mockDb.findUserById.mockResolvedValue(createMockUser({ points: 500 }));
    mockDb.getUserDistributedTotal.mockResolvedValue(200);
    mockDb.getVoteWeight.mockResolvedValue(1.0);

    const response = await GET();
    const { status, data } = await parseResponse<ApiResponse>(response);

    expect(status).toBe(200);
    expect(data.points).toBe(500);
    expect(data.pending).toBe(300); // 500 - 200
    expect(data.votePower).toBe(1.0);
  });

  it('returns 0 pending when fully distributed', async () => {
    mockAuthFn.mockResolvedValue(createMockSession());
    mockDb.findUserById.mockResolvedValue(createMockUser({ points: 100 }));
    mockDb.getUserDistributedTotal.mockResolvedValue(100);
    mockDb.getVoteWeight.mockResolvedValue(2.5);

    const response = await GET();
    const { status, data } = await parseResponse<ApiResponse>(response);

    expect(status).toBe(200);
    expect(data.points).toBe(100);
    expect(data.pending).toBe(0);
    expect(data.votePower).toBe(2.5);
  });

  it('caps pending at 0 when distributed exceeds points', async () => {
    mockAuthFn.mockResolvedValue(createMockSession());
    mockDb.findUserById.mockResolvedValue(createMockUser({ points: 50 }));
    mockDb.getUserDistributedTotal.mockResolvedValue(100); // More than points
    mockDb.getVoteWeight.mockResolvedValue(1.0);

    const response = await GET();
    const { status, data } = await parseResponse<ApiResponse>(response);

    expect(status).toBe(200);
    expect(data.points).toBe(50);
    expect(data.pending).toBe(0); // max(0, 50 - 100) = 0
    expect(data.votePower).toBe(1.0);
  });

  // ============================================================
  // New User Tests
  // ============================================================
  it('returns 0 points for new user', async () => {
    mockAuthFn.mockResolvedValue(createMockSession());
    mockDb.findUserById.mockResolvedValue(createMockUser({ points: 0 }));
    mockDb.getUserDistributedTotal.mockResolvedValue(0);
    mockDb.getVoteWeight.mockResolvedValue(1.0);

    const response = await GET();
    const { status, data } = await parseResponse<ApiResponse>(response);

    expect(status).toBe(200);
    expect(data.points).toBe(0);
    expect(data.pending).toBe(0);
    expect(data.votePower).toBe(1.0);
  });

  // ============================================================
  // Vote Power Variations
  // ============================================================
  it('returns high vote power for YAP holder', async () => {
    mockAuthFn.mockResolvedValue(createMockSession());
    mockDb.findUserById.mockResolvedValue(createMockUser({ points: 100 }));
    mockDb.getUserDistributedTotal.mockResolvedValue(0);
    mockDb.getVoteWeight.mockResolvedValue(5.5); // Whale with lots of YAP

    const response = await GET();
    const { status, data } = await parseResponse<ApiResponse>(response);

    expect(status).toBe(200);
    expect(data.votePower).toBe(5.5);
  });

  it('returns fractional vote power', async () => {
    mockAuthFn.mockResolvedValue(createMockSession());
    mockDb.findUserById.mockResolvedValue(createMockUser({ points: 100 }));
    mockDb.getUserDistributedTotal.mockResolvedValue(0);
    mockDb.getVoteWeight.mockResolvedValue(1.25);

    const response = await GET();
    const { status, data } = await parseResponse<ApiResponse>(response);

    expect(status).toBe(200);
    expect(data.votePower).toBe(1.25);
  });

  // ============================================================
  // Large Point Values
  // ============================================================
  it('handles very large point values', async () => {
    mockAuthFn.mockResolvedValue(createMockSession());
    mockDb.findUserById.mockResolvedValue(createMockUser({ points: 999999999 }));
    mockDb.getUserDistributedTotal.mockResolvedValue(500000000);
    mockDb.getVoteWeight.mockResolvedValue(10.0);

    const response = await GET();
    const { status, data } = await parseResponse<ApiResponse>(response);

    expect(status).toBe(200);
    expect(data.points).toBe(999999999);
    expect(data.pending).toBe(499999999);
  });

  // ============================================================
  // Error Handling Tests
  // ============================================================
  it('returns 500 on database error fetching user', async () => {
    mockAuthFn.mockResolvedValue(createMockSession());
    mockDb.findUserById.mockRejectedValue(new Error('DB connection failed'));

    const response = await GET();
    const { status, data } = await parseResponse<ApiResponse>(response);

    expect(status).toBe(500);
    expect(data.error).toBe('Internal server error');
  });

  it('returns 500 on database error fetching distributed total', async () => {
    mockAuthFn.mockResolvedValue(createMockSession());
    mockDb.findUserById.mockResolvedValue(createMockUser({ points: 100 }));
    mockDb.getUserDistributedTotal.mockRejectedValue(new Error('Query timeout'));

    const response = await GET();
    const { status, data } = await parseResponse<ApiResponse>(response);

    expect(status).toBe(500);
    expect(data.error).toBe('Internal server error');
  });

  it('returns 500 on database error fetching vote weight', async () => {
    mockAuthFn.mockResolvedValue(createMockSession());
    mockDb.findUserById.mockResolvedValue(createMockUser({ points: 100 }));
    mockDb.getUserDistributedTotal.mockResolvedValue(50);
    mockDb.getVoteWeight.mockRejectedValue(new Error('Snapshot table locked'));

    const response = await GET();
    const { status, data } = await parseResponse<ApiResponse>(response);

    expect(status).toBe(500);
    expect(data.error).toBe('Internal server error');
  });
});
