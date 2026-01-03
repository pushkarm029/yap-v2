import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { createMockRequest, createCronRequest, parseResponse } from '../../mocks/next';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type ApiResponse = Record<string, any>;

// Use vi.hoisted() for mocks referenced in vi.mock() factories
const mockDbExecute = vi.hoisted(() => vi.fn());
const mockS3Send = vi.hoisted(() => vi.fn());
const mockGetNowISO = vi.hoisted(() => vi.fn());
const mockProcessPreDistributionNotifications = vi.hoisted(() => vi.fn());

// Mock dependencies before importing the route
vi.mock('@libsql/client', () => ({
  createClient: vi.fn(() => ({
    execute: mockDbExecute,
  })),
}));

vi.mock('@aws-sdk/client-s3', () => ({
  S3Client: class MockS3Client {
    send = mockS3Send;
  },
  DeleteObjectCommand: class MockDeleteCommand {
    constructor(public params: unknown) {}
  },
}));

vi.mock('@/lib/logger', () => ({
  apiLogger: {
    child: vi.fn(() => ({
      info: vi.fn(),
      warn: vi.fn(),
      error: vi.fn(),
      child: vi.fn(() => ({
        info: vi.fn(),
        warn: vi.fn(),
        error: vi.fn(),
      })),
    })),
  },
}));

vi.mock('@/lib/services/gamifiedNotifications', () => ({
  processPreDistributionNotifications: mockProcessPreDistributionNotifications,
}));

vi.mock('@/lib/utils/dates', () => ({
  getNowISO: mockGetNowISO,
}));

// Import the route handler after mocks are set up
import { GET } from '@/app/api/cron/daily-maintenance/route';

const CRON_SECRET = 'test-cron-secret';

