import { describe, it, expect, vi, beforeEach } from 'vitest';
import { mockDb, resetDbMocks } from '../../mocks/database';
import { mockAuthFn } from '../../mocks/auth';
import { createMockSession, parseResponse } from '../../fixtures';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type ApiResponse = Record<string, any>;

// Mock dependencies before importing the route
vi.mock('@/auth', () => ({ auth: mockAuthFn }));
vi.mock('@/lib/database', () => ({
  db: mockDb,
  SYSTEM_USER_ID: 'system',
  GAMIFIED_NOTIFICATION_TYPES: ['streak_milestone', 'weekly_summary', 'reward_distributed'],
}));

// Constants for testing
const SYSTEM_USER_ID = 'system';
vi.mock('@/lib/logger', () => ({
  apiLogger: { error: vi.fn(), info: vi.fn(), warn: vi.fn() },
}));

// Import the route handlers after mocks are set up
import { GET, POST } from '@/app/api/notifications/route';

// Helper to create mock notification
interface MockNotificationWithDetails {
  id: string;
  type: string;
  is_read: number;
  created_at: string;
  actor_id: string | null;
  post_id: string | null;
  post_content: string | null;
  vote_power: number | null;
  metadata: string | null;
  title: string | null;
  body: string | null;
}

function createMockNotificationWithDetails(
  overrides: Partial<MockNotificationWithDetails> = {}
): MockNotificationWithDetails {
  return {
    id: 'notif-123',
    type: 'upvote',
    is_read: 0,
    created_at: new Date().toISOString(),
    actor_id: 'user-456',
    post_id: 'post-123',
    post_content: 'Test post content',
    vote_power: 1.5,
    metadata: null,
    title: null,
    body: null,
    ...overrides,
  };
}

describe('GET /api/notifications', () => {
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

  it('returns empty notifications list when user has none', async () => {
    mockAuthFn.mockResolvedValue(createMockSession());
    mockDb.getNotificationsForUser.mockResolvedValue([]);

    const response = await GET();
    const { status, data } = await parseResponse<ApiResponse>(response);

    expect(status).toBe(200);
    expect(data.notifications).toEqual([]);
    // Note: markNotificationsAsRead is now called via POST, not GET
    expect(mockDb.markNotificationsAsRead).not.toHaveBeenCalled();
  });

  it('returns notifications with correct transformation', async () => {
    mockAuthFn.mockResolvedValue(createMockSession());
    mockDb.getNotificationsForUser.mockResolvedValue([
      createMockNotificationWithDetails({
        type: 'upvote',
        vote_power: 2.0,
      }),
    ]);

    const response = await GET();
    const { status, data } = await parseResponse<ApiResponse>(response);

    expect(status).toBe(200);
    expect(data.notifications).toHaveLength(1);
    expect(data.notifications[0]).toMatchObject({
      id: 'notif-123',
      type: 'upvote',
      read: false,
      vote_power: 2.0,
      isSystem: false,
    });
    expect(data.notifications[0].post).toMatchObject({
      id: 'post-123',
      content: 'Test post content',
    });
  });

  it('converts is_read integer to read boolean', async () => {
    mockAuthFn.mockResolvedValue(createMockSession());
    mockDb.getNotificationsForUser.mockResolvedValue([
      createMockNotificationWithDetails({ is_read: 1 }),
    ]);

    const response = await GET();
    const { status, data } = await parseResponse<ApiResponse>(response);

    expect(status).toBe(200);
    expect(data.notifications[0].read).toBe(true);
  });

  it('excludes vote_power for non-upvote notifications', async () => {
    mockAuthFn.mockResolvedValue(createMockSession());
    mockDb.getNotificationsForUser.mockResolvedValue([
      createMockNotificationWithDetails({
        type: 'comment',
        vote_power: 1.5, // Should be ignored
      }),
    ]);

    const response = await GET();
    const { status, data } = await parseResponse<ApiResponse>(response);

    expect(status).toBe(200);
    expect(data.notifications[0].vote_power).toBeUndefined();
  });

  it('excludes post object when post_id is null', async () => {
    mockAuthFn.mockResolvedValue(createMockSession());
    mockDb.getNotificationsForUser.mockResolvedValue([
      createMockNotificationWithDetails({
        type: 'follow',
        post_id: null,
        post_content: null,
      }),
    ]);

    const response = await GET();
    const { status, data } = await parseResponse<ApiResponse>(response);

    expect(status).toBe(200);
    expect(data.notifications[0].post).toBeUndefined();
  });

  it('marks system notifications with isSystem flag', async () => {
    mockAuthFn.mockResolvedValue(createMockSession());
    mockDb.getNotificationsForUser.mockResolvedValue([
      createMockNotificationWithDetails({
        type: 'streak_milestone',
        actor_id: SYSTEM_USER_ID,
        metadata: JSON.stringify({ milestone: 7 }),
      }),
    ]);

    const response = await GET();
    const { status, data } = await parseResponse<ApiResponse>(response);

    expect(status).toBe(200);
    expect(data.notifications[0].isSystem).toBe(true);
    expect(data.notifications[0].metadata).toEqual({ milestone: 7 });
  });

  it('handles invalid metadata JSON gracefully', async () => {
    mockAuthFn.mockResolvedValue(createMockSession());
    mockDb.getNotificationsForUser.mockResolvedValue([
      createMockNotificationWithDetails({
        type: 'streak_milestone',
        actor_id: SYSTEM_USER_ID,
        metadata: 'invalid-json',
      }),
    ]);

    const response = await GET();
    const { status, data } = await parseResponse<ApiResponse>(response);

    expect(status).toBe(200);
    expect(data.notifications[0].metadata).toBeUndefined();
  });

  it('does not mark notifications as read on GET', async () => {
    mockAuthFn.mockResolvedValue(createMockSession());
    mockDb.getNotificationsForUser.mockResolvedValue([createMockNotificationWithDetails()]);

    await GET();

    expect(mockDb.markNotificationsAsRead).not.toHaveBeenCalled();
  });

  it('handles database errors gracefully', async () => {
    mockAuthFn.mockResolvedValue(createMockSession());
    mockDb.getNotificationsForUser.mockRejectedValue(new Error('DB error'));

    const response = await GET();
    const { status, data } = await parseResponse<ApiResponse>(response);

    expect(status).toBe(500);
    expect(data.error).toBe('Failed to fetch notifications');
  });
});

describe('POST /api/notifications', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    resetDbMocks();
  });

  it('returns 401 when not authenticated', async () => {
    mockAuthFn.mockResolvedValue(null);

    const response = await POST();
    const { status, data } = await parseResponse<ApiResponse>(response);

    expect(status).toBe(401);
    expect(data.error).toBe('Unauthorized');
  });

  it('marks all notifications as read', async () => {
    mockAuthFn.mockResolvedValue(createMockSession());

    const response = await POST();
    const { status, data } = await parseResponse<ApiResponse>(response);

    expect(status).toBe(200);
    expect(data.success).toBe(true);
    expect(mockDb.markNotificationsAsRead).toHaveBeenCalledWith('user-123');
  });

  it('handles database errors gracefully', async () => {
    mockAuthFn.mockResolvedValue(createMockSession());
    mockDb.markNotificationsAsRead.mockRejectedValue(new Error('DB error'));

    const response = await POST();
    const { status, data } = await parseResponse<ApiResponse>(response);

    expect(status).toBe(500);
    expect(data.error).toBe('Failed to mark notifications as read');
  });
});
