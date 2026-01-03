// Date utility functions
// Centralized date handling for consistent UTC operations
//
// Philosophy: UTC Everywhere
// - All timestamps stored in database as UTC
// - All API responses use ISO 8601 UTC strings
// - Client-side conversion happens at display time
// - Never store local timezone in database

import { formatDistanceToNow, format, parseISO } from 'date-fns';

// =============================================================================
// UTC CONVERSION UTILITIES
// =============================================================================

/**
 * Convert a Date object to UTC ISO string
 * Use when sending dates to the server
 */
export function toUTC(date: Date): string {
  return date.toISOString();
}

/**
 * Parse a UTC ISO string to Date object
 * Use when receiving dates from the server
 */
export function fromUTC(isoString: string): Date {
  return parseISO(isoString);
}

/**
 * Get current time as UTC ISO string
 * Use for timestamps in API calls
 */
export function getNowISO(): string {
  return new Date().toISOString();
}

/**
 * Safely format a date string as relative time (e.g., "5 minutes ago")
 * Returns a fallback string if the date is invalid or missing
 *
 * @param dateString - ISO date string or null/undefined
 * @param fallback - Text to show if date is invalid (default: "recently")
 */
export function safeFormatTimeAgo(
  dateString: string | null | undefined,
  fallback = 'recently'
): string {
  if (!dateString) return fallback;

  try {
    const date = new Date(dateString);
    // Check for Invalid Date
    if (isNaN(date.getTime())) return fallback;
    return formatDistanceToNow(date, { addSuffix: true });
  } catch {
    return fallback;
  }
}

export function getTodayUTC(): string {
  return new Date().toISOString().split('T')[0];
}

export function getYesterdayUTC(): string {
  const date = new Date();
  date.setUTCDate(date.getUTCDate() - 1);
  return date.toISOString().split('T')[0];
}

export function areConsecutiveDays(firstDate: string, secondDate: string): boolean {
  const first = new Date(firstDate + 'T00:00:00Z');
  const second = new Date(secondDate + 'T00:00:00Z');
  const diffTime = second.getTime() - first.getTime();
  const diffDays = diffTime / (1000 * 60 * 60 * 24);
  return diffDays === 1;
}

export function formatStreakDisplay(streak: number): string {
  if (streak === 0) return '0 days';
  if (streak === 1) return '1 day';
  if (streak < 7) return `${streak} days`;

  const weeks = Math.floor(streak / 7);
  const days = streak % 7;

  if (weeks === 1 && days === 0) return '1 week';
  if (weeks > 1 && days === 0) return `${weeks} weeks`;
  if (weeks === 1) return `1 week ${days}d`;
  return `${weeks}w ${days}d`;
}

export function getNextCleanupTime(): Date {
  const now = new Date();
  const next = new Date(now);
  next.setUTCHours(2, 0, 0, 0);

  if (next <= now) {
    next.setUTCDate(next.getUTCDate() + 1);
  }

  return next;
}

export function formatCleanupTime(): string {
  const next = getNextCleanupTime();
  const hours = next.getUTCHours().toString().padStart(2, '0');
  const minutes = next.getUTCMinutes().toString().padStart(2, '0');
  return `${hours}:${minutes} UTC`;
}

// =============================================================================
// DISPLAY FORMATTING (Client-side, uses local timezone)
// =============================================================================

/**
 * Format a UTC ISO string as relative time in user's local timezone
 * This is the preferred way to display timestamps to users
 *
 * @param isoString - UTC ISO string from API/database
 * @param fallback - Text to show if date is invalid
 * @returns Relative time string like "5 minutes ago"
 */
export function formatRelative(
  isoString: string | null | undefined,
  fallback = 'recently'
): string {
  return safeFormatTimeAgo(isoString, fallback);
}

/**
 * Format a UTC ISO string as full date in user's local timezone
 *
 * @param isoString - UTC ISO string from API/database
 * @param formatString - date-fns format string (default: 'MMM d, yyyy')
 * @returns Formatted date string like "Dec 30, 2025"
 */
export function formatDate(isoString: string, formatString = 'MMM d, yyyy'): string {
  try {
    const date = fromUTC(isoString);
    return format(date, formatString);
  } catch {
    return 'Invalid date';
  }
}

/**
 * Format a UTC ISO string as date with time in user's local timezone
 *
 * @param isoString - UTC ISO string from API/database
 * @returns Formatted string like "Dec 30, 2025 at 3:45 PM"
 */
export function formatDateTime(isoString: string): string {
  try {
    const date = fromUTC(isoString);
    return format(date, "MMM d, yyyy 'at' h:mm a");
  } catch {
    return 'Invalid date';
  }
}

// =============================================================================
// TIME CALCULATIONS
// =============================================================================

/**
 * Get milliseconds until a target UTC time
 * Useful for countdown timers
 */
export function msUntil(targetIsoString: string): number {
  const target = fromUTC(targetIsoString);
  return Math.max(0, target.getTime() - Date.now());
}

/**
 * Check if a UTC timestamp is in the past
 */
export function isPast(isoString: string): boolean {
  return fromUTC(isoString).getTime() < Date.now();
}

/**
 * Check if a UTC timestamp is in the future
 */
export function isFuture(isoString: string): boolean {
  return fromUTC(isoString).getTime() > Date.now();
}
