// NextAuth session mocking utilities
import { vi } from 'vitest';

/**
 * Mock session object matching NextAuth session structure
 */
export interface MockSession {
  user: {
    id: string;
    name?: string;
    email?: string;
    image?: string;
  };
  expires: string;
}

/**
 * Create a mock authenticated session
 */
export function createMockSession(overrides: Partial<MockSession['user']> = {}): MockSession {
  return {
    user: {
      id: 'test-user-123',
      name: 'Test User',
      email: 'test@example.com',
      ...overrides,
    },
    expires: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
  };
}

/**
 * Mock auth function - use vi.fn() for flexible mocking
 *
 * Usage in tests:
 * ```
 * vi.mock('@/auth', () => ({ auth: mockAuthFn }));
 * mockAuthFn.mockResolvedValue(createMockSession());  // authenticated
 * mockAuthFn.mockResolvedValue(null);                 // unauthenticated
 * ```
 */
export const mockAuthFn = vi.fn();

/**
 * Default mock session for convenience
 */
export const defaultMockSession = createMockSession();
