import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@libsql/client';
import { S3Client, DeleteObjectCommand } from '@aws-sdk/client-s3';
import { apiLogger } from '@/lib/logger';
import { processPreDistributionNotifications } from '@/lib/services/gamifiedNotifications';
import { getNowISO } from '@/lib/utils/dates';

const logger = apiLogger.child({ cron: 'pre-distribution' });

// Cleanup configuration
const EXPIRY_DAYS = 7;
const DAILY_ACTIONS_RETENTION_DAYS = 30;
const NOTIFICATIONS_RETENTION_DAYS = 30;

export const dynamic = 'force-dynamic';

interface CleanupStats {
  deletedPosts: number;
  deletedImages: number;
  deletedDailyActions: number;
  deletedNotifications: number;
}

/**
 * Run cleanup operations: expired posts, R2 images, old daily_actions, read notifications
 */
async function runCleanup(): Promise<CleanupStats> {
  const cleanupLogger = logger.child({ phase: 'cleanup' });

  const databaseUrl = process.env.TURSO_DATABASE_URL;
  const authToken = process.env.TURSO_AUTH_TOKEN;

  if (!databaseUrl || !authToken) {
    throw new Error('Database credentials not configured');
  }

  const db = createClient({ url: databaseUrl, authToken });

  const stats: CleanupStats = {
    deletedPosts: 0,
    deletedImages: 0,
    deletedDailyActions: 0,
    deletedNotifications: 0,
  };

  // Step 1: Find posts with images to delete
  cleanupLogger.info('Finding posts with images to delete');
  const postsWithImages = await db.execute(
    `SELECT image_url FROM posts
     WHERE created_at < datetime('now', '-${EXPIRY_DAYS} days')
     AND image_url IS NOT NULL`
  );

  // Step 2: Delete images from R2
  if (postsWithImages.rows.length > 0) {
    cleanupLogger.info({ count: postsWithImages.rows.length }, 'Deleting images from R2');

    const r2AccountId = process.env.R2_ACCOUNT_ID;
    const r2AccessKeyId = process.env.R2_ACCESS_KEY_ID;
    const r2SecretAccessKey = process.env.R2_SECRET_ACCESS_KEY;
    const bucketName = process.env.R2_BUCKET_NAME;

    if (r2AccountId && r2AccessKeyId && r2SecretAccessKey && bucketName) {
      const r2Client = new S3Client({
        region: 'auto',
        endpoint: `https://${r2AccountId}.r2.cloudflarestorage.com`,
        credentials: {
          accessKeyId: r2AccessKeyId,
          secretAccessKey: r2SecretAccessKey,
        },
      });

      for (const row of postsWithImages.rows) {
        try {
          const imageUrl = row.image_url as string;
          const url = new URL(imageUrl);
          const key = url.pathname.substring(1);

          await r2Client.send(
            new DeleteObjectCommand({
              Bucket: bucketName,
              Key: key,
            })
          );
          stats.deletedImages++;
        } catch (error) {
          cleanupLogger.warn({ error, imageUrl: row.image_url }, 'Failed to delete image from R2');
        }
      }
    } else {
      cleanupLogger.warn('R2 credentials not configured, skipping image deletion');
    }
  }

  // Step 3: Delete expired posts (cascades upvotes and notifications)
  cleanupLogger.info('Deleting expired posts');
  const postsResult = await db.execute(
    `DELETE FROM posts WHERE created_at < datetime('now', '-${EXPIRY_DAYS} days')`
  );
  stats.deletedPosts = postsResult.rowsAffected;

  // Step 4: Delete old daily_actions
  cleanupLogger.info('Cleaning up old daily_actions');
  const actionsResult = await db.execute(
    `DELETE FROM daily_actions WHERE action_date < date('now', '-${DAILY_ACTIONS_RETENTION_DAYS} days')`
  );
  stats.deletedDailyActions = actionsResult.rowsAffected;

  // Step 5: Delete old read notifications
  cleanupLogger.info('Cleaning up old read notifications');
  const notificationsResult = await db.execute(
    `DELETE FROM notifications
     WHERE is_read = 1
     AND created_at < datetime('now', '-${NOTIFICATIONS_RETENTION_DAYS} days')`
  );
  stats.deletedNotifications = notificationsResult.rowsAffected;

  cleanupLogger.info(stats, 'Cleanup phase completed');
  return stats;
}

/**
 * Pre-Distribution Cron Job (21:00 UTC)
 *
 * Runs 3 hours before midnight to:
 *
 * 1. Cleanup Phase:
 *    - Delete expired posts (>7 days old)
 *    - Delete associated R2 images
 *    - Purge old daily_actions (>30 days)
 *    - Purge old read notifications (>30 days)
 *
 * 2. Pre-Distribution Notifications:
 *    - Wallet connect reminders (before distribution)
 *    - 3-hour streak warnings
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

  logger.info('Starting pre-distribution cron');

  let cleanupStats: CleanupStats | null = null;
  let notificationStats: { walletConnectReminders: number; streakWarnings3h: number } | null = null;
  let cleanupError: string | null = null;
  let notificationError: string | null = null;

  // Phase 1: Cleanup
  try {
    cleanupStats = await runCleanup();
  } catch (error) {
    cleanupError = error instanceof Error ? error.message : 'Unknown error';
    logger.error({ error }, 'Cleanup phase failed');
  }

  // Phase 2: Pre-Distribution Notifications
  try {
    notificationStats = await processPreDistributionNotifications();
  } catch (error) {
    notificationError = error instanceof Error ? error.message : 'Unknown error';
    logger.error({ error }, 'Notifications phase failed');
  }

  const totalNotificationsSent = notificationStats
    ? notificationStats.walletConnectReminders + notificationStats.streakWarnings3h
    : 0;

  logger.info(
    {
      cleanup: cleanupStats,
      notifications: notificationStats,
      totalNotificationsSent,
      cleanupError,
      notificationError,
    },
    'Pre-distribution cron completed'
  );

  const hasError = cleanupError || notificationError;
  const hasSuccess = cleanupStats || notificationStats;

  return NextResponse.json(
    {
      success: !hasError,
      partialSuccess: hasError && hasSuccess,
      cleanup: cleanupStats,
      notifications: notificationStats
        ? { ...notificationStats, totalSent: totalNotificationsSent }
        : null,
      errors: hasError
        ? {
            cleanup: cleanupError,
            notifications: notificationError,
          }
        : undefined,
      timestamp: getNowISO(),
    },
    { status: hasError && !hasSuccess ? 500 : 200 }
  );
}
