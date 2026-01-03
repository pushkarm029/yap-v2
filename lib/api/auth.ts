// API Authentication utilities
// Centralizes auth checks to eliminate duplication across routes

import { NextResponse } from 'next/server';
import { auth } from '@/auth';
import { findUserById, type User } from '@/lib/database';

// ============ TYPES ============

export interface AuthResult {
  userId: string;
}

export interface AuthWithUserResult extends AuthResult {
  user: User;
}

export type AuthError = NextResponse<{ error: string; message?: string }>;

// ============ AUTH HELPERS ============

/**
 * Require authenticated session
 * Returns session info or 401 response
 */
export async function requireAuth(): Promise<AuthResult | AuthError> {
  const session = await auth();

  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  return { userId: session.user.id };
}

/**
 * Require authenticated session + invite code redeemed
 * Returns session info or 401/403 response
 */
export async function requireInvite(): Promise<AuthResult | AuthError> {
  const session = await auth();

  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  if (!session.user.invitedBy) {
    return NextResponse.json(
      { error: 'INVITE_REQUIRED', message: 'Enter an invite code to continue' },
      { status: 403 }
    );
  }

  return { userId: session.user.id };
}

/**
 * Require authenticated session + user exists in database
 * Returns session + user or error response
 */
export async function requireUser(): Promise<AuthWithUserResult | AuthError> {
  const session = await auth();

  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const user = await findUserById(session.user.id);

  if (!user) {
    return NextResponse.json(
      { error: 'User not found - Please sign out and sign in again' },
      { status: 404 }
    );
  }

  return { userId: session.user.id, user };
}

/**
 * Require authenticated session + invite + user exists
 * Full validation for protected write operations
 */
export async function requireInvitedUser(): Promise<AuthWithUserResult | AuthError> {
  const session = await auth();

  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  if (!session.user.invitedBy) {
    return NextResponse.json(
      { error: 'INVITE_REQUIRED', message: 'Enter an invite code to continue' },
      { status: 403 }
    );
  }

  const user = await findUserById(session.user.id);

  if (!user) {
    return NextResponse.json(
      { error: 'User not found - Please sign out and sign in again' },
      { status: 404 }
    );
  }

  return { userId: session.user.id, user };
}

// ============ TYPE GUARDS ============

/**
 * Type guard to check if result is an error response
 */
export function isAuthError(
  result: AuthResult | AuthWithUserResult | AuthError
): result is AuthError {
  return result instanceof NextResponse;
}
