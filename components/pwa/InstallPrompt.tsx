'use client';

import { useState, useEffect } from 'react';
import { useStandalone } from '@/hooks/useStandalone';
import { componentLogger } from '@/lib/logger';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

export function InstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [showPrompt, setShowPrompt] = useState(false);
  const isStandalone = useStandalone();

  useEffect(() => {
    // Don't show if already installed
    if (isStandalone) return;

    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);

      // Show prompt after 30 seconds (or on first interaction)
      setTimeout(() => setShowPrompt(true), 30000);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    };
  }, [isStandalone]);

  const handleInstall = async () => {
    if (!deferredPrompt) return;

    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;

    componentLogger.info({ outcome }, 'PWA install prompt result');
    setDeferredPrompt(null);
    setShowPrompt(false);
  };

  const handleDismiss = () => {
    setShowPrompt(false);
    // Store dismissal in localStorage to not annoy users
    localStorage.setItem('installPromptDismissed', Date.now().toString());
  };

  if (!showPrompt) return null;

  return (
    <div className="fixed bottom-20 left-4 right-4 bg-blue-600 text-white p-4 rounded-lg shadow-xl z-40 flex items-center justify-between animate-slide-up">
      <div className="flex-1">
        <p className="font-semibold text-base">Install Yap</p>
        <p className="text-sm text-blue-100">Get the full app experience</p>
      </div>
      <div className="flex gap-2 ml-4">
        <button
          onClick={handleDismiss}
          className="text-blue-100 hover:text-white px-3 py-1 text-sm transition-colors"
        >
          Later
        </button>
        <button
          onClick={handleInstall}
          className="bg-white text-blue-600 px-4 py-2 rounded font-medium text-sm hover:bg-blue-50 transition-colors"
        >
          Install
        </button>
      </div>
    </div>
  );
}
