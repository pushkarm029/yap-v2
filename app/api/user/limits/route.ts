import { NextResponse } from 'next/server';
import { auth } from '@/auth';
import { db } from '@/lib/database';
import { APP_CONFIG } from '@/constants';
import { apiLogger } from '@/lib/logger';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const totalLimit = await db.checkTotalDailyLimit(
      session.user.id,
      APP_CONFIG.DAILY_ACTION_LIMIT
    );

    return NextResponse.json({
      total: totalLimit,
    });
  } catch (error) {
    apiLogger.error({ error }, 'Error fetching user limits');
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
