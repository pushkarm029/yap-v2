import { NextRequest } from 'next/server';
import { auth } from '@/auth';
import { db } from '@/lib/database';
import { apiLogger } from '@/lib/logger';
import { ok, badRequest, tooManyRequests, serverError } from '@/lib/api/responses';
import { requireString } from '@/lib/api/validation';
import type { BugReportType, DiagnosticInfo } from '@/lib/database/types';

// Rate limit: 5 reports per hour
const RATE_LIMIT_MAX = 5;
const RATE_LIMIT_WINDOW_MS = 60 * 60 * 1000; // 1 hour

// In-memory rate limit store (resets on deploy)
// For production, consider Redis or database-backed rate limiting
const rateLimitStore = new Map<string, { count: number; resetAt: number }>();

function checkRateLimit(key: string): { allowed: boolean; remaining: number } {
  const now = Date.now();
  const entry = rateLimitStore.get(key);

  if (!entry || now > entry.resetAt) {
    rateLimitStore.set(key, { count: 1, resetAt: now + RATE_LIMIT_WINDOW_MS });
    return { allowed: true, remaining: RATE_LIMIT_MAX - 1 };
  }

  if (entry.count >= RATE_LIMIT_MAX) {
    return { allowed: false, remaining: 0 };
  }

  entry.count++;
  return { allowed: true, remaining: RATE_LIMIT_MAX - entry.count };
}

const logger = apiLogger.child({ route: 'feedback' });

/**
 * POST /api/feedback
 *
 * Submit a bug report or feedback.
 * Supports both authenticated and anonymous submissions.
 *
 * Body: {
 *   type: 'bug' | 'feedback',
 *   description: string,
 *   screenshotUrl?: string,
 *   includeDiagnostics: boolean,
 *   diagnosticInfo?: DiagnosticInfo
 * }
 */
export async function POST(request: NextRequest) {
  try {
    // Get user ID (optional - allow anonymous)
    const session = await auth();
    const userId = session?.user?.id ?? null;

    // Rate limit key: userId or IP
    const rateLimitKey = userId ?? request.headers.get('x-forwarded-for') ?? 'anonymous';
    const rateLimit = checkRateLimit(rateLimitKey);

    if (!rateLimit.allowed) {
      logger.warn({ rateLimitKey }, 'Feedback rate limit exceeded');
      return tooManyRequests('Too many feedback submissions. Please try again later.', {
        retryAfter: Math.ceil(RATE_LIMIT_WINDOW_MS / 1000),
      });
    }

    const body = await request.json();
    const { type, description, screenshotUrl, includeDiagnostics, diagnosticInfo } = body;

    // Validate type
    if (!type || !['bug', 'feedback'].includes(type)) {
      return badRequest('Invalid feedback type. Must be "bug" or "feedback".');
    }
    const validType: BugReportType = type;

    // Validate description
    const descriptionResult = requireString(description, 'Description', 5000);
    if (!descriptionResult.ok) return descriptionResult.error;

    // Validate screenshot URL (optional)
    let validScreenshotUrl: string | null = null;
    if (screenshotUrl && typeof screenshotUrl === 'string') {
      // Basic URL validation
      try {
        new URL(screenshotUrl);
        validScreenshotUrl = screenshotUrl;
      } catch {
        return badRequest('Invalid screenshot URL');
      }
    }

    // Validate diagnostic info (optional)
    let validDiagnosticInfo: DiagnosticInfo | null = null;
    if (includeDiagnostics && diagnosticInfo && typeof diagnosticInfo === 'object') {
      validDiagnosticInfo = diagnosticInfo as DiagnosticInfo;
    }

    // Create bug report
    const result = await db.createBugReport({
      userId,
      type: validType,
      description: descriptionResult.value,
      screenshotUrl: validScreenshotUrl,
      diagnosticInfo: validDiagnosticInfo,
    });

    logger.info(
      {
        bugReportId: result.id,
        userId,
        type: validType,
        hasScreenshot: !!validScreenshotUrl,
        hasDiagnostics: !!validDiagnosticInfo,
      },
      'Feedback submitted successfully'
    );

    return ok({
      success: true,
      id: result.id,
      message: 'Thank you for your feedback!',
      remaining: rateLimit.remaining,
    });
  } catch (error) {
    logger.error({ error }, 'Error submitting feedback');
    return serverError('Failed to submit feedback');
  }
}
