'use client';

import { useState, useEffect } from 'react';

export function useStandalone() {
  const [isStandalone, setIsStandalone] = useState(false);

  useEffect(() => {
    // Check if running in standalone mode (installed PWA)
    const mqStandalone = '(display-mode: standalone)';

    // iOS standalone check
    const iosStandalone =
      'standalone' in window.navigator &&
      (window.navigator as { standalone?: boolean }).standalone === true;

    const isStandalone = window.matchMedia(mqStandalone).matches || iosStandalone;

    setIsStandalone(isStandalone);
  }, []);

  return isStandalone;
}
