'use client';

import Link from 'next/link';

interface RewardsSectionProps {
  pending?: number;
  poolSharePercent?: number;
  countdown: string;
  onClose: () => void;
}

const SECTION_HEADER_CLASS =
  'text-[11px] font-semibold tracking-wide uppercase text-slate-500 mb-3';

/**
 * Rewards section with stats grid and claim CTA
 */
export function RewardsSection({
  pending,
  poolSharePercent,
  countdown,
  onClose,
}: RewardsSectionProps) {
  return (
    <div className="px-5 py-4">
      <div className="flex justify-between items-center mb-3">
        <p className={SECTION_HEADER_CLASS} style={{ marginBottom: 0 }}>
          Rewards
        </p>
      </div>

      {/* Stats Grid */}
      <div className="space-y-2.5">
        {/* Pending Points */}
        {pending !== undefined && pending > 0 && (
          <div className="flex justify-between items-center">
            <span className="text-sm text-black">Pending</span>
            <span className="text-sm text-black font-semibold">
              {Math.floor(pending).toLocaleString()} pts
            </span>
          </div>
        )}

        {/* Pool Share */}
        {poolSharePercent !== undefined && poolSharePercent > 0 && (
          <div className="flex justify-between items-center">
            <span className="text-sm text-black">Pool share</span>
            <span className="text-sm text-black font-semibold">{poolSharePercent.toFixed(2)}%</span>
          </div>
        )}

        {/* Next Drop Countdown */}
        {countdown && (
          <div className="flex justify-between items-center">
            <span className="text-sm text-black">Next drop</span>
            <span className="text-sm text-black font-semibold">{countdown}</span>
          </div>
        )}
      </div>

      {/* Claim Button */}
      <div className="flex justify-center mt-4">
        <Link
          href="/rewards"
          onClick={onClose}
          className="text-[11px] font-semibold text-white bg-blue-600 hover:bg-blue-700 transition-colors px-3 py-2 rounded-lg shadow-sm"
        >
          Claim Now
        </Link>
      </div>
    </div>
  );
}
