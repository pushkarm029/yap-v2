/**
 * Responsive Utilities
 *
 * Declarative components for responsive rendering.
 * These replace scattered `lg:hidden` / `hidden lg:block` classes with
 * semantic, self-documenting components.
 *
 * Usage:
 *   import { Show, Hide, Responsive } from '@/lib/design/responsive';
 *
 *   // Show only on desktop (lg and above)
 *   <Show above="lg">
 *     <DesktopNav />
 *   </Show>
 *
 *   // Hide on desktop (show on mobile only)
 *   <Hide above="lg">
 *     <MobileNav />
 *   </Hide>
 *
 *   // Complex responsive logic
 *   <Responsive
 *     mobile={<MobileView />}
 *     desktop={<DesktopView />}
 *   />
 */

import { ReactNode, ElementType } from 'react';
import { Breakpoint } from './tokens';

// =============================================================================
// TYPES
// =============================================================================

interface ShowHideProps {
  /** Breakpoint threshold */
  above?: Breakpoint;
  below?: Breakpoint;
  /** Content to render */
  children: ReactNode;
  /** Additional CSS classes */
  className?: string;
  /** HTML element to render as (default: div) */
  as?: ElementType;
}

interface ResponsiveProps {
  /** Content for mobile (below lg breakpoint) */
  mobile?: ReactNode;
  /** Content for desktop (lg and above) */
  desktop?: ReactNode;
  /** Custom breakpoint for mobile/desktop split (default: lg) */
  breakpoint?: Breakpoint;
}

// =============================================================================
// UTILITY FUNCTIONS
// =============================================================================

/**
 * Get Tailwind CSS classes for showing/hiding at breakpoints.
 * Maps our semantic API to Tailwind's responsive prefixes.
 */
function getResponsiveClasses(
  mode: 'show' | 'hide',
  above?: Breakpoint,
  below?: Breakpoint
): string {
  const classes: string[] = [];

  if (mode === 'show') {
    // Show above breakpoint: hidden by default, visible at breakpoint
    if (above) {
      classes.push('hidden', `${above}:block`);
    }
    // Show below breakpoint: visible by default, hidden at breakpoint
    if (below) {
      classes.push(`${below}:hidden`);
    }
  } else {
    // Hide above breakpoint: visible by default, hidden at breakpoint
    if (above) {
      classes.push(`${above}:hidden`);
    }
    // Hide below breakpoint: hidden by default, visible at breakpoint
    if (below) {
      classes.push('hidden', `${below}:block`);
    }
  }

  return classes.join(' ');
}

// =============================================================================
// COMPONENTS
// =============================================================================

/**
 * Show content at specified breakpoints.
 *
 * @example
 * // Show only on desktop (lg and above)
 * <Show above="lg">
 *   <Sidebar />
 * </Show>
 *
 * @example
 * // Show only on mobile (below lg)
 * <Show below="lg">
 *   <MobileNav />
 * </Show>
 */
export function Show({
  above,
  below,
  children,
  className = '',
  as: Component = 'div',
}: ShowHideProps) {
  if (!above && !below) {
    // No breakpoint specified, just render children
    return <>{children}</>;
  }

  const responsiveClasses = getResponsiveClasses('show', above, below);
  const combinedClassName = `${responsiveClasses} ${className}`.trim();

  return <Component className={combinedClassName}>{children}</Component>;
}

/**
 * Hide content at specified breakpoints.
 *
 * @example
 * // Hide on desktop (visible only on mobile)
 * <Hide above="lg">
 *   <MobileNav />
 * </Hide>
 *
 * @example
 * // Hide on mobile (visible only on desktop)
 * <Hide below="lg">
 *   <DesktopFeature />
 * </Hide>
 */
export function Hide({
  above,
  below,
  children,
  className = '',
  as: Component = 'div',
}: ShowHideProps) {
  if (!above && !below) {
    // No breakpoint specified, just render children
    return <>{children}</>;
  }

  const responsiveClasses = getResponsiveClasses('hide', above, below);
  const combinedClassName = `${responsiveClasses} ${className}`.trim();

  return <Component className={combinedClassName}>{children}</Component>;
}

/**
 * Render different content for mobile vs desktop.
 * This is a convenience wrapper around Show components.
 *
 * @example
 * <Responsive
 *   mobile={<MobileHeader />}
 *   desktop={<DesktopHeader />}
 * />
 *
 * @example
 * // Custom breakpoint
 * <Responsive
 *   breakpoint="md"
 *   mobile={<TabletAndBelow />}
 *   desktop={<AboveTablet />}
 * />
 */
export function Responsive({ mobile, desktop, breakpoint = 'lg' }: ResponsiveProps) {
  return (
    <>
      {mobile && <Show below={breakpoint}>{mobile}</Show>}
      {desktop && <Show above={breakpoint}>{desktop}</Show>}
    </>
  );
}

// =============================================================================
// CSS CLASS HELPERS
// =============================================================================

/**
 * Generate responsive CSS classes for use in className props.
 * Use this when you need responsive behavior without wrapper elements.
 *
 * @example
 * <div className={showAbove('lg')}>
 *   This div is hidden on mobile, visible on desktop
 * </div>
 *
 * @example
 * <nav className={cn('p-4', hideAbove('lg'))}>
 *   This nav is visible on mobile, hidden on desktop
 * </nav>
 */
export const showAbove = (breakpoint: Breakpoint): string => `hidden ${breakpoint}:block`;

export const showBelow = (breakpoint: Breakpoint): string => `${breakpoint}:hidden`;

export const hideAbove = (breakpoint: Breakpoint): string => `${breakpoint}:hidden`;

export const hideBelow = (breakpoint: Breakpoint): string => `hidden ${breakpoint}:block`;

// =============================================================================
// BREAKPOINT VALUES (re-exported for convenience)
// =============================================================================

export { BREAKPOINTS, type Breakpoint } from './tokens';
