import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { db } from '@/lib/database';
import { apiLogger } from '@/lib/logger';
import { APP_CONFIG } from '@/constants';
import { generateInviteCode } from '@/lib/utils/invite';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  try {
    // Require authentication
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json(
        { success: false, error: 'Authentication required' },
        { status: 401 }
      );
    }

    // Check if user already has invite
    if (session.user.invitedBy) {
      return NextResponse.json(
        { success: false, error: 'You already have an active invite' },
        { status: 400 }
      );
    }

    const body = await request.json();
    const { code } = body;

    if (!code || typeof code !== 'string') {
      return NextResponse.json(
        { success: false, error: 'Invite code is required' },
        { status: 400 }
      );
    }

    // Normalize code
    const normalizedCode = code.toUpperCase().startsWith(APP_CONFIG.INVITE_CODE_PREFIX)
      ? code.toUpperCase()
      : `${APP_CONFIG.INVITE_CODE_PREFIX}${code.toUpperCase()}`;

    // Validate code exists and is active
    const validation = await db.validateInviteCode(normalizedCode);

    if (!validation.valid || !validation.inviterId) {
      apiLogger.warn(
        { code: normalizedCode, userId: session.user.id },
        'Invalid or inactive invite code'
      );
      return NextResponse.json(
        { success: false, error: 'Invalid or inactive invite code' },
        { status: 400 }
      );
    }

    // Prevent self-invitation
    if (validation.inviterId === session.user.id) {
      return NextResponse.json(
        { success: false, error: 'You cannot use your own invite code' },
        { status: 400 }
      );
    }

    try {
      // Link invite to user
      await db.linkInvite(session.user.id, validation.inviterId);

      // Increment inviter's usage count
      await db.incrementInviteUsage(normalizedCode);

      // Generate invite code for this user so they can invite others
      const newUserCode = generateInviteCode();
      await db.createInviteCodeForUser(session.user.id, newUserCode);

      apiLogger.info(
        {
          userId: session.user.id,
          inviterId: validation.inviterId,
          code: normalizedCode,
          newUserCode,
        },
        'User redeemed invite code and received their own code'
      );

      return NextResponse.json({ success: true });
    } catch (error) {
      apiLogger.error({ error, userId: session.user.id }, 'Failed to redeem invite code');
      return NextResponse.json(
        { success: false, error: 'Failed to redeem invite code' },
        { status: 500 }
      );
    }
  } catch (error) {
    apiLogger.error({ error }, 'Error in redeem invite endpoint');
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 });
  }
}
