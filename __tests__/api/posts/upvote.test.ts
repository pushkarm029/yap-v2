import { describe, it, expect, vi, beforeEach } from 'vitest';
import { mockDb, resetDbMocks } from '../../mocks/database';
import { mockAuthFn } from '../../mocks/auth';
import { createMockSession, createUninvitedSession, parseResponse } from '../../fixtures';

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
import { POST, DELETE } from '@/app/api/posts/[postId]/upvote/route';

// Helper to create mock request with params
function createParamsPromise(postId: string) {
  return Promise.resolve({ postId });
}

describe('POST /api/posts/[postId]/upvote', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    resetDbMocks();
  });

  it('returns 401 when not authenticated', async () => {
    mockAuthFn.mockResolvedValue(null);

    const request = new Request('http://localhost/api/posts/post-123/upvote', {
      method: 'POST',
    });
    const response = await POST(request as never, { params: createParamsPromise('post-123') });
    const { status, data } = await parseResponse<ApiResponse>(response);

    expect(status).toBe(401);
    expect(data.error).toBe('Unauthorized');
  });

  it('returns 403 when user not invited', async () => {
    mockAuthFn.mockResolvedValue(createUninvitedSession());

    const request = new Request('http://localhost/api/posts/post-123/upvote', {
      method: 'POST',
    });
    const response = await POST(request as never, { params: createParamsPromise('post-123') });
    const { status, data } = await parseResponse<ApiResponse>(response);

    expect(status).toBe(403);
    expect(data.error).toBe('INVITE_REQUIRED');
  });

  it('returns 404 when post not found', async () => {
    mockAuthFn.mockResolvedValue(createMockSession());
    mockDb.createUpvoteTransaction.mockResolvedValue({
      success: false,
      error: 'Post not found',
      upvoteCount: 0,
    });

    const request = new Request('http://localhost/api/posts/nonexistent/upvote', {
      method: 'POST',
    });
    const response = await POST(request as never, { params: createParamsPromise('nonexistent') });
    const { status, data } = await parseResponse<ApiResponse>(response);

    expect(status).toBe(404);
    expect(data.error).toBe('Post not found');
  });

  it('returns 409 when already upvoted', async () => {
    mockAuthFn.mockResolvedValue(createMockSession());
    mockDb.createUpvoteTransaction.mockResolvedValue({
      success: false,
      error: 'Already upvoted',
      upvoteCount: 5,
    });

    const request = new Request('http://localhost/api/posts/post-123/upvote', {
      method: 'POST',
    });
    const response = await POST(request as never, { params: createParamsPromise('post-123') });
    const { status, data } = await parseResponse<ApiResponse>(response);

    expect(status).toBe(409);
    expect(data.error).toBe('Already upvoted');
    expect(data.upvoteCount).toBe(5);
  });

  it('returns 429 when daily limit reached', async () => {
    mockAuthFn.mockResolvedValue(createMockSession());
    mockDb.createUpvoteTransaction.mockResolvedValue({
      success: false,
      error: 'Daily action limit reached',
      upvoteCount: 10,
    });

    const request = new Request('http://localhost/api/posts/post-123/upvote', {
      method: 'POST',
    });
    const response = await POST(request as never, { params: createParamsPromise('post-123') });
    const { status, data } = await parseResponse<ApiResponse>(response);

    expect(status).toBe(429);
    expect(data.error).toBe('Daily action limit reached');
    expect(data.upvoteCount).toBe(10);
  });

  it('creates upvote successfully', async () => {
    mockAuthFn.mockResolvedValue(createMockSession());
    mockDb.createUpvoteTransaction.mockResolvedValue({
      success: true,
      upvoteCount: 11,
      remaining: 44,
      authorId: 'author-456',
      voteWeight: 1.5,
    });

    const request = new Request('http://localhost/api/posts/post-123/upvote', {
      method: 'POST',
    });
    const response = await POST(request as never, { params: createParamsPromise('post-123') });
    const { status, data } = await parseResponse<ApiResponse>(response);

    expect(status).toBe(200);
    expect(data.success).toBe(true);
    expect(data.upvoted).toBe(true);
    expect(data.upvoteCount).toBe(11);
    expect(data.remaining).toBe(44);
  });

  it('sends notification to post author', async () => {
    mockAuthFn.mockResolvedValue(createMockSession());
    mockDb.createUpvoteTransaction.mockResolvedValue({
      success: true,
      upvoteCount: 5,
      remaining: 45,
      authorId: 'author-456',
      voteWeight: 2.0,
    });

    const { sendSocialNotification } = await import('@/lib/services/notifications');

    const request = new Request('http://localhost/api/posts/post-123/upvote', {
      method: 'POST',
    });
    await POST(request as never, { params: createParamsPromise('post-123') });

    expect(sendSocialNotification).toHaveBeenCalledWith({
      type: 'upvote',
      recipientId: 'author-456',
      actorId: 'user-123',
      postId: 'post-123',
      votePower: 2.0,
    });
  });

  it('does not send notification when self-upvoting (no authorId)', async () => {
    mockAuthFn.mockResolvedValue(createMockSession());
    mockDb.createUpvoteTransaction.mockResolvedValue({
      success: true,
      upvoteCount: 5,
      remaining: 45,
      authorId: null, // Author upvoting their own post
      voteWeight: 1.0,
    });

    const { sendSocialNotification } = await import('@/lib/services/notifications');

    const request = new Request('http://localhost/api/posts/post-123/upvote', {
      method: 'POST',
    });
    await POST(request as never, { params: createParamsPromise('post-123') });

    expect(sendSocialNotification).not.toHaveBeenCalled();
  });

  it('handles database errors gracefully', async () => {
    mockAuthFn.mockResolvedValue(createMockSession());
    mockDb.createUpvoteTransaction.mockRejectedValue(new Error('DB error'));

    const request = new Request('http://localhost/api/posts/post-123/upvote', {
      method: 'POST',
    });
    const response = await POST(request as never, { params: createParamsPromise('post-123') });
    const { status, data } = await parseResponse<ApiResponse>(response);

    expect(status).toBe(500);
    expect(data.error).toBe('Internal server error');
  });
});

