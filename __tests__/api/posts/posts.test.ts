import { describe, it, expect, vi, beforeEach } from 'vitest';
import { mockDb, resetDbMocks } from '../../mocks/database';
import { mockAuthFn } from '../../mocks/auth';
import {
  createMockSession,
  createUninvitedSession,
  createMockUser,
  createMockPost,
  createMockPostWithAuthor,
  createMockActionLimit,
  createMockRequest,
  parseResponse,
} from '../../fixtures';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type ApiResponse = Record<string, any>;

// Mock dependencies before importing the route
vi.mock('@/auth', () => ({ auth: mockAuthFn }));
vi.mock('@/lib/database', () => ({
  db: mockDb,
  findUserById: mockDb.findUserById,
}));
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
vi.mock('@/lib/utils/image', () => ({
  verifyImageOwnership: vi.fn().mockReturnValue(true),
}));
vi.mock('@/lib/services/notifications', () => ({
  sendSocialNotification: vi.fn().mockResolvedValue(undefined),
}));
vi.mock('@/lib/services/realTimeNotifications', () => ({
  checkStreakMilestone: vi.fn().mockResolvedValue(undefined),
  triggerDailyGoal: vi.fn().mockResolvedValue(undefined),
}));

// Import the route handler after mocks are set up
import { GET, POST } from '@/app/api/posts/route';

describe('GET /api/posts', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    resetDbMocks();
  });

  it('returns posts for unauthenticated users', async () => {
    mockAuthFn.mockResolvedValue(null);
    const posts = [createMockPostWithAuthor()];
    mockDb.getAllPostsWithUpvotes.mockResolvedValue(posts);

    const request = createMockRequest('http://localhost/api/posts');
    const response = await GET(request as never);
    const { status, data } = await parseResponse<ApiResponse>(response);

    expect(status).toBe(200);
    expect(data).toEqual(posts);
  });

  it('returns paginated posts when limit param is provided', async () => {
    mockAuthFn.mockResolvedValue(createMockSession());
    const posts = [createMockPostWithAuthor()];
    mockDb.getPaginatedPosts.mockResolvedValue({
      posts,
      nextCursor: 'next-cursor-123',
    });

    const request = createMockRequest('http://localhost/api/posts?limit=20');
    const response = await GET(request as never);
    const { status, data } = await parseResponse<ApiResponse>(response);

    expect(status).toBe(200);
    expect(data.posts).toEqual(posts);
    expect(data.nextCursor).toBe('next-cursor-123');
    expect(mockDb.getPaginatedPosts).toHaveBeenCalledWith('user-123', undefined, 20);
  });

  it('uses cursor for pagination', async () => {
    mockAuthFn.mockResolvedValue(createMockSession());
    mockDb.getPaginatedPosts.mockResolvedValue({
      posts: [],
      nextCursor: null,
    });

    const request = createMockRequest('http://localhost/api/posts?cursor=abc123&limit=10');
    const response = await GET(request as never);
    const { status } = await parseResponse<ApiResponse>(response);

    expect(status).toBe(200);
    expect(mockDb.getPaginatedPosts).toHaveBeenCalledWith('user-123', 'abc123', 10);
  });

  it('caps limit at maximum of 50', async () => {
    mockAuthFn.mockResolvedValue(createMockSession());
    mockDb.getPaginatedPosts.mockResolvedValue({ posts: [], nextCursor: null });

    const request = createMockRequest('http://localhost/api/posts?limit=100');
    const response = await GET(request as never);

    expect(response.status).toBe(200);
    expect(mockDb.getPaginatedPosts).toHaveBeenCalledWith('user-123', undefined, 50);
  });

  it('handles database errors gracefully', async () => {
    mockAuthFn.mockResolvedValue(null);
    mockDb.getAllPostsWithUpvotes.mockRejectedValue(new Error('DB error'));

    const request = createMockRequest('http://localhost/api/posts');
    const response = await GET(request as never);
    const { status, data } = await parseResponse<ApiResponse>(response);

    expect(status).toBe(500);
    expect(data.error).toBe('Failed to fetch posts');
  });
});

