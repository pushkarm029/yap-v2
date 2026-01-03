'use client';

import Image from 'next/image';
import Link from 'next/link';
import { Session } from 'next-auth';
import { useUIStore } from '@/stores/uiStore';
import ActionLimitsIndicator from '../ui/ActionLimitsIndicator';
import { Responsive } from '@/lib/design';
import { Z_INDEX, SAFE_AREAS } from '@/lib/design/tokens';

interface PageHeaderProps {
  session: Session | null;
}

/**
 * Mobile header - Pill-shaped floating design with logo, brand, and action limits.
 */
function MobileHeader({ session }: PageHeaderProps) {
  const openDrawer = useUIStore((state) => state.openDrawer);

  return (
    <div
      className="fixed top-0 left-0 right-0 px-4 py-3"
      style={{
        zIndex: Z_INDEX.header,
        paddingTop: `calc(0.75rem + ${SAFE_AREAS.top})`,
      }}
    >
      <div className="glass-light rounded-full shadow-lg p-2 flex items-center justify-between">
        {/* Logo button - opens drawer */}
        <button
          onClick={openDrawer}
          aria-label="Open navigation menu"
          className="w-10 h-10 rounded-full overflow-hidden shadow-sm flex items-center justify-center hover:shadow-md transition-all active:scale-95 flex-shrink-0"
        >
          <Image
            src="/logo.png"
            alt="Yap Logo"
            width={40}
            height={40}
            className="w-full h-full object-cover"
          />
        </button>

        {/* Brand - Center */}
        <Link
          href="/"
          aria-label="Go to home"
          className="hover:opacity-80 transition-opacity active:scale-95 flex-shrink-0"
        >
          <span className="text-brand-logo text-lg text-gray-900">Yap.Network</span>
        </Link>

        {/* Action Limits Indicator */}
        <div
          className="flex-shrink-0 min-w-[88px] flex items-center justify-end"
          role="presentation"
        >
          {session?.user && <ActionLimitsIndicator />}
        </div>
      </div>
    </div>
  );
}

/**
 * Desktop header - Sticky header within content column.
 * Does NOT overlap sidebars - stays within the content area.
 */
function DesktopHeader({ session }: PageHeaderProps) {
  return (
    <div
      className="sticky top-0 bg-white/80 backdrop-blur-md border-b border-gray-100 p-4"
      style={{ zIndex: Z_INDEX.sticky }}
    >
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold">Hot 🔥</h1>
        {session?.user && <ActionLimitsIndicator />}
      </div>
    </div>
  );
}

/**
 * Unified PageHeader component.
 * Renders mobile or desktop variant based on viewport.
 */
export default function PageHeader({ session }: PageHeaderProps) {
  return (
    <Responsive
      mobile={<MobileHeader session={session} />}
      desktop={<DesktopHeader session={session} />}
    />
  );
}
