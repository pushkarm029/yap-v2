'use client';

import { signOut, useSession } from 'next-auth/react';
import { getVisibleNavItems, AUTH_ITEMS } from '@/config/navigation';
import NotificationBadge from '../../notifications/NotificationBadge';
import NavItem from './NavItem';
import { Show } from '@/lib/design';
import { LAYOUT } from '@/lib/design/tokens';

/**
 * Desktop left sidebar navigation.
 * Only visible at lg breakpoint and above.
 */
export default function Sidebar() {
  const { status } = useSession();
  const isAuthenticated = status === 'authenticated';
  const visibleNavItems = getVisibleNavItems(isAuthenticated, 'sidebar');

  const handleSignOut = () => {
    signOut({ callbackUrl: '/' });
  };

  return (
    <Show above="lg">
      <div
        className="h-screen sticky top-0 px-4 border-r border-gray-200"
        style={{ width: LAYOUT.sidebarWidth }}
      >
        <div className="py-4 my-4">
          <h1 className="text-xl font-semibold tracking-tight text-blue-500 px-4">Yap.Network</h1>
        </div>

        <nav className="flex flex-col gap-2">
          {visibleNavItems.map((item) => (
            <NavItem
              key={item.href}
              icon={item.icon}
              label={item.label}
              href={item.href}
              badge={
                item.label === 'Notifications' && isAuthenticated ? (
                  <NotificationBadge />
                ) : undefined
              }
            />
          ))}

          {isAuthenticated ? (
            <NavItem
              icon={AUTH_ITEMS.signOut.icon}
              label={AUTH_ITEMS.signOut.label}
              href={AUTH_ITEMS.signOut.href}
              onClick={handleSignOut}
              className="flex items-center gap-3 px-3 py-3 rounded-full transition-colors hover:bg-red-50 text-red-600 hover:text-red-700 mt-4"
            />
          ) : (
            <NavItem
              icon={AUTH_ITEMS.signIn.icon}
              label={AUTH_ITEMS.signIn.label}
              href={AUTH_ITEMS.signIn.href}
              className="flex items-center gap-3 px-3 py-3 rounded-full transition-colors hover:bg-blue-50 text-blue-600 hover:text-blue-700 mt-4"
            />
          )}
        </nav>
      </div>
    </Show>
  );
}
