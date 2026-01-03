// Global test setup
// This file runs before all tests

// Re-export vitest globals for TypeScript
import { afterEach, beforeEach, vi } from 'vitest';

// Reset all mocks between tests
beforeEach(() => {
  vi.clearAllMocks();
});

afterEach(() => {
  vi.restoreAllMocks();
});
