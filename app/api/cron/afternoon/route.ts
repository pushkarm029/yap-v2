import { NextRequest, NextResponse } from 'next/server';
import { apiLogger } from '@/lib/logger';
import { processAfternoonNotifications } from '@/lib/services/gamifiedNotifications';
import { getNowISO } from '@/lib/utils/dates';

const logger = apiLogger.child({ cron: 'afternoon' });

export const dynamic = 'force-dynamic';

/**
 * Afternoon Cron Job (15:00 UTC)
 *
 * Sends afternoon notifications:
 * - Expiring popular posts (posts with 10+ upvotes expiring in 24h)
 *
 * This is sent during peak activity hours to maximize engagement.
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

  logger.info('Starting afternoon cron');

  try {
    const stats = await processAfternoonNotifications();

    logger.info({ stats }, 'Afternoon cron completed');

    return NextResponse.json({
      success: true,
      notifications: { ...stats, totalSent: stats.expiringPopular },
      timestamp: getNowISO(),
    });
  } catch (error) {
    logger.error({ error }, 'Afternoon cron failed');
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
