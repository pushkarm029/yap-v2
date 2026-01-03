'use client';

import { ExternalLink, CheckCircle, Sparkles } from 'lucide-react';
import { getExplorerTxUrl } from '@/lib/solana';
import { useRewardsHistory } from '@/hooks/queries';
import { HistorySectionSkeleton } from '../RewardsPageSkeleton';

function formatAmount(amount: string) {
  const num = Number(amount) / 1e9;
  return num.toLocaleString(undefined, {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  });
}

function formatDate(dateStr: string) {
  return new Date(dateStr).toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
  });
}

/**
 * History section with earnings and claims
 */
export function HistorySection() {
  const { data: historyData, isLoading, isError, refetch } = useRewardsHistory();

  if (isLoading) {
    return <HistorySectionSkeleton />;
  }

  if (isError) {
    return (
      <div className="px-5 py-8 text-center">
        <p className="text-sm text-red-500 mb-2">Failed to load history</p>
        <button onClick={() => refetch()} className="text-sm text-blue-600 hover:underline">
          Try again
        </button>
      </div>
    );
  }

  const distributions = historyData?.distributions ?? [];
  const claims = historyData?.claims ?? [];

  return (
    <>
      {/* Earnings History - what was distributed */}
      <div className="px-5 py-3 border-b border-gray-200">
        <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">
          Earnings History
        </p>
      </div>

      {distributions.length > 0 ? (
        distributions.map((dist) => (
          <div
            key={dist.id}
            className="px-5 py-3 border-b border-gray-200 flex items-center justify-between"
          >
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-full bg-blue-50">
                <Sparkles size={14} className="text-blue-600" />
              </div>
              <div>
                <p className="text-sm font-medium text-gray-900">
                  +{formatAmount(dist.amountEarned)} YAP
                </p>
                <p className="text-xs text-gray-500">
                  {formatDate(dist.distributedAt)}
                  {dist.pointsConverted > 0 && ` · ${dist.pointsConverted} pts`}
                </p>
              </div>
            </div>
          </div>
        ))
      ) : (
        <div className="px-5 py-6 text-center">
          <p className="text-sm text-gray-500">No earnings yet</p>
        </div>
      )}

      {/* Claims History - actual on-chain claims */}
      <div className="px-5 py-3 border-b border-gray-200">
        <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">Claims History</p>
      </div>

      {claims.length > 0 ? (
        claims.map((claim) => (
          <div
            key={claim.id}
            className="px-5 py-3 border-b border-gray-200 flex items-center justify-between"
          >
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-full bg-green-50">
                <CheckCircle size={14} className="text-green-600" />
              </div>
              <div>
                <p className="text-sm font-medium text-gray-900">
                  +{formatAmount(claim.amountClaimed)} YAP
                </p>
                <p className="text-xs text-gray-500">Claimed {formatDate(claim.claimedAt)}</p>
              </div>
            </div>
            <a
              href={getExplorerTxUrl(claim.txSignature)}
              target="_blank"
              rel="noopener noreferrer"
              onClick={(e) => e.stopPropagation()}
              className="p-2 rounded-full bg-gray-50 hover:bg-gray-100 transition-colors"
            >
              <ExternalLink size={14} className="text-gray-500" />
            </a>
          </div>
        ))
      ) : (
        <div className="px-5 py-6 text-center">
          <p className="text-sm text-gray-500">No claims yet</p>
        </div>
      )}
    </>
  );
}
