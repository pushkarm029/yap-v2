'use client';

import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import CircularProgress from './CircularProgress';
import LimitSection from './LimitSection';
import { APP_CONFIG } from '@/constants';
import { useLimitsQuery } from '@/hooks/queries';

interface ActionLimitsIndicatorProps {
  className?: string;
}

export default function ActionLimitsIndicator({ className = '' }: ActionLimitsIndicatorProps) {
  // TanStack Query handles fetching, caching, and automatic refetching
  const { data: limitsData } = useLimitsQuery();

  // UI state
  const [showDetails, setShowDetails] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    const checkMobile = () => {
      setIsMobile(window.innerWidth < APP_CONFIG.MOBILE_BREAKPOINT);
    };
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  const size = isMobile ? 24 : 20;
  const strokeWidth = isMobile ? 3 : 2.5;

  const getResetTime = () => {
    const now = new Date();
    const tomorrow = new Date(now);
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setHours(0, 0, 0, 0);
    const diff = tomorrow.getTime() - now.getTime();
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    return `${hours}h ${minutes}m`;
  };

  // Don't render until we have limits data
  const limits = limitsData?.total;
  if (!limits) {
    return null;
  }

  return (
    <>
      <div
        className={`flex items-center gap-2 cursor-pointer ${className}`}
        onClick={() => setShowDetails(true)}
        title="View action limits"
      >
        <CircularProgress
          value={limits.used}
          max={limits.limit}
          size={size}
          strokeWidth={strokeWidth}
        />
      </div>

      {/* Details Modal/Bottom Sheet */}
      {mounted &&
        showDetails &&
        createPortal(
          <div
            className="fixed inset-0 bg-black/40 backdrop-blur-sm z-[200] flex items-end lg:items-center lg:justify-center p-4"
            onClick={() => setShowDetails(false)}
          >
            <div
              className="bg-white w-full lg:max-w-md lg:rounded-2xl rounded-t-2xl shadow-xl animate-slide-up overflow-hidden flex flex-col max-h-[90vh]"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Header */}
              <div className="px-6 py-4 border-b border-gray-200">
                <h2 className="text-lg font-semibold text-gray-900">Daily Actions</h2>
                <p className="text-sm text-gray-500 mt-1">Resets in {getResetTime()}</p>
              </div>

              {/* Limits - Scrollable */}
              <div className="px-6 py-4 space-y-4 overflow-y-auto flex-1">
                <LimitSection title="Total Actions" limit={limits} />
              </div>

              {/* Footer */}
              <div className="px-6 py-4 border-t border-gray-200 flex-shrink-0">
                <button
                  onClick={() => setShowDetails(false)}
                  className="w-full py-2 px-4 bg-gray-100 hover:bg-gray-200 text-gray-900 font-medium rounded-lg transition-colors"
                >
                  Close
                </button>
              </div>
            </div>
          </div>,
          document.body
        )}
    </>
  );
}
