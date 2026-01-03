/**
 * Hooks Barrel Export
 *
 * Centralized exports for all custom hooks.
 * Usage: import { useDrawer, useFeed, useBreakpoint } from '@/hooks';
 */

// =============================================================================
// UI & STATE MANAGEMENT
// =============================================================================
export { useDrawer } from './useDrawer';
export { useToast, type Toast, type ToastType } from './useToast';

// =============================================================================
// UTILITY HOOKS (Debouncing, Throttling, etc.)
// =============================================================================
export { useDebounced, useDebouncedCallback, useLeadingDebouncedCallback } from './useDebounced';

// =============================================================================
// OPTIMISTIC UI (Immediate feedback with debounced server sync)
// =============================================================================
export { useOptimisticUpvote, useOptimisticFollow, type AnimationTrigger } from './optimistic';

// =============================================================================
// RESPONSIVE & VIEWPORT
// =============================================================================
export {
  useBreakpoint,
  useIsMobile,
  useIsDesktop,
  useMediaQuery,
  usePrefersReducedMotion,
} from './useBreakpoint';
export { useIntersectionObserver } from './useIntersectionObserver';

// =============================================================================
// PWA & BROWSER
// =============================================================================
export { usePushNotifications } from './usePushNotifications';
export { useStandalone } from './useStandalone';

// =============================================================================
// FILE & MEDIA
// =============================================================================
export { useImageUpload, type UseImageUploadReturn } from './useImageUpload';

// =============================================================================
// DATA FETCHING (TanStack Query)
// =============================================================================
export * from './queries';
