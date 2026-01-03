import { useState, useEffect, useMemo } from 'react';

/**
 * Hook to manage countdown timer for next distribution
 * Ticks every minute and formats remaining time as a string
 */
export function useCountdown(nextDistributionIn: number | undefined): string {
  const [countdownTick, setCountdownTick] = useState(0);

  // Set up interval to trigger re-render every minute
  useEffect(() => {
    if (!nextDistributionIn) return;

    const interval = setInterval(() => {
      setCountdownTick((t) => t + 1);
    }, 60000);

    return () => clearInterval(interval);
  }, [nextDistributionIn]);

  // Derive countdown string
  return useMemo(() => {
    if (!nextDistributionIn) return '';

    // Approximate elapsed time based on tick count (each tick = 1 minute)
    const elapsedSeconds = countdownTick * 60;
    const remainingSeconds = Math.max(0, nextDistributionIn - elapsedSeconds);

    if (remainingSeconds <= 0) return 'Soon';

    const hours = Math.floor(remainingSeconds / 3600);
    const minutes = Math.floor((remainingSeconds % 3600) / 60);

    if (hours > 0) return `${hours}h ${minutes}m`;
    if (minutes > 0) return `${minutes}m`;
    return '<1m';
  }, [nextDistributionIn, countdownTick]);
}
