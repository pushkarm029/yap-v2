/**
 * Layout Components
 *
 * Core layout structure for the app.
 *
 * Structure:
 *   layout/
 *   ├── AppShell.tsx       - Main app wrapper with sidebars
 *   ├── PageHeader.tsx     - Responsive page header (mobile pill + desktop sticky)
 *   ├── DesktopHeader.tsx  - Configurable desktop header for page titles
 *   ├── navigation/        - Navigation components (Sidebar, MobileNav, etc.)
 *   └── widgets/           - Sidebar widgets (RightSidebar, UserInviteCode)
 */

// Core layout
export { default as AppShell } from './AppShell';
export { default as PageHeader } from './PageHeader';
export { default as DesktopHeader } from './DesktopHeader';

// Navigation (re-export for convenience)
export { Sidebar, MobileNav, MobileDrawer, NavItem } from './navigation';

// Widgets (re-export for convenience)
export { RightSidebar, UserInviteCode } from './widgets';
