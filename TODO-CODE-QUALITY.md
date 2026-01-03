# Code Quality & Testing Implementation Plan

> **Goal:** Strict the alpha MVP to maintain code quality as development continues

## Summary of Decisions

| Area        | Decision                       | Status |
| ----------- | ------------------------------ | ------ |
| ESLint      | Medium strictness              | Ready  |
| Prettier    | 100 width, semi, single quotes | Ready  |
| Pre-commit  | Lefthook (fast, Go-based)      | Ready  |
| Testing     | Full stack (unit → API → E2E)  | Ready  |
| Commit lint | Yes, lenient (+ wip type)      | Ready  |

---

## Phase 1: Prettier + ESLint Enhancement

### 1.1 Prettier Setup

**To Install:**

```bash
bun add -D prettier eslint-config-prettier eslint-plugin-prettier
```

**Configuration:** `.prettierrc`

```json
{
  "printWidth": 100,
  "tabWidth": 2,
  "useTabs": false,
  "semi": true,
  "singleQuote": true,
  "trailingComma": "es5",
  "bracketSpacing": true,
  "arrowParens": "always"
}
```

**Files:**

- [ ] Create `.prettierrc`
- [ ] Create `.prettierignore`
- [ ] Add `format` script to package.json
- [ ] Add `format:check` script for CI

### 1.2 ESLint Enhancement (Medium Strictness)

**To Install:**

```bash
bun add -D eslint-plugin-import eslint-import-resolver-typescript
```

**Rules to Add (Medium Level):**

#### Code Quality

- [ ] `no-console: warn` - Flag console.log (allow warn/error)
- [ ] `prefer-const: error` - Use const when possible
- [ ] `no-unused-vars: error` - With underscore exception for intentional
- [ ] `eqeqeq: error` - Require === and !==

#### React/Hooks

- [ ] `react-hooks/exhaustive-deps: warn` - Dependency arrays
- [ ] `react/jsx-no-leaked-render: warn` - Prevent `{count && <Component />}` bugs
- [ ] `react/self-closing-comp: error` - `<Component />` not `<Component></Component>`

#### Imports

- [ ] `import/order` - Group and sort imports
- [ ] `import/no-duplicates: error` - No duplicate imports
- [ ] `import/newline-after-import: error` - Blank line after imports

#### Project-Specific

- [ ] `no-restricted-imports` - Block direct database imports from components
- [ ] Custom patterns for TanStack Query enforcement (discussion needed)

**Files:**

- [ ] Update `eslint.config.mjs`
- [ ] Add `.eslintignore` if needed

---

## Phase 2: Pre-commit Hooks (Lefthook)

### 2.1 Lefthook Setup

**To Install:**

```bash
bun add -D lefthook
bunx lefthook install
```

**Configuration:** `lefthook.yml` (based on official docs)

```yaml
# lefthook.yml
min_version: 1.6.0

pre-commit:
  parallel: true
  commands:
    lint:
      glob: '*.{js,jsx,ts,tsx}'
      run: bunx eslint --fix {staged_files}
      stage_fixed: true # Re-stage fixed files automatically

    format:
      glob: '*.{js,jsx,ts,tsx,json,md,css}'
      run: bunx prettier --write {staged_files}
      stage_fixed: true

    typecheck:
      run: bunx tsc --noEmit
      # No glob - runs on whole project

pre-push:
  commands:
    test:
      run: bun test
```

**Files:**

- [ ] Create `lefthook.yml`
- [ ] Update package.json with lefthook scripts
- [ ] Document setup for team

---

## Phase 3: Testing Infrastructure

### 3.1 Framework Setup

**To Install:**

```bash
# Unit + Component tests
bun add -D vitest @vitejs/plugin-react jsdom
bun add -D @testing-library/react @testing-library/jest-dom @testing-library/user-event

# E2E tests
bun add -D @playwright/test
bunx playwright install
```

**Configuration files:**

- [ ] Create `vitest.config.ts`
- [ ] Create `playwright.config.ts`
- [ ] Add test scripts to package.json

### 3.2 Test Directory Structure

```
__tests__/
├── unit/
│   ├── lib/
│   │   ├── merkle.test.ts
│   │   ├── staking.test.ts
│   │   └── queryKeys.test.ts
│   └── utils/
│       └── formatters.test.ts
├── api/
│   ├── rewards/
│   │   ├── score.test.ts
│   │   ├── claim.test.ts
│   │   └── pool.test.ts
│   └── posts/
│       └── upvote.test.ts
├── components/
│   ├── UpvoteButton.test.tsx
│   └── Toast.test.tsx
└── e2e/
    ├── auth.spec.ts
    ├── rewards-claim.spec.ts
    └── post-creation.spec.ts
```

### 3.3 Test Priority by Risk/Value

#### Tier 1: Critical Math (Unit Tests) - HIGH PRIORITY

These are pure functions with complex logic where bugs = lost money

| File                       | Functions to Test                                        | Risk Level |
| -------------------------- | -------------------------------------------------------- | ---------- |
| `lib/solana/merkle.ts`     | `hashLeaf`, `buildMerkleTree`, `getProof`, `verifyProof` | CRITICAL   |
| `lib/solana/staking.ts`    | `calculateVotePower`                                     | HIGH       |
| `lib/solana/claim.ts`      | `formatTokenAmount`, `parseTokenAmount`, PDAs            | HIGH       |
| `lib/solana/distribute.ts` | Rate limit calculations                                  | HIGH       |

