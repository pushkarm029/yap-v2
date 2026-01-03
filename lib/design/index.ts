/**
 * Design System
 *
 * Centralized exports for the Yap.Network design system.
 * This is the main entry point for all design-related utilities.
 *
 * Usage:
 *   import { BREAKPOINTS, LAYOUT, Show, Hide } from '@/lib/design';
 */

// Design tokens
export {
  BREAKPOINTS,
  LAYOUT,
  SAFE_AREAS,
  SAFE_PADDING,
  Z_INDEX,
  DURATION,
  EASING,
  type Breakpoint,
} from './tokens';

// Responsive utilities
export { Show, Hide, Responsive, showAbove, showBelow, hideAbove, hideBelow } from './responsive';
