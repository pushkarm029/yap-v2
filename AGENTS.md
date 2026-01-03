# AI Agent Guidelines for Yap.Network

This document captures principles for making this codebase AI-agent-friendly, based on real-world experience and industry best practices.

---

## Core Philosophy

AI agents amplify your codebase's best AND worst tendencies. The guardrails you set determine the quality of output. With solid guardrails, agents bounce around tirelessly until the only path out is the correct one.

---

## 100% Code Coverage

**This is our most valuable investment.**

Coverage isn't strictly about bug prevention—it's about guaranteeing the agent has double-checked the behavior of every line of code it wrote.

### Why 100%?

- At 95%, you're still making decisions about what's "important enough" to test
- At 99.99%, you don't know if that uncovered line was there before your changes
- At 100%, there's a **phase change**—all ambiguity goes away
- The coverage report becomes a simple todo list

### Benefits

- Unreachable code gets deleted
- Edge cases are made explicit
- Code reviews show concrete examples of expected behavior
- Agents can't stop at "this seems right"—they must back it up with executable examples

### Current Status

- **Target**: 100%
- **Current**: 23% (151 tests)
- **Enforcement**: Global 100% thresholds in `vitest.config.ts`, CI runs `test:coverage`
- **Strategy**: Systematic test addition by domain (database → API → services → hooks)

---

## File Organization as Interface

The filesystem IS the agent's navigation tool. Treat directory structure with the same care as any other API.

### Good Examples

```
./billing/invoices/compute.ts      # Clear purpose
./database/users.ts                # Domain module
./api/auth.ts                      # Grouped utilities
```

### Bad Examples

```
./utils/helpers.ts                 # Generic dumping ground
./lib/database.ts (2,478 lines)    # Monolith
./components/BigComponent.tsx      # Too much responsibility
```

### Guidelines

- **Prefer many small, well-scoped files** (<200 lines)
- Small files = full context loading (no truncation)
- File names should answer "what is this?" at a glance

---

## Semantic Type Names

Push meaning into type names. Generic names like `T` are fine for algorithms, but business code needs semantic clarity.

### Good

```typescript
type UserId = string & { __brand: 'UserId' };
type WalletAddress = string & { __brand: 'WalletAddress' };
type SignedWebhookPayload = { ... };
```

### Bad

```typescript
type T = string;
type Data = { ... };
type Response = any;
```

### Benefits

- Agents immediately understand what they're dealing with
- Easy to search for related code
- Type errors become meaningful

---

## Fast, Ephemeral, Concurrent Dev Environments

### Fast

Quality checks must run quickly because they run constantly.

```bash
# Every test run should:
# - Create fresh database
# - Run migrations
# - Execute full suite
# Target: < 2 minutes for 150+ tests
```

### Ephemeral

Spinning up/tearing down environments must be fully automated.

```bash
# One command = fresh, working environment + agent ready
# No manual tinkering, no config editing
```

### Concurrent

Multiple environments must run simultaneously without conflict:

- Configurable ports via `PORT` env variable
- Unique database names per environment
- No shared state that could cause cross-talk
- **Worktree script**: `./scripts/new-feature.sh <name>` creates isolated dev environment

---

## End-to-End Type Safety

### TypeScript

- Use strict mode
- Represent business rules in the type system
- Avoid `any` and `unknown` where possible

### Database

- Postgres type system for invariants
- Checks and triggers for complex rules
- Type-safe query builders (we use libsql + custom mappers)

### API

- OpenAPI for contract definitions
- Generated clients for type agreement
- Validation at system boundaries

---

## Patterns We Use

### Discriminated Unions for Results

```typescript
type ValidationResult<T> = { ok: true; value: T } | { ok: false; error: NextResponse };

// Usage: TypeScript knows error exists when ok is false
if (!result.ok) return result.error;
const value = result.value; // Type-safe
```

### Domain Modules

```
lib/database/
├── users.ts        # User CRUD, search, stats
├── posts.ts        # Post operations
├── rewards.ts      # Reward calculations
├── types.ts        # Shared types + mappers
└── index.ts        # Barrel export + unified `db`
```

### API Utilities

```typescript
// Before: 24 lines of auth boilerplate per route
// After: 3 lines
const authResult = await requireInvitedUser();
if (isAuthError(authResult)) return authResult;
const { userId, user } = authResult;
```

---

## What Makes Code Agent-Friendly

| Property         | Why It Matters                        |
| ---------------- | ------------------------------------- |
| Small files      | Full context loading, no truncation   |
| Clear names      | Agents understand intent immediately  |
| Strong types     | Reduces search space of valid actions |
| Fast tests       | Can run constantly without slowdown   |
| 100% coverage    | No ambiguity about what needs testing |
| Isolated modules | Changes don't cascade unpredictably   |

---

## Anti-Patterns to Avoid

1. **Monolith files** - Agents struggle with large context
2. **Generic helpers** - `utils.ts` tells agents nothing
3. **Weak types** - `any` invites incorrect assumptions
4. **Slow tests** - Agents won't wait, or will skip
5. **Manual setup** - Agents can't spin up environments
6. **Implicit state** - Agents can't reason about hidden dependencies

---

## References

- [AI Is Forcing Us To Write Good Code](https://bitsoflogic.substack.com/) - Bits of Logic
- See `CLAUDE.md` for project-specific context
- See plan file for restructuring roadmap
