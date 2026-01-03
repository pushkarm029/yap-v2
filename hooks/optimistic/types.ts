/**
 * Shared types and constants for optimistic UI hooks
 */

/** Debounce delay before sending to server (ms) */
export const DEBOUNCE_MS = 200;

/** Animation trigger states for upvote animations */
export type AnimationTrigger = 'upvote' | 'remove' | null;
