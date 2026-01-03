/**
 * Layout for public auth-related routes.
 *
 * This is a passthrough layout - the actual layout handling is done
 * by AppShell which excludes these paths from the main layout.
 *
 * Routes in this group:
 * - /login - Authentication page
 * - /terms - Terms of Service
 * - /privacy - Privacy Policy
 */
export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
