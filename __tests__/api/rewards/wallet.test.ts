import { describe, it, expect, vi, beforeEach } from 'vitest';
import { mockAuthFn, createMockSession } from '../../mocks/auth';
import { mockDb, createMockUser, resetDbMocks } from '../../mocks/database';
import { createMockRequest, parseResponse } from '../../mocks/next';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type ApiResponse = Record<string, any>;

// Mock dependencies before importing the route
vi.mock('@/auth', () => ({ auth: mockAuthFn }));
vi.mock('@/lib/database', () => ({ db: mockDb }));
vi.mock('@/lib/logger', () => ({
  apiLogger: { error: vi.fn(), info: vi.fn(), warn: vi.fn() },
}));

// Import the route handler after mocks are set up
import { POST } from '@/app/api/rewards/wallet/route';

// Valid Solana wallet address for testing
const VALID_WALLET = 'TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA';

describe('POST /api/rewards/wallet', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    resetDbMocks();
  });

  it('returns 401 when not authenticated', async () => {
    mockAuthFn.mockResolvedValue(null);

    const request = createMockRequest({
      method: 'POST',
      body: { walletAddress: VALID_WALLET },
    });

    const response = await POST(request);
    const { status, data } = await parseResponse<ApiResponse>(response);

    expect(status).toBe(401);
    expect(data.error).toBe('Unauthorized');
  });

  it('returns 400 for missing wallet address', async () => {
    mockAuthFn.mockResolvedValue(createMockSession());

    const request = createMockRequest({
      method: 'POST',
      body: {},
    });

    const response = await POST(request);
    const { status, data } = await parseResponse<ApiResponse>(response);

    expect(status).toBe(400);
    expect(data.error).toBe('Wallet address required');
  });

  it('returns 400 for invalid wallet format', async () => {
    mockAuthFn.mockResolvedValue(createMockSession());

    const request = createMockRequest({
      method: 'POST',
      body: { walletAddress: 'invalid-wallet-address' },
    });

    const response = await POST(request);
    const { status, data } = await parseResponse<ApiResponse>(response);

    expect(status).toBe(400);
    expect(data.error).toBe('Invalid wallet address');
  });

  it('returns 409 when wallet already linked to another user', async () => {
    mockAuthFn.mockResolvedValue(createMockSession({ id: 'user-123' }));
    mockDb.getUserByWallet.mockResolvedValue(createMockUser({ id: 'different-user-456' }));

    const request = createMockRequest({
      method: 'POST',
      body: { walletAddress: VALID_WALLET },
    });

    const response = await POST(request);
    const { status, data } = await parseResponse<ApiResponse>(response);

    expect(status).toBe(409);
    expect(data.error).toBe('Wallet already linked to another account');
  });

  it('successfully saves valid wallet', async () => {
    const session = createMockSession({ id: 'user-123' });
    mockAuthFn.mockResolvedValue(session);
    mockDb.getUserByWallet.mockResolvedValue(null); // No existing user
    mockDb.saveUserWallet.mockResolvedValue(undefined);

    const request = createMockRequest({
      method: 'POST',
      body: { walletAddress: VALID_WALLET },
    });

    const response = await POST(request);
    const { status, data } = await parseResponse<ApiResponse>(response);

    expect(status).toBe(200);
    expect(data.success).toBe(true);
    expect(data.walletAddress).toBe(VALID_WALLET);
    expect(mockDb.saveUserWallet).toHaveBeenCalledWith('user-123', VALID_WALLET);
  });

  // ============================================================
  // Idempotent Re-linking Tests
  // ============================================================
  it('allows re-linking same wallet to same user (idempotent)', async () => {
    const session = createMockSession({ id: 'user-123' });
    mockAuthFn.mockResolvedValue(session);
    // Same user already has this wallet
    mockDb.getUserByWallet.mockResolvedValue(createMockUser({ id: 'user-123' }));
    mockDb.saveUserWallet.mockResolvedValue(undefined);

    const request = createMockRequest({
      method: 'POST',
      body: { walletAddress: VALID_WALLET },
    });

    const response = await POST(request);
    const { status, data } = await parseResponse<ApiResponse>(response);

    expect(status).toBe(200);
    expect(data.success).toBe(true);
    // Should still save (update) even if same user
    expect(mockDb.saveUserWallet).toHaveBeenCalled();
  });

  // ============================================================
  // Wallet Format Edge Cases
  // ============================================================
  it('returns 400 for too short wallet address', async () => {
    mockAuthFn.mockResolvedValue(createMockSession());

    const request = createMockRequest({
      method: 'POST',
      body: { walletAddress: 'abc123' },
    });

    const response = await POST(request);
    const { status, data } = await parseResponse<ApiResponse>(response);

    expect(status).toBe(400);
    expect(data.error).toBe('Invalid wallet address');
  });

  it('returns 400 for wallet with invalid base58 characters', async () => {
    mockAuthFn.mockResolvedValue(createMockSession());

    const request = createMockRequest({
      method: 'POST',
      body: { walletAddress: 'Tokenk3gQf3Zyiñ#AJbNbGKPFXCWuBvf9Ss623VQ5DA' }, // Invalid chars
    });

    const response = await POST(request);
    const { status, data } = await parseResponse<ApiResponse>(response);

    expect(status).toBe(400);
    expect(data.error).toBe('Invalid wallet address');
  });

  // ============================================================
  // Error Handling Tests
  // ============================================================
  it('returns 500 on database error checking existing wallet', async () => {
    mockAuthFn.mockResolvedValue(createMockSession());
    mockDb.getUserByWallet.mockRejectedValue(new Error('Database connection failed'));

    const request = createMockRequest({
      method: 'POST',
      body: { walletAddress: VALID_WALLET },
    });

    const response = await POST(request);
    const { status, data } = await parseResponse<ApiResponse>(response);

    expect(status).toBe(500);
    expect(data.error).toBe('Internal server error');
  });

  it('returns 500 on database error saving wallet', async () => {
    mockAuthFn.mockResolvedValue(createMockSession());
    mockDb.getUserByWallet.mockResolvedValue(null);
    mockDb.saveUserWallet.mockRejectedValue(new Error('Write failed'));

    const request = createMockRequest({
      method: 'POST',
      body: { walletAddress: VALID_WALLET },
    });

    const response = await POST(request);
    const { status, data } = await parseResponse<ApiResponse>(response);

    expect(status).toBe(500);
    expect(data.error).toBe('Internal server error');
  });
});