#### Tier 2: Business Logic (API Tests) - HIGH PRIORITY

Backend endpoints where bugs affect user experience/money

| Route                   | What to Test                                      |
| ----------------------- | ------------------------------------------------- |
| `api/rewards/claim`     | Merkle proof generation, already-claimed handling |
| `api/rewards/score`     | Points calculation, pending amounts               |
| `api/rewards/pool`      | Rate limiting math, share calculation             |
| `api/posts/[id]/upvote` | Vote weight application, limit enforcement        |
| `api/cron/distribute`   | Full distribution flow (mocked chain)             |

#### Tier 3: UI Components (Component Tests) - MEDIUM PRIORITY

Interactive components with complex state

| Component      | What to Test                          |
| -------------- | ------------------------------------- |
| `UpvoteButton` | Optimistic update, rollback on error  |
| `ClaimRewards` | Status transitions, error states      |
| `WalletButton` | Connection states, platform detection |
| `Toast`        | Render variants, auto-dismiss         |

#### Tier 4: User Flows (E2E Tests) - MEDIUM PRIORITY

Critical paths through the app

| Flow          | Steps                                                   |
| ------------- | ------------------------------------------------------- |
| Rewards Claim | Login → Connect Wallet → View Balance → Claim → Verify  |
| Post Creation | Login → Compose → Submit → Verify in Feed               |
| Upvote Flow   | Login → Find Post → Upvote → Check Points Updated       |
| Distribution  | (Cron mock) → User sees claimable → Claims successfully |

### 3.4 Mocking Strategy

**Database:** Use test SQLite instance or mock `lib/database.ts`
**Solana RPC:** Mock `@solana/web3.js` connection responses
**NextAuth:** Mock session with test user
**Time:** Use `vi.useFakeTimers()` for countdown/distribution tests

---

## Phase 4: Commit Linting (Optional)

### 4.1 Conventional Commits

**To Install:**

```bash
bun add -D @commitlint/cli @commitlint/config-conventional
```

**Configuration:** `commitlint.config.js`

```javascript
module.exports = {
  extends: ['@commitlint/config-conventional'],
  rules: {
    'type-enum': [
      2,
      'always',
      ['feat', 'fix', 'docs', 'style', 'refactor', 'test', 'chore', 'perf', 'ci', 'build', 'wip'],
    ],
    'scope-enum': [
      1,
      'always',
      [
        // Warning only, not error
        'rewards',
        'posts',
        'auth',
        'wallet',
        'ui',
        'api',
        'db',
        'solana',
      ],
    ],
    'subject-case': [0], // Disabled - write naturally
  },
};
```

**Add to lefthook.yml:**

```yaml
commit-msg:
  commands:
    commitlint:
      run: bunx commitlint --edit {1}
```

---

## Phase 5: CI/CD Pipeline

### 5.1 GitHub Actions

**File:** `.github/workflows/ci.yml`

```yaml
name: CI

on:
  pull_request:
    branches: [main, dev]
  push:
    branches: [main, dev]

jobs:
  quality:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: oven-sh/setup-bun@v1
      - run: bun install
      - run: bun run lint
      - run: bun run format:check
      - run: bun run typecheck
      - run: bun test
      - run: bun run build

  e2e:
    runs-on: ubuntu-latest
    needs: quality
    steps:
      - uses: actions/checkout@v4
      - uses: oven-sh/setup-bun@v1
      - run: bun install
      - run: bunx playwright install --with-deps
      - run: bun run test:e2e
```

---

## Implementation Order

### Sprint 1: Foundation (Immediate)

1. [ ] Prettier setup + config
2. [ ] ESLint rules enhancement
3. [ ] Lefthook pre-commit hooks
4. [ ] Run initial format on codebase

### Sprint 2: Critical Tests

5. [ ] Vitest setup
6. [ ] Unit tests for `lib/solana/merkle.ts`
7. [ ] Unit tests for `lib/solana/staking.ts`
8. [ ] Unit tests for `lib/solana/claim.ts`

### Sprint 3: API Tests

9. [ ] Test utilities (mocks, fixtures)
10. [ ] API tests for rewards endpoints
11. [ ] API tests for upvote endpoint

### Sprint 4: E2E + CI

12. [ ] Playwright setup
13. [ ] E2E: Rewards claim flow
14. [ ] E2E: Post creation flow
15. [ ] GitHub Actions CI pipeline

### Sprint 5: Polish

16. [ ] Commit linting (if desired)
17. [ ] Coverage reporting
18. [ ] Documentation

---

## Decisions Made

| Question           | Decision                | Rationale                                                  |
| ------------------ | ----------------------- | ---------------------------------------------------------- |
| Print width        | 100                     | Matches existing code style, room for verbose Solana types |
| Semicolons         | Yes                     | 1,184 existing semicolon uses in codebase                  |
| Single quotes      | Yes                     | 3:1 ratio (432 single vs 129 double) in codebase           |
| Commit linting     | Yes (lenient)           | Discipline without friction, added 'wip' type              |
| Coverage threshold | 50% base, 80% critical  | Money math (merkle, staking) needs guarantees              |
| E2E environment    | Mock Solana in CI       | Devnet is unreliable; local can use devnet optionally      |
| Test database      | In-memory SQLite for CI | Fast, isolated, reproducible                               |

---

## Notes

- Lefthook chosen over Husky for speed (Go-based, parallel execution)
- Vitest chosen over Jest for native ESM support + Bun compatibility
- Playwright chosen over Cypress for better Next.js integration
- All tools work with Bun runtime
