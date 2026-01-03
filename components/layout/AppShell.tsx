'use client';

import dynamic from 'next/dynamic';
import { usePathname } from 'next/navigation';
import { Sidebar, MobileNav } from './navigation';
import { RightSidebar } from './widgets';
import { InviteModal } from '../auth/InviteModal';
import { useUIStore } from '@/stores/uiStore';
import { LAYOUT } from '@/lib/design/tokens';

// Lazy load heavy components that aren't needed immediately
const MobileDrawer = dynamic(() => import('./navigation/MobileDrawer'), {
  ssr: false,
});

const ComposeBox = dynamic(() => import('../posts/ComposeBox'), {
  ssr: false,
});

interface AppShellProps {
  children: React.ReactNode;
}

/**
 * AppShell - Main application layout wrapper.
 *
 * Provides the core layout structure:
 * - Desktop: Left sidebar + Content + Right sidebar
 * - Mobile: Content + Bottom nav + Drawer
 *
 * Handles responsive layout, modals, and the compose box.
 */
export default function AppShell({ children }: AppShellProps) {
  const pathname = usePathname();
  const isInviteModalOpen = useUIStore((state) => state.isInviteModalOpen);
  const closeInviteModal = useUIStore((state) => state.closeInviteModal);

  // Pages that should not show the standard layout
  const noLayoutPages = ['/login', '/terms', '/privacy'];
  const showLayout = !noLayoutPages.includes(pathname);

  const handleInviteSuccess = () => {
    closeInviteModal();
    // Reload current page to refresh session and all components
    window.location.reload();
  };

  const handleInviteCancel = () => {
    closeInviteModal();
  };

  if (!showLayout) {
    return <>{children}</>;
  }

  return (
    <>
      {isInviteModalOpen && (
        <InviteModal onSuccess={handleInviteSuccess} onCancel={handleInviteCancel} />
      )}
      <MobileDrawer />

      {/* Main Layout Container */}
      {/* pb-20 (80px) on mobile for bottom nav, lg:pb-0 on desktop */}
      <div
        className="flex min-h-screen bg-white mx-auto overflow-x-hidden pb-20 lg:pb-0"
        style={{ maxWidth: LAYOUT.maxWidth }}
      >
        <Sidebar />
        <main className="flex-1 border-r border-gray-200 overflow-x-hidden min-w-0">
          {children}
        </main>
        <RightSidebar />
      </div>

      <MobileNav />

      {/* ComposeBox - available on all authenticated pages */}
      <ComposeBox />
    </>
  );
}
