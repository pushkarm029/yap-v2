'use client';

import { useMemo } from 'react';
import type { DiagnosticInfo } from '@/lib/database/types';

type ErrorContext = { message?: string; stack?: string };

const SSR_FALLBACK: DiagnosticInfo = {
  currentUrl: '',
  referrerUrl: '',
  userAgent: '',
  platform: '',
  screenSize: '',
  viewportSize: '',
  language: '',
  timezone: '',
  timestamp: new Date().toISOString(),
  onLine: true,
};

function collectDiagnosticInfo(errorContext?: ErrorContext): DiagnosticInfo {
  if (typeof window === 'undefined') {
    return { ...SSR_FALLBACK, timestamp: new Date().toISOString() };
  }

  return {
    currentUrl: window.location.href,
    referrerUrl: document.referrer,
    userAgent: navigator.userAgent,
    platform: navigator.platform,
    screenSize: `${screen.width}x${screen.height}`,
    viewportSize: `${window.innerWidth}x${window.innerHeight}`,
    language: navigator.language,
    timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
    timestamp: new Date().toISOString(),
    onLine: navigator.onLine,
    ...(errorContext?.message && { errorMessage: errorContext.message }),
    ...(errorContext?.stack && { errorStack: errorContext.stack }),
  };
}

/**
 * Hook to capture browser diagnostic information.
 * Used for bug reports to help with debugging.
 *
 * All information is captured client-side and only sent with user consent.
 */
export function useDiagnosticInfo(errorContext?: ErrorContext): DiagnosticInfo {
  return useMemo(() => collectDiagnosticInfo(errorContext), [errorContext]);
}

/**
 * Get diagnostic info synchronously (for use outside React components).
 * Useful for error boundaries and non-hook contexts.
 */
export function getDiagnosticInfo(errorContext?: ErrorContext): DiagnosticInfo {
  return collectDiagnosticInfo(errorContext);
}
