'use client';

import { Edit3 } from 'lucide-react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useSession } from 'next-auth/react';
import Image from 'next/image';
import { getVisibleNavItems } from '@/config/navigation';
import NotificationBadge from '../../notifications/NotificationBadge';
import { useUIStore } from '@/stores/uiStore';
import { Hide } from '@/lib/design';
import { Z_INDEX, SAFE_AREAS } from '@/lib/design/tokens';

/**
 * Mobile bottom navigation bar.
 * Only visible below lg breakpoint.
 * Uses centralized navigation config for consistency with sidebar.
 */
export default function MobileNav() {
  const pathname = usePathname();
  const { data: session, status } = useSession();
  const isAuthenticated = status === 'authenticated';
  const visibleNavItems = getVisibleNavItems(isAuthenticated, 'mobile');
  const openCompose = useUIStore((state) => state.openCompose);

  return (
    <Hide above="lg">
      <div
        className="fixed bottom-0 left-0 right-0 px-4 pb-4"
        style={{
          zIndex: Z_INDEX.navigation,
          paddingBottom: `calc(1rem + ${SAFE_AREAS.bottom})`,
        }}
      >
        <div className="flex items-center gap-3 max-w-md mx-auto">
          {/* Navigation Capsule */}
          <div className="flex-1 glass-light rounded-full shadow-lg">
            <div className="flex justify-around px-2 py-2">
              {visibleNavItems.map((item) => {
                const Icon = item.icon;
                const isActive = pathname === item.href;

                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    aria-label={item.label}
                    className={`relative flex items-center justify-center min-h-[44px] min-w-[44px] rounded-full transition-all ${
                      isActive
                        ? 'text-blue-500 bg-blue-50'
                        : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
                    }`}
                  >
                    {/* Show user profile image for Profile tab if available */}
                    {item.label === 'Profile' && session?.user?.image ? (
                      <div className="w-6 h-6 rounded-full overflow-hidden">
                        <Image
                          src={session.user.image}
                          alt="Profile"
                          width={24}
                          height={24}
                          className="w-full h-full object-cover"
                        />
                      </div>
                    ) : (
                      <Icon size={20} />
                    )}

                    {/* Notification Badge */}
                    {item.label === 'Notifications' && isAuthenticated && <NotificationBadge />}
                  </Link>
                );
              })}
            </div>
          </div>

          {/* Yap Sphere Button with Vote Power - only for authenticated users */}
          {isAuthenticated && (
            <div className="relative flex-shrink-0">
              <button
                onClick={openCompose}
                className="glass-light w-14 h-14 rounded-full shadow-lg flex items-center justify-center text-blue-500 hover:text-blue-600 hover:shadow-xl transition-all active:scale-95"
                aria-label="Create post"
              >
                <Edit3 size={22} strokeWidth={2.5} />
              </button>
            </div>
          )}
        </div>
      </div>
    </Hide>
  );
}
