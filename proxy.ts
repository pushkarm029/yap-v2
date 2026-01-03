import NextAuth from 'next-auth';
import authConfig from '@/auth.config';
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

// All routes except public ones require authentication

// Public routes that don't require authentication
// Feed and posts are public for FOMO, but posting requires auth + invite
const publicRoutes = [
  '/', // Home feed
  '/post', // Individual posts
  '/login',
  '/i',
  '/terms', // Terms of Service
  '/privacy', // Privacy Policy
];

const { auth } = NextAuth(authConfig);

export default async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Get session
  const session = await auth();
  const isAuthenticated = !!session;

  // Check if current route is public (allowed without auth)
  const isPublicRoute = publicRoutes.some(
    (route) => pathname === route || pathname.startsWith(route + '/')
  );

  // Allow public routes without authentication
  if (isPublicRoute) {
    return NextResponse.next();
  }

  // Redirect unauthenticated users to login page
  if (!isAuthenticated) {
    const loginUrl = new URL('/login', request.url);
    loginUrl.searchParams.set('callbackUrl', pathname);
    return NextResponse.redirect(loginUrl);
  }

  // Redirect authenticated users from login page to home
  if (pathname === '/login' && isAuthenticated) {
    return NextResponse.redirect(new URL('/', request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    // Match all request paths except:
    // - _next/static (static files)
    // - _next/image (image optimization files)
    // - favicon.ico (favicon file)
    // - public files (images, videos, etc.)
    // - all api routes (API endpoints handle auth internally)
    // - PWA files (manifest.json, sw.js, offline.html, icons, splash screens)
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|mp4|webm|mov|avi)$|api|manifest.json|manifest.webmanifest|sw.js|sw.js.map|offline.html|icons/|splash/).*)',
  ],
};
