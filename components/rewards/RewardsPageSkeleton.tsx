/**
 * Skeleton loading state for RewardsPage
 * Matches the exact layout of the rewards page sections for smooth transition
 */
export function ScoreSectionSkeleton() {
  return (
    <div className="px-5 py-4 border-b border-gray-200 animate-pulse">
      {/* Header */}
      <div className="flex items-center gap-2 mb-3">
        <div className="w-4 h-4 bg-gray-200 rounded" />
        <div className="h-4 bg-gray-200 rounded w-20" />
      </div>
      {/* Grid: Lifetime / Ready to Convert */}
      <div className="grid grid-cols-2 gap-4 mb-3">
        <div>
          <div className="h-8 bg-gray-200 rounded w-24 mb-1" />
          <div className="h-3 bg-gray-100 rounded w-14" />
        </div>
        <div>
          <div className="h-8 bg-gray-200 rounded w-20 mb-1" />
          <div className="h-3 bg-gray-100 rounded w-24" />
        </div>
      </div>
      {/* Hint text */}
      <div className="h-3 bg-gray-100 rounded w-64" />
    </div>
  );
}

export function NextDropSectionSkeleton() {
  return (
    <div className="px-5 py-4 border-b border-gray-200 bg-gradient-to-r from-purple-50/50 to-pink-50/50 animate-pulse">
      {/* Header with countdown badge */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 bg-purple-200 rounded" />
          <div className="h-4 bg-purple-100 rounded w-20" />
        </div>
        <div className="h-6 bg-purple-100 rounded-full w-24" />
      </div>
      {/* Grid: Prize Pool / Your Share */}
      <div className="grid grid-cols-2 gap-4">
        <div>
          <div className="h-7 bg-gray-200 rounded w-28 mb-1" />
          <div className="h-3 bg-gray-100 rounded w-16" />
        </div>
        <div>
          <div className="h-7 bg-gray-200 rounded w-16 mb-1" />
          <div className="h-3 bg-gray-100 rounded w-16" />
        </div>
      </div>
    </div>
  );
}

export function WalletSectionSkeleton() {
  return (
    <div className="px-5 py-4 border-b border-gray-200 animate-pulse">
      <div className="flex items-center justify-between">
        <div>
          <div className="h-4 bg-gray-200 rounded w-14 mb-1" />
          <div className="h-3 bg-gray-100 rounded w-32" />
        </div>
        <div className="h-10 bg-gray-200 rounded-lg w-32" />
      </div>
    </div>
  );
}

export function YapSectionSkeleton() {
  return (
    <div className="px-5 py-4 border-b border-gray-200 animate-pulse">
      {/* Header */}
      <div className="flex items-center gap-2 mb-3">
        <div className="w-4 h-4 bg-gray-200 rounded" />
        <div className="h-4 bg-gray-200 rounded w-20" />
      </div>
      {/* Grid: Ready to Claim / Claimed */}
      <div className="grid grid-cols-2 gap-4">
        <div>
          <div className="h-8 bg-green-100 rounded w-20 mb-1" />
          <div className="h-3 bg-gray-100 rounded w-20" />
        </div>
        <div>
          <div className="h-8 bg-gray-200 rounded w-16 mb-1" />
          <div className="h-3 bg-gray-100 rounded w-14" />
        </div>
      </div>
      {/* ClaimRewards component has its own loading state via dynamic import */}
    </div>
  );
}

export function HistorySectionSkeleton() {
  return (
    <>
      {/* Section header */}
      <div className="px-5 py-3 border-b border-gray-200">
        <div className="h-3 bg-gray-100 rounded w-24 animate-pulse" />
      </div>
      {/* History items */}
      {[1, 2, 3].map((i) => (
        <div
          key={i}
          className="px-5 py-3 border-b border-gray-200 flex items-center justify-between animate-pulse"
        >
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 bg-gray-100 rounded-full" />
            <div>
              <div className="h-4 bg-gray-200 rounded w-24 mb-1" />
              <div className="h-3 bg-gray-100 rounded w-32" />
            </div>
          </div>
          <div className="w-8 h-8 bg-gray-100 rounded-full" />
        </div>
      ))}
    </>
  );
}

export default function RewardsPageSkeleton() {
  return (
    <div className="pt-20 pb-20 lg:pt-0 lg:pb-0">
      <ScoreSectionSkeleton />
      <NextDropSectionSkeleton />
      <WalletSectionSkeleton />
      <YapSectionSkeleton />
      <HistorySectionSkeleton />
    </div>
  );
}
