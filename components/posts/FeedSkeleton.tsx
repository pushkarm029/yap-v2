import PostCardSkeleton from './PostCardSkeleton';

interface FeedSkeletonProps {
  /** Number of skeleton cards to show. Default: 5 */
  count?: number;
}

/**
 * Skeleton loading state for the feed
 * Shows multiple PostCardSkeleton components
 */
export default function FeedSkeleton({ count = 5 }: FeedSkeletonProps) {
  return (
    <>
      {Array.from({ length: count }).map((_, index) => (
        <PostCardSkeleton key={`skeleton-${index}`} />
      ))}
    </>
  );
}