describe('POST /api/posts', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    resetDbMocks();
  });

  it('returns 401 when not authenticated', async () => {
    mockAuthFn.mockResolvedValue(null);

    const request = createMockRequest('http://localhost/api/posts', {
      method: 'POST',
      body: { content: 'Hello world' },
    });
    const response = await POST(request as never);
    const { status, data } = await parseResponse<ApiResponse>(response);

    expect(status).toBe(401);
    expect(data.error).toBe('Unauthorized');
  });

  it('returns 403 when user not invited', async () => {
    mockAuthFn.mockResolvedValue(createUninvitedSession());

    const request = createMockRequest('http://localhost/api/posts', {
      method: 'POST',
      body: { content: 'Hello world' },
    });
    const response = await POST(request as never);
    const { status, data } = await parseResponse<ApiResponse>(response);

    expect(status).toBe(403);
    expect(data.error).toBe('INVITE_REQUIRED');
  });

  it('returns 404 when user not found in database', async () => {
    mockAuthFn.mockResolvedValue(createMockSession());
    mockDb.findUserById.mockResolvedValue(null);

    const request = createMockRequest('http://localhost/api/posts', {
      method: 'POST',
      body: { content: 'Hello world' },
    });
    const response = await POST(request as never);
    const { status, data } = await parseResponse<ApiResponse>(response);

    expect(status).toBe(404);
    expect(data.error).toContain('User not found');
  });

  it('returns 429 when daily limit reached', async () => {
    mockAuthFn.mockResolvedValue(createMockSession());
    mockDb.findUserById.mockResolvedValue(createMockUser());
    mockDb.checkTotalDailyLimit.mockResolvedValue(
      createMockActionLimit({ remaining: 0, used: 50 })
    );

    const request = createMockRequest('http://localhost/api/posts', {
      method: 'POST',
      body: { content: 'Hello world' },
    });
    const response = await POST(request as never);
    const { status, data } = await parseResponse<ApiResponse>(response);

    expect(status).toBe(429);
    expect(data.error).toBe('Daily action limit reached');
  });

  it('returns 400 when content is empty', async () => {
    mockAuthFn.mockResolvedValue(createMockSession());
    mockDb.findUserById.mockResolvedValue(createMockUser());
    mockDb.checkTotalDailyLimit.mockResolvedValue(createMockActionLimit());

    const request = createMockRequest('http://localhost/api/posts', {
      method: 'POST',
      body: { content: '   ' },
    });
    const response = await POST(request as never);
    const { status, data } = await parseResponse<ApiResponse>(response);

    expect(status).toBe(400);
    expect(data.error).toBe('Content is required');
  });

  it('returns 400 when content exceeds 280 characters', async () => {
    mockAuthFn.mockResolvedValue(createMockSession());
    mockDb.findUserById.mockResolvedValue(createMockUser());
    mockDb.checkTotalDailyLimit.mockResolvedValue(createMockActionLimit());

    const longContent = 'a'.repeat(281);
    const request = createMockRequest('http://localhost/api/posts', {
      method: 'POST',
      body: { content: longContent },
    });
    const response = await POST(request as never);
    const { status, data } = await parseResponse<ApiResponse>(response);

    expect(status).toBe(400);
    expect(data.error).toContain('too long');
  });

  it('creates post successfully', async () => {
    mockAuthFn.mockResolvedValue(createMockSession());
    mockDb.findUserById.mockResolvedValue(createMockUser());
    mockDb.checkTotalDailyLimit.mockResolvedValue(createMockActionLimit({ remaining: 45 }));
    mockDb.extractMentions.mockReturnValue([]);
    mockDb.validateUsernames.mockResolvedValue([]);
    mockDb.createPost.mockResolvedValue(createMockPost({ content: 'Hello world' }));
    mockDb.updateStreak.mockResolvedValue({ updated: false });

    const request = createMockRequest('http://localhost/api/posts', {
      method: 'POST',
      body: { content: 'Hello world' },
    });
    const response = await POST(request as never);
    const { status, data } = await parseResponse<ApiResponse>(response);

    expect(status).toBe(200);
    expect(data.content).toBe('Hello world');
    expect(data.remaining).toBe(44); // 45 - 1
    expect(mockDb.createPost).toHaveBeenCalledWith('Hello world', 'user-123', undefined);
  });

  it('creates post with image_url', async () => {
    mockAuthFn.mockResolvedValue(createMockSession());
    mockDb.findUserById.mockResolvedValue(createMockUser());
    mockDb.checkTotalDailyLimit.mockResolvedValue(createMockActionLimit());
    mockDb.extractMentions.mockReturnValue([]);
    mockDb.validateUsernames.mockResolvedValue([]);
    mockDb.createPost.mockResolvedValue(
      createMockPost({ image_url: 'https://example.com/image.jpg' })
    );
    mockDb.updateStreak.mockResolvedValue({ updated: false });

    const request = createMockRequest('http://localhost/api/posts', {
      method: 'POST',
      body: { content: 'Check this out!', image_url: 'https://example.com/image.jpg' },
    });
    const response = await POST(request as never);
    const { status, data } = await parseResponse<ApiResponse>(response);

    expect(status).toBe(200);
    expect(mockDb.createPost).toHaveBeenCalledWith(
      'Check this out!',
      'user-123',
      'https://example.com/image.jpg'
    );
    expect(data.image_url).toBe('https://example.com/image.jpg');
  });

  it('handles mentions in post content', async () => {
    const mentionedUser = createMockUser({ id: 'mentioned-user', username: 'mentioned' });

    mockAuthFn.mockResolvedValue(createMockSession());
    mockDb.findUserById.mockResolvedValue(createMockUser());
    mockDb.checkTotalDailyLimit.mockResolvedValue(createMockActionLimit());
    mockDb.extractMentions.mockReturnValue(['mentioned']);
    mockDb.validateUsernames.mockResolvedValue([mentionedUser]);
    mockDb.createPost.mockResolvedValue(createMockPost({ content: 'Hey @mentioned!' }));
    mockDb.updateStreak.mockResolvedValue({ updated: false });

    const { sendSocialNotification } = await import('@/lib/services/notifications');

    const request = createMockRequest('http://localhost/api/posts', {
      method: 'POST',
      body: { content: 'Hey @mentioned!' },
    });
    const response = await POST(request as never);

    expect(response.status).toBe(200);
    expect(sendSocialNotification).toHaveBeenCalledWith(
      expect.objectContaining({
        type: 'mention',
        recipientId: 'mentioned-user',
        actorId: 'user-123',
      })
    );
  });

  it('trims whitespace from content', async () => {
    mockAuthFn.mockResolvedValue(createMockSession());
    mockDb.findUserById.mockResolvedValue(createMockUser());
    mockDb.checkTotalDailyLimit.mockResolvedValue(createMockActionLimit());
    mockDb.extractMentions.mockReturnValue([]);
    mockDb.validateUsernames.mockResolvedValue([]);
    mockDb.createPost.mockResolvedValue(createMockPost({ content: 'Hello' }));

    const request = createMockRequest('http://localhost/api/posts', {
      method: 'POST',
      body: { content: '  Hello  ' },
    });
    await POST(request as never);

    expect(mockDb.createPost).toHaveBeenCalledWith('Hello', 'user-123', undefined);
  });

  it('handles database errors gracefully', async () => {
    mockAuthFn.mockResolvedValue(createMockSession());
    mockDb.findUserById.mockResolvedValue(createMockUser());
    mockDb.checkTotalDailyLimit.mockResolvedValue(createMockActionLimit());
    mockDb.extractMentions.mockReturnValue([]);
    mockDb.validateUsernames.mockResolvedValue([]);
    mockDb.createPost.mockRejectedValue(new Error('DB error'));

    const request = createMockRequest('http://localhost/api/posts', {
      method: 'POST',
      body: { content: 'Hello world' },
    });
    const response = await POST(request as never);
    const { status, data } = await parseResponse<ApiResponse>(response);

    expect(status).toBe(500);
    expect(data.error).toBe('Failed to create post');
  });
});
