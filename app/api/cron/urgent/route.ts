import { NextRequest, NextResponse } from 'next/server';
import { apiLogger } from '@/lib/logger';
import { processUrgentNotifications } from '@/lib/services/gamifiedNotifications';
import { getNowISO } from '@/lib/utils/dates';

const logger = apiLogger.child({ cron: 'urgent' });

export const dynamic = 'force-dynamic';

/**
 * Urgent Cron Job (23:00 UTC)
 *
 * Sends urgent notifications:
 * - 1-hour streak warnings (last chance before midnight!)
 *
 * This is the final warning before users lose their streaks at midnight UTC.
 * Sent with urgency to maximize streak saves.
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

  logger.info('Starting urgent cron');

  try {
    const stats = await processUrgentNotifications();

    logger.info({ stats }, 'Urgent cron completed');

    return NextResponse.json({
      success: true,
      notifications: { ...stats, totalSent: stats.streakWarnings1h },
      timestamp: getNowISO(),
    });
  } catch (error) {
    logger.error({ error }, 'Urgent cron failed');
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
