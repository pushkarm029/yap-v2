import { describe, it, expect, vi, beforeEach } from 'vitest';
import { mockDb, resetDbMocks } from '../../mocks/database';
import { mockAuthFn } from '../../mocks/auth';
import {
  createMockSession,
  createUninvitedSession,
  createMockComment,
  createMockUser,
  parseResponse,
} from '../../fixtures';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type ApiResponse = Record<string, any>;

// Mock dependencies before importing the route
vi.mock('@/auth', () => ({ auth: mockAuthFn }));
vi.mock('@/lib/database', () => ({ db: mockDb }));
vi.mock('@/lib/logger', () => ({
  apiLogger: { error: vi.fn(), info: vi.fn(), warn: vi.fn() },
}));
vi.mock('@/lib/utils', () => ({
  verifyImageOwnership: vi.fn().mockReturnValue(true),
}));
vi.mock('@/lib/services/notifications', () => ({
  sendSocialNotification: vi.fn().mockResolvedValue(undefined),
}));

// Import the route handler after mocks are set up
import { POST } from '@/app/api/posts/[postId]/comments/route';

// Helper to create mock request with params
function createParamsPromise(postId: string) {
  return Promise.resolve({ postId });
}

describe('POST /api/posts/[postId]/comments', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    resetDbMocks();
    // Default mock for extractMentions
    mockDb.extractMentions.mockReturnValue([]);
  });

  it('returns 401 when not authenticated', async () => {
    mockAuthFn.mockResolvedValue(null);

    const request = new Request('http://localhost/api/posts/post-123/comments', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ content: 'Great post!' }),
    });
    const response = await POST(request as never, { params: createParamsPromise('post-123') });
    const { status, data } = await parseResponse<ApiResponse>(response);

    expect(status).toBe(401);
    expect(data.error).toBe('Unauthorized');
  });

  it('returns 403 when user not invited', async () => {
    mockAuthFn.mockResolvedValue(createUninvitedSession());

    const request = new Request('http://localhost/api/posts/post-123/comments', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ content: 'Great post!' }),
    });
    const response = await POST(request as never, { params: createParamsPromise('post-123') });
    const { status, data } = await parseResponse<ApiResponse>(response);

    expect(status).toBe(403);
    expect(data.error).toBe('INVITE_REQUIRED');
  });

  it('returns 400 when content is empty', async () => {
    mockAuthFn.mockResolvedValue(createMockSession());

    const request = new Request('http://localhost/api/posts/post-123/comments', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ content: '   ' }),
    });
    const response = await POST(request as never, { params: createParamsPromise('post-123') });
    const { status, data } = await parseResponse<ApiResponse>(response);

    expect(status).toBe(400);
    expect(data.error).toBe('Comment content is required');
  });

  it('returns 400 when content exceeds max length', async () => {
    mockAuthFn.mockResolvedValue(createMockSession());

    const longContent = 'a'.repeat(501); // TWEET_MAX_LENGTH is 500
    const request = new Request('http://localhost/api/posts/post-123/comments', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ content: longContent }),
    });
    const response = await POST(request as never, { params: createParamsPromise('post-123') });
    const { status, data } = await parseResponse<ApiResponse>(response);

    expect(status).toBe(400);
    expect(data.error).toContain('too long');
  });

  it('returns 404 when post not found', async () => {
    mockAuthFn.mockResolvedValue(createMockSession());
    mockDb.createCommentTransaction.mockResolvedValue({
      success: false,
      error: 'Post not found',
      commentCount: 0,
    });

    const request = new Request('http://localhost/api/posts/nonexistent/comments', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ content: 'Great post!' }),
    });
    const response = await POST(request as never, { params: createParamsPromise('nonexistent') });
    const { status, data } = await parseResponse<ApiResponse>(response);

    expect(status).toBe(404);
    expect(data.error).toBe('Post not found');
  });

  it('returns 429 when daily limit reached', async () => {
    mockAuthFn.mockResolvedValue(createMockSession());
    mockDb.createCommentTransaction.mockResolvedValue({
      success: false,
      error: 'Daily action limit reached',
      commentCount: 15,
    });

    const request = new Request('http://localhost/api/posts/post-123/comments', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ content: 'Great post!' }),
    });
    const response = await POST(request as never, { params: createParamsPromise('post-123') });
    const { status, data } = await parseResponse<ApiResponse>(response);

    expect(status).toBe(429);
    expect(data.error).toBe('Daily action limit reached');
    expect(data.commentCount).toBe(15);
  });

  it('creates comment successfully', async () => {
    mockAuthFn.mockResolvedValue(createMockSession());
    const mockComment = createMockComment({ content: 'Great post!' });
    mockDb.createCommentTransaction.mockResolvedValue({
      success: true,
      comment: mockComment,
      commentCount: 5,
      remaining: 44,
      authorId: 'author-456',
    });

    const request = new Request('http://localhost/api/posts/post-123/comments', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ content: 'Great post!' }),
    });
    const response = await POST(request as never, { params: createParamsPromise('post-123') });
    const { status, data } = await parseResponse<ApiResponse>(response);

    expect(status).toBe(200);
    expect(data.success).toBe(true);
    expect(data.comment).toEqual(mockComment);
    expect(data.commentCount).toBe(5);
    expect(data.remaining).toBe(44);
  });

  it('sends notification to post author', async () => {
    mockAuthFn.mockResolvedValue(createMockSession());
    mockDb.createCommentTransaction.mockResolvedValue({
      success: true,
      comment: createMockComment(),
      commentCount: 5,
      remaining: 44,
      authorId: 'author-456',
    });

    const { sendSocialNotification } = await import('@/lib/services/notifications');

    const request = new Request('http://localhost/api/posts/post-123/comments', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ content: 'Great post!' }),
    });
    await POST(request as never, { params: createParamsPromise('post-123') });

    expect(sendSocialNotification).toHaveBeenCalledWith({
      type: 'comment',
      recipientId: 'author-456',
      actorId: 'user-123',
      postId: 'post-123',
    });
  });

  it('does not send notification when commenting on own post', async () => {
    mockAuthFn.mockResolvedValue(createMockSession());
    mockDb.createCommentTransaction.mockResolvedValue({
      success: true,
      comment: createMockComment(),
      commentCount: 5,
      remaining: 44,
      authorId: null, // Self-comment
    });

    const { sendSocialNotification } = await import('@/lib/services/notifications');

    const request = new Request('http://localhost/api/posts/post-123/comments', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ content: 'Great post!' }),
    });
    await POST(request as never, { params: createParamsPromise('post-123') });

    expect(sendSocialNotification).not.toHaveBeenCalled();
  });

  it('handles mentions in comment content', async () => {
    const mentionedUser = createMockUser({ id: 'mentioned-user', username: 'mentioned' });

    mockAuthFn.mockResolvedValue(createMockSession());
    mockDb.createCommentTransaction.mockResolvedValue({
      success: true,
      comment: createMockComment({ content: 'Hey @mentioned!' }),
      commentCount: 5,
      remaining: 44,
      authorId: 'author-456',
    });
    mockDb.extractMentions.mockReturnValue(['mentioned']);
    mockDb.validateUsernames.mockResolvedValue([mentionedUser]);

    const { sendSocialNotification } = await import('@/lib/services/notifications');

    const request = new Request('http://localhost/api/posts/post-123/comments', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ content: 'Hey @mentioned!' }),
    });
    await POST(request as never, { params: createParamsPromise('post-123') });

    expect(sendSocialNotification).toHaveBeenCalledWith(
      expect.objectContaining({
        type: 'mention',
        recipientId: 'mentioned-user',
        actorId: 'user-123',
      })
    );
  });

  it('supports parent comment for nested replies', async () => {
    mockAuthFn.mockResolvedValue(createMockSession());
    mockDb.createCommentTransaction.mockResolvedValue({
      success: true,
      comment: createMockComment(),
      commentCount: 10,
      remaining: 40,
      authorId: 'author-456',
    });

    const request = new Request('http://localhost/api/posts/post-123/comments', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        content: 'Reply to your comment!',
        parentCommentId: 'parent-comment-123',
      }),
    });
    await POST(request as never, { params: createParamsPromise('post-123') });

    expect(mockDb.createCommentTransaction).toHaveBeenCalledWith(
      'user-123',
      'post-123',
      'Reply to your comment!',
      'parent-comment-123',
      undefined
    );
  });

  it('handles database errors gracefully', async () => {
    mockAuthFn.mockResolvedValue(createMockSession());
    mockDb.createCommentTransaction.mockRejectedValue(new Error('DB error'));

    const request = new Request('http://localhost/api/posts/post-123/comments', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ content: 'Great post!' }),
    });
    const response = await POST(request as never, { params: createParamsPromise('post-123') });
    const { status, data } = await parseResponse<ApiResponse>(response);

    expect(status).toBe(500);
    expect(data.error).toBe('Internal server error');
  });
});
