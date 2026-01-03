'use client';

interface DailyActionsSectionProps {
  progress: {
    used: number;
    limit: number;
    remaining: number;
    percent: number;
  };
  isLoading: boolean;
}

const SECTION_HEADER_CLASS =
  'text-[11px] font-semibold tracking-wide uppercase text-slate-500 mb-3';

/**
 * Daily actions section with progress bar
 */
export function DailyActionsSection({ progress, isLoading }: DailyActionsSectionProps) {
  return (
    <div className="px-5 py-4">
      <p className={SECTION_HEADER_CLASS}>Today</p>
      {isLoading ? (
        <div className="space-y-2">
          <div className="bg-slate-200 rounded-full overflow-hidden h-3">
            <div className="bg-blue-500 rounded-full transition-all duration-300 h-3 w-1/2 animate-pulse" />
          </div>
          <div className="h-4 w-24 bg-gray-200/50 rounded animate-pulse" />
        </div>
      ) : (
        <>
          <div className="bg-slate-200 rounded-full overflow-hidden h-3">
            <div
              className="bg-blue-500 rounded-full transition-all duration-300 h-3"
              style={{ width: `${progress.percent}%` }}
            />
          </div>
          <p className="text-sm text-gray-600 mt-2">
            <span className="font-semibold text-gray-900">{progress.remaining}</span> actions
            remaining
          </p>
        </>
      )}
    </div>
  );
}
