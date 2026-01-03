'use client';

import { ReactNode } from 'react';
import { AuthButton } from '@/components/auth';
import { Z_INDEX, SAFE_PADDING, LAYOUT } from '@/lib/design/tokens';

interface DesktopHeaderProps {
  /** Page title displayed in the header */
  title: string;
  /**
   * Header positioning:
   * - 'fixed': Full viewport width, centered content (explore, notifications)
   * - 'sticky': Content-width, stays within column (rewards, settings)
   */
  position?: 'fixed' | 'sticky';
  /** Custom content for the right side (defaults to AuthButton) */
  rightContent?: ReactNode;
}

/**
 * Shared desktop header component for authenticated pages.
 *
 * Two layout modes:
 * - Fixed: Spans full viewport width with centered content (max-width constrained)
 * - Sticky: Stays within the content column, no max-width needed
 */
export default function DesktopHeader({
  title,
  position = 'sticky',
  rightContent,
}: DesktopHeaderProps) {
  const isFixed = position === 'fixed';

  const positionClasses = isFixed ? 'fixed top-0 left-0 right-0' : 'sticky top-0';

  const zIndex = isFixed ? Z_INDEX.header : Z_INDEX.sticky;

  return (
    <header
      className={`hidden lg:block glass-light shadow-sm p-4 ${positionClasses}`}
      style={{
        zIndex,
        paddingTop: isFixed ? SAFE_PADDING.top : undefined,
      }}
    >
      <div
        className={`flex items-center justify-between ${isFixed ? 'mx-auto' : ''}`}
        style={isFixed ? { maxWidth: LAYOUT.contentMaxWidth } : undefined}
      >
        <h1 className="text-xl font-bold">{title}</h1>
        {rightContent ?? <AuthButton />}
      </div>
    </header>
  );
}
