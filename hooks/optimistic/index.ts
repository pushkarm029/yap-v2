/**
 * Optimistic UI Hooks
 *
 * These hooks provide immediate UI feedback with debounced server sync.
 * Use for toggle-style interactions (upvote, follow, like, etc.)
 */

export { useOptimisticUpvote } from './useOptimisticUpvote';
export { useOptimisticFollow } from './useOptimisticFollow';
export { DEBOUNCE_MS, type AnimationTrigger } from './types';
