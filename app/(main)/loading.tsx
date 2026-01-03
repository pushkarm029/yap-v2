import { FeedSkeleton } from '@/components/posts';

/**
 * Loading state for authenticated routes.
 *
 * Shown while pages in the (main) route group are loading.
 * Uses FeedSkeleton as the default since most pages show feed-like content.
 */
export default function MainLoading() {
  return (
    <div className="pt-20 pb-20 lg:pt-0 lg:pb-0">
      <FeedSkeleton count={5} />
    </div>
  );
}
