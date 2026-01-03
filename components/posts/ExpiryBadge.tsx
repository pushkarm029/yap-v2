'use client';

import { useEffect, useState, useMemo } from 'react';
import { formatCleanupTime } from '@/lib/utils/dates';

const EXPIRY_DAYS = 7;
const MS_PER_DAY = 24 * 60 * 60 * 1000;
const MS_PER_HOUR = 60 * 60 * 1000;
const MS_PER_MINUTE = 60 * 1000;

interface ExpiryBadgeProps {
  createdAt: string;
  className?: string;
}

function isValidDate(createdAt: string): boolean {
  const created = new Date(createdAt).getTime();
  return !Number.isNaN(created);
}

function getTimeUntilExpiry(createdAt: string): number {
  const created = new Date(createdAt).getTime();

  // Return 0 if invalid (validation happens once in component)
  if (Number.isNaN(created)) {
    return 0;
  }

  const expiryTime = created + EXPIRY_DAYS * MS_PER_DAY;
  return Math.max(0, expiryTime - Date.now());
}

function formatTimeRemaining(ms: number): string {
  if (ms === 0) {
    return `Deletes at ${formatCleanupTime()}`;
  }

  const days = Math.floor(ms / MS_PER_DAY);
  const hours = Math.floor((ms % MS_PER_DAY) / MS_PER_HOUR);
  const minutes = Math.floor((ms % MS_PER_HOUR) / MS_PER_MINUTE);
  const seconds = Math.floor((ms % MS_PER_MINUTE) / 1000);

  if (days > 0) {
    return `${days}D ${hours}H`;
  }

  if (hours > 0) {
    return `${hours}H ${minutes}M`;
  }

  return `${minutes}:${seconds.toString().padStart(2, '0')}`;
}

export function ExpiryBadge({ createdAt, className = '' }: ExpiryBadgeProps) {
  // Validate date once on mount
  const isValid = useMemo(() => {
    const valid = isValidDate(createdAt);
    if (!valid) {
      console.warn('Invalid date provided to ExpiryBadge:', createdAt);
    }
    return valid;
  }, [createdAt]);

  const [timeRemaining, setTimeRemaining] = useState(() => getTimeUntilExpiry(createdAt));

  useEffect(() => {
    if (!isValid) return;

    const currentTime = getTimeUntilExpiry(createdAt);
    setTimeRemaining(currentTime);

    // Update every second for real-time gamified countdown
    const interval = setInterval(() => {
      const newTime = getTimeUntilExpiry(createdAt);
      setTimeRemaining(newTime);
    }, 1000);

    return () => clearInterval(interval);
  }, [createdAt, isValid]);

  if (!isValid) return null;

  const formatted = formatTimeRemaining(timeRemaining);
  const isUrgent = timeRemaining < MS_PER_DAY;
  const isExpired = timeRemaining === 0;

  return (
    <span
      className={`flex items-center gap-1 text-xs ${isUrgent ? 'text-red-500' : 'text-gray-500'} ${className}`}
      title={isExpired ? formatted : `Expires in ${formatted}`}
    >
      <span className="text-sm leading-none" role="img" aria-label="Time remaining">
        ⏳
      </span>
      <span>{formatted}</span>
    </span>
  );
}
