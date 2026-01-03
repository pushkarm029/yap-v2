import { Home, Search, Bell, User, HelpCircle, LogOut, LogIn, Coins } from 'lucide-react';
import { LucideIcon } from 'lucide-react';

export interface NavItem {
  icon: LucideIcon;
  label: string;
  href: string;
  requiresAuth: boolean;
  showInMobile?: boolean;
  showInSidebar?: boolean;
}

/**
 * Centralized navigation configuration
 * Single source of truth for all navigation items across the app
 */
export const NAV_ITEMS: NavItem[] = [
  {
    icon: Home,
    label: 'Home',
    href: '/',
    requiresAuth: false,
    showInMobile: true,
    showInSidebar: true,
  },
  {
    icon: Search,
    label: 'Explore',
    href: '/explore',
    requiresAuth: true,
    showInMobile: true,
    showInSidebar: true,
  },
  {
    icon: Bell,
    label: 'Notifications',
    href: '/notifications',
    requiresAuth: true,
    showInMobile: true,
    showInSidebar: true,
  },
  {
    icon: User,
    label: 'Profile',
    href: '/profile',
    requiresAuth: true,
    showInMobile: true,
    showInSidebar: true,
  },
  {
    icon: Coins,
    label: 'Rewards',
    href: '/rewards',
    requiresAuth: true,
    showInMobile: false,
    showInSidebar: true,
  },
  {
    icon: HelpCircle,
    label: 'Help & Feedback',
    href: '/feedback',
    requiresAuth: false,
    showInMobile: false,
    showInSidebar: true,
  },
];

/**
 * Auth action items (Sign In/Out)
 */
export const AUTH_ITEMS = {
  signIn: {
    icon: LogIn,
    label: 'Sign In',
    href: '/login',
  },
  signOut: {
    icon: LogOut,
    label: 'Sign Out',
    href: '#',
  },
};

/**
 * Filter navigation items based on authentication status and display context
 */
export const getVisibleNavItems = (
  isAuthenticated: boolean,
  context: 'mobile' | 'sidebar' = 'sidebar'
): NavItem[] => {
  return NAV_ITEMS.filter((item) => {
    // Check auth requirement
    const authCheck = isAuthenticated || !item.requiresAuth;

    // Check display context
    const contextCheck =
      context === 'mobile' ? item.showInMobile !== false : item.showInSidebar !== false;

    return authCheck && contextCheck;
  });
};
