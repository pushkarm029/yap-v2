/**
 * Skeleton loading state for PostCard
 * Matches the exact layout of ContentCard for smooth transition
 */
export default function PostCardSkeleton() {
  return (
    <div className="px-5 py-3 sm:py-4 border-b border-gray-200 animate-pulse">
      {/* Header: Avatar + Name + Timestamp */}
      <div className="flex items-start gap-3">
        {/* Avatar skeleton */}
        <div className="w-10 h-10 bg-gray-200 rounded-full flex-shrink-0" />

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            {/* Name skeleton */}
            <div className="h-4 bg-gray-200 rounded w-24" />
            {/* Username skeleton */}
            <div className="h-3 bg-gray-100 rounded w-16" />
          </div>
          {/* Timestamp skeleton */}
          <div className="h-3 bg-gray-100 rounded w-12 mt-1" />
        </div>
      </div>

      {/* Content skeleton */}
      <div className="mt-3 space-y-2">
        <div className="h-4 bg-gray-200 rounded w-full" />
        <div className="h-4 bg-gray-200 rounded w-5/6" />
        <div className="h-4 bg-gray-200 rounded w-3/4" />
      </div>

      {/* Actions skeleton */}
      <div className="mt-4 flex gap-6">
        {/* Upvote button skeleton */}
        <div className="flex items-center gap-1">
          <div className="w-5 h-5 bg-gray-100 rounded" />
          <div className="h-3 bg-gray-100 rounded w-6" />
        </div>
        {/* Comment button skeleton */}
        <div className="flex items-center gap-1">
          <div className="w-5 h-5 bg-gray-100 rounded" />
          <div className="h-3 bg-gray-100 rounded w-6" />
        </div>
      </div>
    </div>
  );
}
