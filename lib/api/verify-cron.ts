import { NextRequest, NextResponse } from 'next/server';
import type { Logger } from 'pino';

/**
 * Verify cron job authorization using Bearer token
 *
 * @param request - The incoming request
 * @param logger - Logger instance for audit trail
 * @returns null if authorized, NextResponse with error if unauthorized
 *
 * @example
 * ```typescript
 * const logger = apiLogger.child({ cron: 'my-job' });
 * const authError = verifyCronAuth(request, logger);
 * if (authError) return authError;
 * // ... continue with cron job
 * ```
 */
export function verifyCronAuth(request: NextRequest, logger: Logger): NextResponse | null {
  const authHeader = request.headers.get('authorization');
  const cronSecret = process.env.CRON_SECRET;

  if (!cronSecret) {
    logger.error('CRON_SECRET environment variable is not set');
    return NextResponse.json({ error: 'Server configuration error' }, { status: 500 });
  }

  if (authHeader !== `Bearer ${cronSecret}`) {
    logger.warn({ hasAuthHeader: !!authHeader }, 'Unauthorized cron attempt');
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  return null;
}
