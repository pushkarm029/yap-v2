import react from '@vitejs/plugin-react';
import path from 'path';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  plugins: [react()],
  test: {
    globals: true,
    environment: 'node',
    include: ['__tests__/**/*.test.ts', '__tests__/**/*.test.tsx'],
    exclude: ['**/node_modules/**'],
    setupFiles: ['./vitest.setup.ts'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'html', 'lcov'],
      include: [
        'lib/solana/**',
        'lib/database/**',
        'lib/api/**',
        'lib/utils/**',
        'lib/types/**',
        'app/api/**',
        'hooks/**',
      ],
      exclude: [
        '**/node_modules/**',
        '**/*.d.ts',
        '**/index.ts', // Barrel exports don't need coverage
      ],
    },
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './'),
    },
  },
});
