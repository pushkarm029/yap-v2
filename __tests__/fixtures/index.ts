/**
 * Shared test fixtures
 * Provides consistent mock data across all tests
 */

// ============ USER FIXTURES ============

export interface MockUser {
  id: string;
  twitter_id: string;
  username: string;
  display_name: string;
  avatar_url: string | null;
  points: number;
  wallet_address: string | null;
  invited_by: string | null;
  invite_code: string | null;
  created_at: string;
  updated_at: string;
  streak?: number | null;
  last_action_date?: string | null;
}

export function createMockUser(overrides: Partial<MockUser> = {}): MockUser {
  const now = new Date().toISOString();
  return {
    id: 'user-123',
    twitter_id: 'twitter-123',
    username: 'testuser',
    display_name: 'Test User',
    avatar_url: 'https://example.com/avatar.jpg',
    points: 100,
    wallet_address: null,
    invited_by: 'inviter-456',
    invite_code: 'TEST123',
    created_at: now,
    updated_at: now,
    streak: 5,
    last_action_date: now.split('T')[0],
    ...overrides,
  };
}

// ============ POST FIXTURES ============

export interface MockPost {
  id: string;
  content: string;
  author_id: string;
  image_url: string | null;
  upvote_count: number;
  comment_count: number;
  created_at: string;
  updated_at: string;
}

export interface MockPostWithAuthor extends MockPost {
  author_username: string;
  author_display_name: string;
  author_avatar_url: string | null;
  is_upvoted?: boolean;
}

export function createMockPost(overrides: Partial<MockPost> = {}): MockPost {
  const now = new Date().toISOString();
  return {
    id: 'post-123',
    content: 'This is a test post',
    author_id: 'user-123',
    image_url: null,
    upvote_count: 0,
    comment_count: 0,
    created_at: now,
    updated_at: now,
    ...overrides,
  };
}

export function createMockPostWithAuthor(
  overrides: Partial<MockPostWithAuthor> = {}
): MockPostWithAuthor {
  return {
    ...createMockPost(overrides),
    author_username: 'testuser',
    author_display_name: 'Test User',
    author_avatar_url: 'https://example.com/avatar.jpg',
    is_upvoted: false,
    ...overrides,
  };
}

// ============ COMMENT FIXTURES ============

export interface MockComment {
  id: string;
  post_id: string;
  author_id: string;
  content: string;
  created_at: string;
}

export interface MockCommentWithAuthor extends MockComment {
  author_username: string;
  author_display_name: string;
  author_avatar_url: string | null;
}

export function createMockComment(overrides: Partial<MockComment> = {}): MockComment {
  return {
    id: 'comment-123',
    post_id: 'post-123',
    author_id: 'user-123',
    content: 'This is a test comment',
    created_at: new Date().toISOString(),
    ...overrides,
  };
}

export function createMockCommentWithAuthor(
  overrides: Partial<MockCommentWithAuthor> = {}
): MockCommentWithAuthor {
  return {
    ...createMockComment(overrides),
    author_username: 'testuser',
    author_display_name: 'Test User',
    author_avatar_url: 'https://example.com/avatar.jpg',
    ...overrides,
  };
}

// ============ NOTIFICATION FIXTURES ============

export interface MockNotification {
  id: string;
  recipient_id: string;
  type: 'upvote' | 'comment' | 'follow' | 'mention' | 'reward';
  actor_id: string | null;
  post_id: string | null;
  is_read: boolean;
  created_at: string;
}

export function createMockNotification(
  overrides: Partial<MockNotification> = {}
): MockNotification {
  return {
    id: 'notif-123',
    recipient_id: 'user-123',
    type: 'upvote',
    actor_id: 'user-456',
    post_id: 'post-123',
    is_read: false,
    created_at: new Date().toISOString(),
    ...overrides,
  };
}

// ============ ACTION LIMIT FIXTURES ============

export interface MockActionLimit {
  used: number;
  remaining: number;
  limit: number;
  resetAt: string;
}

export function createMockActionLimit(overrides: Partial<MockActionLimit> = {}): MockActionLimit {
  const tomorrow = new Date();
  tomorrow.setUTCDate(tomorrow.getUTCDate() + 1);
  tomorrow.setUTCHours(0, 0, 0, 0);

  return {
    used: 5,
    remaining: 45,
    limit: 50,
    resetAt: tomorrow.toISOString(),
    ...overrides,
  };
}

// ============ SESSION FIXTURES ============

export interface MockSession {
  user: {
    id: string;
    name?: string;
    email?: string;
    image?: string;
    invitedBy?: string;
  };
  expires: string;
}

export function createMockSession(overrides: Partial<MockSession['user']> = {}): MockSession {
  return {
    user: {
      id: 'user-123',
      name: 'Test User',
      email: 'test@example.com',
      image: 'https://example.com/avatar.jpg',
      invitedBy: 'inviter-456',
      ...overrides,
    },
    expires: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
  };
}

/**
 * Session without invite code (not yet invited)
 */
export function createUninvitedSession(overrides: Partial<MockSession['user']> = {}): MockSession {
  return createMockSession({ invitedBy: undefined, ...overrides });
}

// ============ REWARD FIXTURES ============

export interface MockReward {
  id: string;
  user_id: string;
  distribution_id: string;
  wallet_address: string;
  amount: string;
  points_converted: number;
  claimed_at: string | null;
  claim_tx: string | null;
  created_at: string;
}

export function createMockReward(overrides: Partial<MockReward> = {}): MockReward {
  return {
    id: 'reward-123',
    user_id: 'user-123',
    distribution_id: 'dist-123',
    wallet_address: 'TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA',
    amount: '1000000000', // 1 YAP (9 decimals)
    points_converted: 100,
    claimed_at: null,
    claim_tx: null,
    created_at: new Date().toISOString(),
    ...overrides,
  };
}

// ============ REQUEST HELPERS ============

/**
 * Create a mock NextRequest with JSON body
 */
export function createMockRequest(
  url: string,
  options: {
    method?: string;
    body?: object;
    headers?: Record<string, string>;
  } = {}
): Request {
  const { method = 'GET', body, headers = {} } = options;

  const init: RequestInit = {
    method,
    headers: {
      'Content-Type': 'application/json',
      ...headers,
    },
  };

  if (body) {
    init.body = JSON.stringify(body);
  }

  return new Request(url, init);
}

// ============ RESPONSE HELPERS ============

/**
 * Parse a NextResponse to get status and data
 */
export async function parseResponse<T>(response: Response): Promise<{ status: number; data: T }> {
  const status = response.status;
  const data = (await response.json()) as T;
  return { status, data };
}