describe('DELETE /api/posts/[postId]/upvote', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    resetDbMocks();
  });

  it('returns 401 when not authenticated', async () => {
    mockAuthFn.mockResolvedValue(null);

    const request = new Request('http://localhost/api/posts/post-123/upvote', {
      method: 'DELETE',
    });
    const response = await DELETE(request as never, { params: createParamsPromise('post-123') });
    const { status, data } = await parseResponse<ApiResponse>(response);

    expect(status).toBe(401);
    expect(data.error).toBe('Unauthorized');
  });

  it('returns 404 when post not found', async () => {
    mockAuthFn.mockResolvedValue(createMockSession());
    mockDb.removeUpvoteTransaction.mockResolvedValue({
      success: false,
      error: 'Post not found',
      upvoteCount: 0,
    });

    const request = new Request('http://localhost/api/posts/nonexistent/upvote', {
      method: 'DELETE',
    });
    const response = await DELETE(request as never, { params: createParamsPromise('nonexistent') });
    const { status, data } = await parseResponse<ApiResponse>(response);

    expect(status).toBe(404);
    expect(data.error).toBe('Post not found');
  });

  it('removes upvote successfully', async () => {
    mockAuthFn.mockResolvedValue(createMockSession());
    mockDb.removeUpvoteTransaction.mockResolvedValue({
      success: true,
      upvoteCount: 9,
    });

    const request = new Request('http://localhost/api/posts/post-123/upvote', {
      method: 'DELETE',
    });
    const response = await DELETE(request as never, { params: createParamsPromise('post-123') });
    const { status, data } = await parseResponse<ApiResponse>(response);

    expect(status).toBe(200);
    expect(data.success).toBe(true);
    expect(data.upvoted).toBe(false);
    expect(data.upvoteCount).toBe(9);
  });

  it('returns 400 for other errors', async () => {
    mockAuthFn.mockResolvedValue(createMockSession());
    mockDb.removeUpvoteTransaction.mockResolvedValue({
      success: false,
      error: 'Not upvoted',
      upvoteCount: 5,
    });

    const request = new Request('http://localhost/api/posts/post-123/upvote', {
      method: 'DELETE',
    });
    const response = await DELETE(request as never, { params: createParamsPromise('post-123') });
    const { status, data } = await parseResponse<ApiResponse>(response);

    expect(status).toBe(400);
    expect(data.error).toBe('Not upvoted');
    expect(data.upvoteCount).toBe(5);
  });

  it('handles database errors gracefully', async () => {
    mockAuthFn.mockResolvedValue(createMockSession());
    mockDb.removeUpvoteTransaction.mockRejectedValue(new Error('DB error'));

    const request = new Request('http://localhost/api/posts/post-123/upvote', {
      method: 'DELETE',
    });
    const response = await DELETE(request as never, { params: createParamsPromise('post-123') });
    const { status, data } = await parseResponse<ApiResponse>(response);

    expect(status).toBe(500);
    expect(data.error).toBe('Internal server error');
  });
});
