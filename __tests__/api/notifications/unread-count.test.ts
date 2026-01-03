import { describe, it, expect, vi, beforeEach } from 'vitest';
import { mockDb, resetDbMocks } from '../../mocks/database';
import { mockAuthFn } from '../../mocks/auth';
import { createMockSession, parseResponse } from '../../fixtures';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type ApiResponse = Record<string, any>;

// Mock dependencies before importing the route
vi.mock('@/auth', () => ({ auth: mockAuthFn }));
vi.mock('@/lib/database', () => ({ db: mockDb }));

// Import the route handler after mocks are set up
import { GET } from '@/app/api/notifications/unread-count/route';

describe('GET /api/notifications/unread-count', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    resetDbMocks();
  });

  it('returns 0 when not authenticated', async () => {
    mockAuthFn.mockResolvedValue(null);

    const response = await GET();
    const { status, data } = await parseResponse<ApiResponse>(response);

    expect(status).toBe(200);
    expect(data.count).toBe(0);
  });

  it('returns 0 when user has no unread notifications', async () => {
    mockAuthFn.mockResolvedValue(createMockSession());
    mockDb.getUnreadNotificationCount.mockResolvedValue(0);

    const response = await GET();
    const { status, data } = await parseResponse<ApiResponse>(response);

    expect(status).toBe(200);
    expect(data.count).toBe(0);
    expect(mockDb.getUnreadNotificationCount).toHaveBeenCalledWith('user-123');
  });

  it('returns correct count when user has unread notifications', async () => {
    mockAuthFn.mockResolvedValue(createMockSession());
    mockDb.getUnreadNotificationCount.mockResolvedValue(5);

    const response = await GET();
    const { status, data } = await parseResponse<ApiResponse>(response);

    expect(status).toBe(200);
    expect(data.count).toBe(5);
  });

  it('handles database errors gracefully by returning 0', async () => {
    mockAuthFn.mockResolvedValue(createMockSession());
    mockDb.getUnreadNotificationCount.mockRejectedValue(new Error('DB error'));

    const response = await GET();
    const { status, data } = await parseResponse<ApiResponse>(response);

    expect(status).toBe(200);
    expect(data.count).toBe(0);
  });
});
