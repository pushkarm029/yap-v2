import { NextRequest, NextResponse } from 'next/server';
import { apiLogger } from '@/lib/logger';
import { processEveningNotifications } from '@/lib/services/gamifiedNotifications';
import { getNowISO } from '@/lib/utils/dates';

const logger = apiLogger.child({ cron: 'evening' });

export const dynamic = 'force-dynamic';

/**
 * Evening Cron Job (18:00 UTC)
 *
 * Sends evening notifications:
 * - Streak broken notifications (for users who lost their streak)
 *
 * Sent in the evening so users can reflect and plan to rebuild tomorrow.
 */
export async function GET(request: NextRequest) {
  const authHeader = request.headers.get('authorization');
  const cronSecret = process.env.CRON_SECRET;

  if (!cronSecret) {
    logger.error('CRON_SECRET environment variable is not set');
    return NextResponse.json({ error: 'Server configuration error' }, { status: 500 });
  }

  if (authHeader !== `Bearer ${cronSecret}`) {
    logger.warn({ hasAuthHeader: !!authHeader }, 'Unauthorized cron job attempt');
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  logger.info('Starting evening cron');

  try {
    const stats = await processEveningNotifications();

    logger.info({ stats }, 'Evening cron completed');

    return NextResponse.json({
      success: true,
      notifications: { ...stats, totalSent: stats.streakBroken },
      timestamp: getNowISO(),
    });
  } catch (error) {
    logger.error({ error }, 'Evening cron failed');
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        timestamp: getNowISO(),
      },
      { status: 500 }
    );
  }
}
