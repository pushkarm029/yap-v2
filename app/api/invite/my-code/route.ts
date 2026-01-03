import { NextResponse } from 'next/server';
import { auth } from '@/auth';
import { db } from '@/lib/database';
import { apiLogger } from '@/lib/logger';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const inviteCode = await db.getUserInviteCode(session.user.id);

    if (!inviteCode) {
      return NextResponse.json({ code: null }, { status: 200 });
    }

    return NextResponse.json({
      code: inviteCode.code,
      used_count: inviteCode.used_count,
      created_at: inviteCode.created_at,
    });
  } catch (error) {
    apiLogger.error({ error }, 'Error fetching user invite code');
    return NextResponse.json({ error: 'Failed to fetch invite code' }, { status: 500 });
  }
}