describe('GET /api/cron/daily-maintenance (cleanup phase)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.CRON_SECRET = CRON_SECRET;
    process.env.TURSO_DATABASE_URL = 'libsql://test.turso.io';
    process.env.TURSO_AUTH_TOKEN = 'test-token';
    process.env.R2_ACCOUNT_ID = 'test-account';
    process.env.R2_ACCESS_KEY_ID = 'test-key';
    process.env.R2_SECRET_ACCESS_KEY = 'test-secret';
    process.env.R2_BUCKET_NAME = 'test-bucket';
    mockGetNowISO.mockReturnValue('2024-01-15T00:00:00Z');
    // Mock notifications phase to return empty stats
    mockProcessPreDistributionNotifications.mockResolvedValue({
      walletConnectReminders: 0,
      streakWarnings3h: 0,
      errors: [],
    });
  });

  afterEach(() => {
    delete process.env.CRON_SECRET;
    delete process.env.TURSO_DATABASE_URL;
    delete process.env.TURSO_AUTH_TOKEN;
    delete process.env.R2_ACCOUNT_ID;
    delete process.env.R2_ACCESS_KEY_ID;
    delete process.env.R2_SECRET_ACCESS_KEY;
    delete process.env.R2_BUCKET_NAME;
  });

  it('returns 500 when CRON_SECRET not set', async () => {
    delete process.env.CRON_SECRET;

    const request = createCronRequest(
      'any-secret',
      'http://localhost:3000/api/cron/daily-maintenance'
    );
    const response = await GET(request);
    const { status, data } = await parseResponse<ApiResponse>(response);

    expect(status).toBe(500);
    expect(data.error).toBe('Server configuration error');
  });

  it('returns 401 without authorization header', async () => {
    const request = createMockRequest({
      url: 'http://localhost:3000/api/cron/daily-maintenance',
    });

    const response = await GET(request);
    const { status, data } = await parseResponse<ApiResponse>(response);

    expect(status).toBe(401);
    expect(data.error).toBe('Unauthorized');
  });

  it('returns 401 with wrong secret', async () => {
    const request = createCronRequest(
      'wrong-secret',
      'http://localhost:3000/api/cron/daily-maintenance'
    );

    const response = await GET(request);
    const { status, data } = await parseResponse<ApiResponse>(response);

    expect(status).toBe(401);
    expect(data.error).toBe('Unauthorized');
  });

  it('successfully cleans up expired content', async () => {
    // Mock: no images to delete
    mockDbExecute.mockImplementation((query: string) => {
      if (query.includes('SELECT image_url')) {
        return { rows: [] };
      }
      if (query.includes('DELETE FROM posts')) {
        return { rowsAffected: 5 };
      }
      if (query.includes('DELETE FROM daily_actions')) {
        return { rowsAffected: 10 };
      }
      if (query.includes('DELETE FROM notifications')) {
        return { rowsAffected: 3 };
      }
      return { rows: [], rowsAffected: 0 };
    });

    const request = createCronRequest(
      CRON_SECRET,
      'http://localhost:3000/api/cron/daily-maintenance'
    );

    const response = await GET(request);
    const { status, data } = await parseResponse<ApiResponse>(response);

    expect(status).toBe(200);
    expect(data.success).toBe(true);
    // Response now uses cleanup.* structure
    expect(data.cleanup.deletedPosts).toBe(5);
    expect(data.cleanup.deletedDailyActions).toBe(10);
    expect(data.cleanup.deletedNotifications).toBe(3);
    expect(data.cleanup.deletedImages).toBe(0);
  });

  it('deletes images from R2 when posts have images', async () => {
    // Mock: 2 posts with images
    mockDbExecute.mockImplementation((query: string) => {
      if (query.includes('SELECT image_url')) {
        return {
          rows: [
            { image_url: 'https://pub-xxx.r2.dev/posts/user1/image1.jpg' },
            { image_url: 'https://pub-xxx.r2.dev/posts/user2/image2.png' },
          ],
        };
      }
      if (query.includes('DELETE FROM posts')) {
        return { rowsAffected: 2 };
      }
      if (query.includes('DELETE FROM daily_actions')) {
        return { rowsAffected: 0 };
      }
      if (query.includes('DELETE FROM notifications')) {
        return { rowsAffected: 0 };
      }
      return { rows: [], rowsAffected: 0 };
    });

    mockS3Send.mockResolvedValue({});

    const request = createCronRequest(
      CRON_SECRET,
      'http://localhost:3000/api/cron/daily-maintenance'
    );

    const response = await GET(request);
    const { status, data } = await parseResponse<ApiResponse>(response);

    expect(status).toBe(200);
    expect(data.success).toBe(true);
    expect(data.cleanup.deletedImages).toBe(2);
    expect(data.cleanup.deletedPosts).toBe(2);
    expect(mockS3Send).toHaveBeenCalledTimes(2);
  });

  it('continues cleanup if R2 delete fails for one image', async () => {
    // Mock: 2 posts with images, first one fails
    mockDbExecute.mockImplementation((query: string) => {
      if (query.includes('SELECT image_url')) {
        return {
          rows: [
            { image_url: 'https://pub-xxx.r2.dev/posts/user1/image1.jpg' },
            { image_url: 'https://pub-xxx.r2.dev/posts/user2/image2.png' },
          ],
        };
      }
      if (query.includes('DELETE FROM posts')) {
        return { rowsAffected: 2 };
      }
      return { rows: [], rowsAffected: 0 };
    });

    mockS3Send.mockRejectedValueOnce(new Error('R2 error')).mockResolvedValueOnce({});

    const request = createCronRequest(
      CRON_SECRET,
      'http://localhost:3000/api/cron/daily-maintenance'
    );

    const response = await GET(request);
    const { status, data } = await parseResponse<ApiResponse>(response);

    // Should still succeed - one image deleted
    expect(status).toBe(200);
    expect(data.success).toBe(true);
    expect(data.cleanup.deletedImages).toBe(1); // Only second one succeeded
    expect(data.cleanup.deletedPosts).toBe(2);
  });
});
