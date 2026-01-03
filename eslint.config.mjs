import { defineConfig, globalIgnores } from 'eslint/config';
import nextVitals from 'eslint-config-next/core-web-vitals';
import nextTs from 'eslint-config-next/typescript';
import prettier from 'eslint-config-prettier/flat';

const eslintConfig = defineConfig([
  // Next.js recommended configs with TypeScript
  ...nextVitals,
  ...nextTs,

  // Custom rules
  {
    rules: {
      // === Code Quality (Medium Strictness) ===
      'no-console': ['warn', { allow: ['warn', 'error'] }],
      'prefer-const': 'error',
      eqeqeq: ['error', 'always', { null: 'ignore' }],

      // === React/Hooks ===
      'react-hooks/exhaustive-deps': 'warn',
      'react-hooks/set-state-in-effect': 'warn', // Downgrade from error - common pattern in React
      'react/self-closing-comp': 'error',

      // === TypeScript ===
      '@typescript-eslint/no-unused-vars': [
        'error',
        {
          argsIgnorePattern: '^_',
          varsIgnorePattern: '^_',
          caughtErrorsIgnorePattern: '^_',
        },
      ],
    },
  },

  // Prettier compatibility - MUST be last to override formatting rules
  prettier,

  // Global ignores - override defaults
  globalIgnores([
    '.next/**',
    'out/**',
    'build/**',
    'dist/**',
    'next-env.d.ts',
    'contracts/**',
    'public/sw.js',
    'public/sw.js.map',
    'scripts/**', // Standalone utility scripts
  ]),
]);

export default eslintConfig;
