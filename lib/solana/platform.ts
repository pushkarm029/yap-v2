'use client';

import { useState, useEffect } from 'react';

export type Platform = 'ios' | 'android' | 'desktop';

interface PlatformInfo {
  platform: Platform;
  isStandalone: boolean; // PWA installed mode
  isMobile: boolean;
}

/**
 * Detects the current platform for UI purposes
 */
function detectPlatformInfo(): PlatformInfo {
  if (typeof window === 'undefined') {
    return {
      platform: 'desktop',
      isStandalone: false,
      isMobile: false,
    };
  }

  const userAgent = navigator.userAgent.toLowerCase();

  // iOS detection
  const isIOS = /iphone|ipad|ipod/.test(userAgent);

  // Android detection
  const isAndroid = /android/.test(userAgent);

  // Mobile detection
  const isMobile = isIOS || isAndroid;

  // Platform
  const platform: Platform = isIOS ? 'ios' : isAndroid ? 'android' : 'desktop';

  // Standalone/PWA mode detection
  const mqStandalone = '(display-mode: standalone)';
  const iosStandalone =
    'standalone' in window.navigator &&
    (window.navigator as { standalone?: boolean }).standalone === true;
  const isStandalone = window.matchMedia(mqStandalone).matches || iosStandalone;

  return {
    platform,
    isStandalone,
    isMobile,
  };
}

/**
 * Hook to get platform information with SSR safety
 */
export function usePlatform(): PlatformInfo {
  const [info, setInfo] = useState<PlatformInfo>(() => ({
    platform: 'desktop',
    isStandalone: false,
    isMobile: false,
  }));

  useEffect(() => {
    setInfo(detectPlatformInfo());
  }, []);

  return info;
}

/**
 * Synchronous platform detection (use only when hooks aren't available)
 */
export function getPlatformInfo(): PlatformInfo {
  return detectPlatformInfo();
}
