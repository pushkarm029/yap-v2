import { describe, it, expect, vi, beforeEach } from 'vitest';
import { mockDb, resetDbMocks } from '../../mocks/database';
import { mockAuthFn } from '../../mocks/auth';
import { createMockSession, createMockUser, parseResponse } from '../../fixtures';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type ApiResponse = Record<string, any>;

// Mock dependencies before importing the route
vi.mock('@/auth', () => ({ auth: mockAuthFn }));
vi.mock('@/lib/database', () => ({ db: mockDb }));
vi.mock('@/lib/logger', () => {
  const createMockLogger = () => ({
    error: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    debug: vi.fn(),
    child: () => createMockLogger(),
  });
  return { apiLogger: createMockLogger() };
});
vi.mock('@/lib/services/notifications', () => ({
  sendSocialNotification: vi.fn().mockResolvedValue(undefined),
}));

// Import the route handler after mocks are set up
import { POST, DELETE } from '@/app/api/users/[username]/follow/route';

// Helper to create mock params
function createParamsPromise(username: string) {
  return Promise.resolve({ username });
}

describe('POST /api/users/[username]/follow', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    resetDbMocks();
  });

  it('returns 401 when not authenticated', async () => {
    mockAuthFn.mockResolvedValue(null);

    const request = new Request('http://localhost/api/users/testuser/follow', {
      method: 'POST',
    });
    const response = await POST(request as never, { params: createParamsPromise('testuser') });
    const { status, data } = await parseResponse<ApiResponse>(response);

    expect(status).toBe(401);
    expect(data.error).toBe('Unauthorized');
  });

  it('returns 404 when user not found', async () => {
    mockAuthFn.mockResolvedValue(createMockSession());
    mockDb.findUserByUsername.mockResolvedValue(null);

    const request = new Request('http://localhost/api/users/nonexistent/follow', {
      method: 'POST',
    });
    const response = await POST(request as never, { params: createParamsPromise('nonexistent') });
    const { status, data } = await parseResponse<ApiResponse>(response);

    expect(status).toBe(404);
    expect(data.error).toBe('User not found');
  });

  it('returns 400 when trying to follow yourself', async () => {
    mockAuthFn.mockResolvedValue(createMockSession());
    mockDb.findUserByUsername.mockResolvedValue(createMockUser({ id: 'user-123' })); // Same as session

    const request = new Request('http://localhost/api/users/testuser/follow', {
      method: 'POST',
    });
    const response = await POST(request as never, { params: createParamsPromise('testuser') });
    const { status, data } = await parseResponse<ApiResponse>(response);

    expect(status).toBe(400);
    expect(data.error).toBe('Cannot follow yourself');
  });

  it('returns 400 when already following', async () => {
    mockAuthFn.mockResolvedValue(createMockSession());
    mockDb.findUserByUsername.mockResolvedValue(createMockUser({ id: 'other-user' }));
    mockDb.isFollowing.mockResolvedValue(true);

    const request = new Request('http://localhost/api/users/otheruser/follow', {
      method: 'POST',
    });
    const response = await POST(request as never, { params: createParamsPromise('otheruser') });
    const { status, data } = await parseResponse<ApiResponse>(response);

    expect(status).toBe(400);
    expect(data.error).toBe('Already following');
  });

  it('follows user successfully', async () => {
    mockAuthFn.mockResolvedValue(createMockSession());
    mockDb.findUserByUsername.mockResolvedValue(
      createMockUser({ id: 'other-user', username: 'otheruser' })
    );
    mockDb.isFollowing.mockResolvedValue(false);
    mockDb.followUser.mockResolvedValue(undefined);
    mockDb.getFollowerCount.mockResolvedValue(10);

    const request = new Request('http://localhost/api/users/otheruser/follow', {
      method: 'POST',
    });
    const response = await POST(request as never, { params: createParamsPromise('otheruser') });
    const { status, data } = await parseResponse<ApiResponse>(response);

    expect(status).toBe(200);
    expect(data.following).toBe(true);
    expect(data.followerCount).toBe(10);
    expect(mockDb.followUser).toHaveBeenCalledWith('user-123', 'other-user');
  });

  it('sends notification when following', async () => {
    mockAuthFn.mockResolvedValue(createMockSession());
    mockDb.findUserByUsername.mockResolvedValue(createMockUser({ id: 'other-user' }));
    mockDb.isFollowing.mockResolvedValue(false);
    mockDb.followUser.mockResolvedValue(undefined);
    mockDb.getFollowerCount.mockResolvedValue(5);

    const { sendSocialNotification } = await import('@/lib/services/notifications');

    const request = new Request('http://localhost/api/users/otheruser/follow', {
      method: 'POST',
    });
    await POST(request as never, { params: createParamsPromise('otheruser') });

    expect(sendSocialNotification).toHaveBeenCalledWith({
      type: 'follow',
      recipientId: 'other-user',
      actorId: 'user-123',
    });
  });

  it('handles database errors gracefully', async () => {
    mockAuthFn.mockResolvedValue(createMockSession());
    mockDb.findUserByUsername.mockRejectedValue(new Error('DB error'));

    const request = new Request('http://localhost/api/users/testuser/follow', {
      method: 'POST',
    });
    const response = await POST(request as never, { params: createParamsPromise('testuser') });
    const { status, data } = await parseResponse<ApiResponse>(response);

    expect(status).toBe(500);
    expect(data.error).toBe('Failed to follow user');
  });
});

