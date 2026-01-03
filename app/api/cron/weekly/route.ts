import { NextRequest, NextResponse } from 'next/server';
import { apiLogger } from '@/lib/logger';
import { processWeeklySummary } from '@/lib/services/gamifiedNotifications';
import { getNowISO } from '@/lib/utils/dates';

const logger = apiLogger.child({ cron: 'weekly' });

export const dynamic = 'force-dynamic';

/**
 * Weekly Cron Job (Sunday 10:00 UTC)
 *
 * Sends weekly notifications:
 * - Weekly summary with stats (posts, upvotes, streak)
 *
 * Sent on Sunday morning to recap the week and encourage engagement.
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

  // Verify it's Sunday (0 = Sunday)
  const now = new Date();
  if (now.getUTCDay() !== 0) {
    logger.info({ dayOfWeek: now.getUTCDay() }, 'Skipping weekly cron - not Sunday');
    return NextResponse.json({
      success: true,
      skipped: true,
      reason: 'Not Sunday',
      timestamp: getNowISO(),
    });
  }

  logger.info('Starting weekly cron');

  try {
    const count = await processWeeklySummary();

    logger.info({ count }, 'Weekly cron completed');

    return NextResponse.json({
      success: true,
      notifications: { weeklySummary: count, totalSent: count },
      timestamp: getNowISO(),
    });
  } catch (error) {
    logger.error({ error }, 'Weekly cron failed');
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
