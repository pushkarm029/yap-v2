/**
 * useBreakpoint Hook
 *
 * Programmatic breakpoint detection for cases where CSS-based
 * responsive utilities aren't sufficient.
 *
 * IMPORTANT: Prefer CSS-based solutions (<Show>, <Hide>) when possible.
 * Use this hook only when you need JS logic based on breakpoint:
 * - Conditional data fetching
 * - Animation parameters
 * - Different component behavior
 *
 * Usage:
 *   import { useBreakpoint, useIsMobile, useIsDesktop } from '@/hooks/useBreakpoint';
 *
 *   // Full breakpoint info
 *   const { breakpoint, isAbove, isBelow } = useBreakpoint();
 *   if (isAbove('lg')) { ... }
 *
 *   // Convenience hooks
 *   const isMobile = useIsMobile(); // below lg
 *   const isDesktop = useIsDesktop(); // lg and above
 */

import { useState, useEffect, useMemo, useCallback } from 'react';
import { BREAKPOINTS, Breakpoint } from '@/lib/design/tokens';

// =============================================================================
// TYPES
// =============================================================================

interface BreakpointState {
  /** Current active breakpoint (largest that matches) */
  breakpoint: Breakpoint | 'xs';
  /** Window width in pixels (0 during SSR) */
  width: number;
  /** Check if viewport is at or above a breakpoint */
  isAbove: (bp: Breakpoint) => boolean;
  /** Check if viewport is below a breakpoint */
  isBelow: (bp: Breakpoint) => boolean;
  /** Check if viewport matches a specific breakpoint range */
  isOnly: (bp: Breakpoint) => boolean;
}

// Ordered breakpoints for comparison
const BREAKPOINT_ORDER: (Breakpoint | 'xs')[] = ['xs', 'sm', 'md', 'lg', 'xl', '2xl'];

// =============================================================================
// UTILITIES
// =============================================================================

/**
 * Get the current breakpoint based on window width.
 * Returns 'xs' for widths below the smallest breakpoint.
 */
function getCurrentBreakpoint(width: number): Breakpoint | 'xs' {
  if (width >= BREAKPOINTS['2xl']) return '2xl';
  if (width >= BREAKPOINTS.xl) return 'xl';
  if (width >= BREAKPOINTS.lg) return 'lg';
  if (width >= BREAKPOINTS.md) return 'md';
  if (width >= BREAKPOINTS.sm) return 'sm';
  return 'xs';
}

/**
 * Check if we're in a browser environment.
 */
function isBrowser(): boolean {
  return typeof window !== 'undefined';
}

/**
 * Get current window width, returning 0 during SSR.
 */
function getWindowWidth(): number {
  return isBrowser() ? window.innerWidth : 0;
}

// =============================================================================
// MAIN HOOK
// =============================================================================

/**
 * Hook for programmatic breakpoint detection.
 *
 * @returns Current breakpoint state with utility functions
 *
 * @example
 * function MyComponent() {
 *   const { breakpoint, isAbove, isBelow } = useBreakpoint();
 *
 *   // Different behavior based on breakpoint
 *   const itemsPerPage = isAbove('lg') ? 20 : 10;
 *
 *   // Conditional rendering
 *   if (isBelow('md')) {
 *     return <MobileLayout />;
 *   }
 *
 *   return <DesktopLayout itemsPerPage={itemsPerPage} />;
 * }
 */
export function useBreakpoint(): BreakpointState {
  const [width, setWidth] = useState<number>(getWindowWidth);

  useEffect(() => {
    if (!isBrowser()) return;

    const handleResize = () => {
      setWidth(window.innerWidth);
    };

    // Listen for resize events
    window.addEventListener('resize', handleResize);

    // Also listen for orientation changes (mobile)
    window.addEventListener('orientationchange', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('orientationchange', handleResize);
    };
  }, []);

  const breakpoint = useMemo(() => getCurrentBreakpoint(width), [width]);

  const isAbove = useCallback(
    (bp: Breakpoint): boolean => {
      return width >= BREAKPOINTS[bp];
    },
    [width]
  );

  const isBelow = useCallback(
    (bp: Breakpoint): boolean => {
      return width < BREAKPOINTS[bp];
    },
    [width]
  );

  const isOnly = useCallback(
    (bp: Breakpoint): boolean => {
      const bpIndex = BREAKPOINT_ORDER.indexOf(bp);
      const nextBp = BREAKPOINT_ORDER[bpIndex + 1] as Breakpoint | undefined;

      const isAtOrAbove = width >= BREAKPOINTS[bp];
      const isBelowNext = nextBp ? width < BREAKPOINTS[nextBp] : true;

      return isAtOrAbove && isBelowNext;
    },
    [width]
  );

  return {
    breakpoint,
    width,
    isAbove,
    isBelow,
    isOnly,
  };
}

// =============================================================================
// CONVENIENCE HOOKS
// =============================================================================

/**
 * Check if viewport is mobile (below lg breakpoint).
 * Most common use case for responsive logic.
 *
 * @example
 * const isMobile = useIsMobile();
 * const navHeight = isMobile ? 80 : 0;
 */
export function useIsMobile(): boolean {
  const { isBelow } = useBreakpoint();
  return isBelow('lg');
}

/**
 * Check if viewport is desktop (lg breakpoint and above).
 *
 * @example
 * const isDesktop = useIsDesktop();
 * if (isDesktop) {
 *   // Fetch more data for larger screen
 * }
 */
export function useIsDesktop(): boolean {
  const { isAbove } = useBreakpoint();
  return isAbove('lg');
}

// =============================================================================
// MEDIA QUERY HOOK
// =============================================================================

/**
 * Subscribe to a specific media query.
 * Uses the browser's matchMedia API for efficient updates.
 *
 * @param query - CSS media query string
 * @returns Whether the media query currently matches
 *
 * @example
 * const prefersDark = useMediaQuery('(prefers-color-scheme: dark)');
 * const prefersReducedMotion = useMediaQuery('(prefers-reduced-motion: reduce)');
 * const isLandscape = useMediaQuery('(orientation: landscape)');
 */
export function useMediaQuery(query: string): boolean {
  const [matches, setMatches] = useState<boolean>(() => {
    if (!isBrowser()) return false;
    return window.matchMedia(query).matches;
  });

  useEffect(() => {
    if (!isBrowser()) return;

    const mediaQuery = window.matchMedia(query);

    // Set initial value
    setMatches(mediaQuery.matches);

    // Create listener
    const handler = (event: MediaQueryListEvent) => {
      setMatches(event.matches);
    };

    // Use modern addEventListener API
    mediaQuery.addEventListener('change', handler);
    return () => mediaQuery.removeEventListener('change', handler);
  }, [query]);

  return matches;
}

/**
 * Check if user prefers reduced motion.
 * Use this to disable animations for accessibility.
 *
 * @example
 * const prefersReducedMotion = usePrefersReducedMotion();
 * const animationDuration = prefersReducedMotion ? 0 : 300;
 */
export function usePrefersReducedMotion(): boolean {
  return useMediaQuery('(prefers-reduced-motion: reduce)');
}