describe('DELETE /api/users/[username]/follow', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    resetDbMocks();
  });

  it('returns 401 when not authenticated', async () => {
    mockAuthFn.mockResolvedValue(null);

    const request = new Request('http://localhost/api/users/testuser/follow', {
      method: 'DELETE',
    });
    const response = await DELETE(request as never, { params: createParamsPromise('testuser') });
    const { status, data } = await parseResponse<ApiResponse>(response);

    expect(status).toBe(401);
    expect(data.error).toBe('Unauthorized');
  });

  it('returns 404 when user not found', async () => {
    mockAuthFn.mockResolvedValue(createMockSession());
    mockDb.findUserByUsername.mockResolvedValue(null);

    const request = new Request('http://localhost/api/users/nonexistent/follow', {
      method: 'DELETE',
    });
    const response = await DELETE(request as never, { params: createParamsPromise('nonexistent') });
    const { status, data } = await parseResponse<ApiResponse>(response);

    expect(status).toBe(404);
    expect(data.error).toBe('User not found');
  });

  it('unfollows user successfully', async () => {
    mockAuthFn.mockResolvedValue(createMockSession());
    mockDb.findUserByUsername.mockResolvedValue(createMockUser({ id: 'other-user' }));
    mockDb.unfollowUser.mockResolvedValue(undefined);
    mockDb.getFollowerCount.mockResolvedValue(9);

    const request = new Request('http://localhost/api/users/otheruser/follow', {
      method: 'DELETE',
    });
    const response = await DELETE(request as never, { params: createParamsPromise('otheruser') });
    const { status, data } = await parseResponse<ApiResponse>(response);

    expect(status).toBe(200);
    expect(data.following).toBe(false);
    expect(data.followerCount).toBe(9);
    expect(mockDb.unfollowUser).toHaveBeenCalledWith('user-123', 'other-user');
  });

  it('handles database errors gracefully', async () => {
    mockAuthFn.mockResolvedValue(createMockSession());
    mockDb.findUserByUsername.mockRejectedValue(new Error('DB error'));

    const request = new Request('http://localhost/api/users/testuser/follow', {
      method: 'DELETE',
    });
    const response = await DELETE(request as never, { params: createParamsPromise('testuser') });
    const { status, data } = await parseResponse<ApiResponse>(response);

    expect(status).toBe(500);
    expect(data.error).toBe('Failed to unfollow user');
  });
});
