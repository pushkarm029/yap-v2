/**
 * Design Tokens
 *
 * Centralized design values for consistent styling across the app.
 * These tokens are the single source of truth for layout, spacing, and breakpoints.
 *
 * Usage:
 *   import { BREAKPOINTS, LAYOUT } from '@/lib/design/tokens';
 */

// =============================================================================
// BREAKPOINTS
// =============================================================================

/**
 * Breakpoint values in pixels.
 * Aligned with Tailwind CSS defaults for consistency.
 *
 * Usage in CSS/Tailwind:
 *   - sm: 640px  → Small devices (landscape phones)
 *   - md: 768px  → Medium devices (tablets)
 *   - lg: 1024px → Large devices (desktops) ← PRIMARY MOBILE/DESKTOP SPLIT
 *   - xl: 1280px → Extra large devices (large desktops)
 *   - 2xl: 1536px → Extra extra large devices
 */
export const BREAKPOINTS = {
  sm: 640,
  md: 768,
  lg: 1024,
  xl: 1280,
  '2xl': 1536,
} as const;

export type Breakpoint = keyof typeof BREAKPOINTS;

// =============================================================================
// LAYOUT
// =============================================================================

/**
 * Layout dimensions in pixels.
 * Used for consistent sizing of structural elements.
 */
export const LAYOUT = {
  /** Maximum width of the main container */
  maxWidth: 1200,

  /** Left sidebar width (desktop) - Tailwind: w-52 = 208px */
  sidebarWidth: 208,

  /** Right sidebar width (desktop) - Tailwind: w-65 = 260px */
  rightSidebarWidth: 260,

  /** Maximum width of content area (feed, posts) */
  contentMaxWidth: 720,

  /** Height of mobile bottom navigation */
  mobileNavHeight: 80,

  /** Height of fixed header */
  headerHeight: 64,

  /** Mobile header height (includes safe area) */
  mobileHeaderHeight: 56,
} as const;

// =============================================================================
// SPACING
// =============================================================================

/**
 * CSS custom properties for safe areas (iOS notch, home indicator).
 * Use these in style props for proper PWA support.
 */
export const SAFE_AREAS = {
  top: 'var(--safe-area-inset-top, 0px)',
  bottom: 'var(--safe-area-inset-bottom, 0px)',
  left: 'var(--safe-area-inset-left, 0px)',
  right: 'var(--safe-area-inset-right, 0px)',
} as const;

/**
 * Common padding values with safe area awareness.
 * Use these for fixed elements that need to respect device notches.
 */
export const SAFE_PADDING = {
  top: `calc(1rem + ${SAFE_AREAS.top})`,
  bottom: `calc(1rem + ${SAFE_AREAS.bottom})`,
} as const;

// =============================================================================
// Z-INDEX
// =============================================================================

/**
 * Z-index scale for layering elements.
 * Using a defined scale prevents z-index wars.
 */
export const Z_INDEX = {
  /** Below everything */
  behind: -1,

  /** Default layer */
  base: 0,

  /** Dropdowns, tooltips */
  dropdown: 10,

  /** Sticky elements */
  sticky: 20,

  /** Fixed navigation */
  navigation: 30,

  /** Fixed header */
  header: 100,

  /** Overlays, backdrops */
  overlay: 200,

  /** Modals, drawers */
  modal: 201,

  /** Toast notifications */
  toast: 300,

  /** Maximum layer (emergency only) */
  max: 9999,
} as const;

// =============================================================================
// ANIMATION
// =============================================================================

/**
 * Animation duration values in milliseconds.
 */
export const DURATION = {
  instant: 0,
  fast: 150,
  normal: 200,
  slow: 300,
  slower: 500,
} as const;

/**
 * Easing functions for animations.
 */
export const EASING = {
  default: 'cubic-bezier(0.4, 0, 0.2, 1)',
  in: 'cubic-bezier(0.4, 0, 1, 1)',
  out: 'cubic-bezier(0, 0, 0.2, 1)',
  inOut: 'cubic-bezier(0.4, 0, 0.2, 1)',
  spring: 'cubic-bezier(0.175, 0.885, 0.32, 1.275)',
} as const;
