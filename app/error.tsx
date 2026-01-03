'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { AlertCircle, RefreshCw, Bug } from 'lucide-react';
import { componentLogger } from '@/lib/logger';

/**
 * Global error boundary for the app.
 *
 * Catches unhandled errors during rendering and displays
 * a user-friendly error message with retry and report options.
 */
export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const router = useRouter();

  useEffect(() => {
    componentLogger.error(
      { error: error.message, digest: error.digest },
      'Global error boundary caught error'
    );
  }, [error]);

  const handleReport = () => {
    const params = new URLSearchParams({
      error: error.message || 'Unknown error',
      ...(error.stack && { stack: error.stack.slice(0, 500) }), // Limit stack length
    });
    router.push(`/feedback?${params.toString()}`);
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <div className="text-center max-w-md">
        <AlertCircle className="mx-auto mb-4 text-red-500" size={48} />
        <h2 className="text-xl font-semibold text-gray-900 mb-2">Something went wrong</h2>
        <p className="text-gray-600 mb-6">We encountered an unexpected error. Please try again.</p>
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <button
            onClick={reset}
            className="inline-flex items-center justify-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            <RefreshCw size={16} />
            Try again
          </button>
          <button
            onClick={handleReport}
            className="inline-flex items-center justify-center gap-2 px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
          >
            <Bug size={16} />
            Report this error
          </button>
        </div>
      </div>
    </div>
  );
}
