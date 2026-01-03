import { useEffect } from 'react';
import { usePathname } from 'next/navigation';
import { useUIStore } from '@/stores/uiStore';

/**
 * Custom hook for managing drawer state
 * Uses Zustand store for state management
 * Handles keyboard shortcuts and route changes
 */
export const useDrawer = () => {
  const pathname = usePathname();
  const isOpen = useUIStore((state) => state.isDrawerOpen);
  const open = useUIStore((state) => state.openDrawer);
  const close = useUIStore((state) => state.closeDrawer);
  const toggle = useUIStore((state) => state.toggleDrawer);

  // Close drawer on route change
  useEffect(() => {
    close();
  }, [pathname, close]);

  // Handle ESC key
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        close();
      }
    };

    if (isOpen) {
      document.addEventListener('keydown', handleEscape);
      return () => document.removeEventListener('keydown', handleEscape);
    }
  }, [isOpen, close]);

  return {
    isOpen,
    open,
    close,
    toggle,
  };
};
