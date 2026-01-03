/**
 * Jitter Utilities for Batch Notifications
 *
 * Adds randomization to notification timing to:
 * - Feel less robotic/automated
 * - Spread server load
 * - Avoid spam-like notification bursts
 */

import { apiLogger } from '@/lib/logger';

const logger = apiLogger.child({ module: 'jitter' });

/**
 * Generate a random delay in milliseconds
 * @param maxMinutes Maximum jitter in minutes (default 30)
 * @returns Random delay between 0 and maxMinutes in milliseconds
 */
export function getRandomJitterMs(maxMinutes: number = 30): number {
  return Math.floor(Math.random() * maxMinutes * 60 * 1000);
}

/**
 * Sleep for a random duration
 * @param maxMinutes Maximum sleep time in minutes
 */
export async function randomDelay(maxMinutes: number = 30): Promise<void> {
  const delay = getRandomJitterMs(maxMinutes);
  if (delay > 0) {
    await new Promise((resolve) => setTimeout(resolve, delay));
  }
}

/** Result of batch processing with jitter */
export interface BatchProcessResult {
  /** Number of items that processed successfully */
  successCount: number;
  /** Number of items that failed (returned false) */
  failedCount: number;
  /** Number of items that threw errors */
  errorCount: number;
  /** Total items processed */
  totalCount: number;
}

/**
 * Process items with random jitter between each
 *
 * Instead of sending all notifications at once, spaces them out
 * with random delays to feel more natural.
 *
 * @param items Array of items to process
 * @param processFn Function to call for each item
 * @param maxJitterSeconds Maximum jitter between items in SECONDS (for batch processing, shorter than minutes)
 * @param context Optional context for logging (e.g., notification type)
 * @returns Batch processing result with success/failure/error counts
 */
export async function processWithJitter<T>(
  items: T[],
  processFn: (item: T) => Promise<boolean>,
  maxJitterSeconds: number = 5,
  context?: string
): Promise<BatchProcessResult> {
  const result: BatchProcessResult = {
    successCount: 0,
    failedCount: 0,
    errorCount: 0,
    totalCount: items.length,
  };

  for (let i = 0; i < items.length; i++) {
    // Add jitter between items (not before first)
    if (i > 0 && maxJitterSeconds > 0) {
      const jitterMs = Math.floor(Math.random() * maxJitterSeconds * 1000);
      await new Promise((resolve) => setTimeout(resolve, jitterMs));
    }

    try {
      const success = await processFn(items[i]);
      if (success) {
        result.successCount++;
      } else {
        result.failedCount++;
      }
    } catch (error) {
      result.errorCount++;
      logger.error(
        { error, itemIndex: i, context },
        'Error processing item in batch - continuing with remaining items'
      );
    }
  }

  // Log summary if there were any errors
  if (result.errorCount > 0) {
    logger.warn({ ...result, context }, 'Batch processing completed with errors');
  }

  return result;
}

/**
 * Shuffle an array randomly (Fisher-Yates algorithm)
 * Helps randomize the order of notification recipients
 */
export function shuffle<T>(array: T[]): T[] {
  const result = [...array];
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}
