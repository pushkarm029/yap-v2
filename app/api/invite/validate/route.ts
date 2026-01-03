import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { db } from '@/lib/database';
import { apiLogger } from '@/lib/logger';
import { APP_CONFIG } from '@/constants';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { code } = body;

    if (!code || typeof code !== 'string') {
      return NextResponse.json({ valid: false, error: 'Invite code is required' }, { status: 400 });
    }

    // Normalize code
    const normalizedCode = code.toUpperCase().startsWith(APP_CONFIG.INVITE_CODE_PREFIX)
      ? code.toUpperCase()
      : `${APP_CONFIG.INVITE_CODE_PREFIX}${code.toUpperCase()}`;

    // Validate code exists and is active
    const validation = await db.validateInviteCode(normalizedCode);

    if (!validation.valid) {
      apiLogger.warn({ code: normalizedCode }, 'Invalid or inactive invite code');
      return NextResponse.json(
        { valid: false, error: 'Invalid or inactive invite code' },
        { status: 400 }
      );
    }

    // Store in secure httpOnly cookie (5 minute expiry)
    const cookieStore = await cookies();
    cookieStore.set('pendingInviteCode', normalizedCode, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 60 * 5, // 5 minutes
      path: '/',
    });

    apiLogger.info({ code: normalizedCode }, 'Invite code validated and stored');

    return NextResponse.json({ valid: true });
  } catch (error) {
    apiLogger.error({ error }, 'Error validating invite code');
    return NextResponse.json({ valid: false, error: 'Internal server error' }, { status: 500 });
  }
}
