// ============================================================================
// DATABASE FACADE - Thin re-export layer for backward compatibility
// ============================================================================
//
// This file now re-exports from the modularized database/ directory.
// All actual implementations live in lib/database/*.ts
//
// Consumers can continue using:
//   import { db } from '@/lib/database'
//   import { User, Post } from '@/lib/database'
//
// Or the new granular imports:
//   import { findUserById, createPost } from '@/lib/database'
//   import { db } from '@/lib/database/index'
//
// Domain modules:
//   - users.ts     - User CRUD, search, streaks
//   - posts.ts     - Post CRUD, queries, pagination
//   - upvotes.ts   - Upvote transactions, vote weight
//   - comments.ts  - Comment operations
//   - notifications.ts - Social & gamified notifications
//   - rewards.ts   - Distributions, claims, wallet snapshots
//   - follows.ts   - Follow/unfollow operations
//   - invites.ts   - Invite code management
//   - push.ts      - Push subscription operations
//   - limits.ts    - Daily action limits
// ============================================================================

// Re-export everything from the modularized database directory
export * from './database/index';

// Default export for: import db from '@/lib/database'
export { default } from './database/index';
