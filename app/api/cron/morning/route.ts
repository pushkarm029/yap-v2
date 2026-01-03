import { NextRequest, NextResponse } from 'next/server';
import { apiLogger } from '@/lib/logger';
import { processMorningNotifications } from '@/lib/services/gamifiedNotifications';
import { getNowISO } from '@/lib/utils/dates';

const logger = apiLogger.child({ cron: 'morning' });

export const dynamic = 'force-dynamic';

/**
 * Morning Cron Job (08:00 UTC)
 *
 * Sends morning notifications:
 * - Engagement nudges for inactive users (2+ days)
 * - Claim reminders for unclaimed YAP rewards
 *
 * These are best sent in the morning to encourage daily activity.
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

  logger.info('Starting morning cron');

  try {
    const stats = await processMorningNotifications();
    const totalSent = stats.engagementNudges + stats.claimReminders;

    logger.info({ stats, totalSent }, 'Morning cron completed');

    return NextResponse.json({
      success: true,
      notifications: { ...stats, totalSent },
      timestamp: getNowISO(),
    });
  } catch (error) {
    logger.error({ error }, 'Morning cron failed');
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
