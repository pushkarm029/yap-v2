import { FeedSkeleton } from '@/components/posts';

/**
 * Global loading state for route transitions.
 *
 * Shown while the Next.js App Router streams page content.
 * Uses the standard FeedSkeleton as a reasonable default.
 */
export default function Loading() {
  return (
    <div className="pt-20 pb-20 lg:pt-0 lg:pb-0">
      <FeedSkeleton count={5} />
    </div>
  );
}
