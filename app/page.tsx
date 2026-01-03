'use client';

import { useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { PostCard, FeedSkeleton, PostCardSkeleton } from '@/components/posts';
import { PageHeader } from '@/components/layout';
import { ErrorState } from '@/components/ui';
import { useFeed } from '@/hooks/queries';
import { useIntersectionObserver } from '@/hooks/useIntersectionObserver';
import { pageLogger } from '@/lib/logger';
import { useUIStore } from '@/stores/uiStore';

export default function Home() {
  const { data: session, status } = useSession();
  const openCompose = useUIStore((state) => state.openCompose);
  const openComposeWithContent = useUIStore((state) => state.openComposeWithContent);

  // TanStack Query handles caching, loading, error, and refetching
  // Feed is automatically invalidated when ComposeBox creates a post via useCreatePost mutation
  const { data, isLoading, error, refetch, fetchNextPage, hasNextPage, isFetchingNextPage } =
    useFeed();

  // Intersection observer for infinite scroll
  const { ref: loadMoreRef, isIntersecting } = useIntersectionObserver({
    rootMargin: '200px', // Start loading 200px before reaching the end
  });

  // Flatten pages into single posts array
  const posts = data?.pages.flatMap((page) => page.posts) ?? [];

  // Trigger next page load when scrolling near bottom
  useEffect(() => {
    if (isIntersecting && hasNextPage && !isFetchingNextPage) {
      fetchNextPage();
    }
  }, [isIntersecting, hasNextPage, isFetchingNextPage, fetchNextPage]);

  // Handle app shortcuts (new-post action)
  useEffect(() => {
    if (status === 'authenticated') {
      const params = new URLSearchParams(window.location.search);
      if (params.get('action') === 'new-post') {
        openCompose();
      }
    }
  }, [status, openCompose]);

  // Handle share target (shared content from other apps)
  useEffect(() => {
    const handleShareTarget = async () => {
      if (status !== 'authenticated') {
        return;
      }

      const params = new URLSearchParams(window.location.search);
      if (params.get('source') !== 'share-target') {
        return;
      }

      try {
        const formData = await fetch(window.location.href, {
          method: 'POST',
          credentials: 'same-origin',
        }).then((res) => res.formData());

        const title = (formData.get('title') as string) || '';
        const text = (formData.get('text') as string) || '';
        const url = (formData.get('url') as string) || '';

        let sharedContent = '';
        if (title) sharedContent += title;
        if (text) sharedContent += (sharedContent ? '\n\n' : '') + text;
        if (url) sharedContent += (sharedContent ? '\n\n' : '') + url;

        if (sharedContent.trim()) {
          openComposeWithContent(sharedContent.trim());
        }
      } catch (err) {
        pageLogger.error({ error: err }, 'Error handling share target');
      }
    };

    handleShareTarget();
  }, [status, openComposeWithContent]);

  // Show skeleton during session check
  if (status === 'loading') {
    return (
      <>
        <PageHeader session={session} />
        <div className="pt-20 pb-20 lg:pt-0 lg:pb-0">
          <FeedSkeleton count={5} />
        </div>
      </>
    );
  }

  // Show skeleton while fetching initial posts
  if (isLoading) {
    return (
      <>
        <PageHeader session={session} />
        <div className="pt-20 pb-20 lg:pt-0 lg:pb-0">
          <FeedSkeleton count={5} />
        </div>
      </>
    );
  }

  return (
    <>
      <PageHeader session={session} />

      {error && (
        <ErrorState
          message={error instanceof Error ? error.message : 'Failed to load posts'}
          onRetry={() => refetch()}
        />
      )}

      <div className="pt-20 pb-20 lg:pt-0 lg:pb-0">
        {posts.map((post) => (
          <PostCard key={post.id} post={post} />
        ))}

        {/* Infinite scroll trigger */}
        <div ref={loadMoreRef} className="py-4">
          {isFetchingNextPage && (
            <div className="space-y-0">
              <PostCardSkeleton />
              <PostCardSkeleton />
            </div>
          )}
        </div>

        {/* End of feed message */}
        {!hasNextPage && posts.length > 0 && (
          <p className="text-center py-8 text-gray-400 text-sm">You&apos;ve reached the end</p>
        )}

        {/* Empty state */}
        {!error && posts.length === 0 && !isLoading && (
          <div className="text-center p-12 text-gray-500">
            <p className="text-lg font-medium">
              {status === 'authenticated'
                ? 'No posts yet. Be the first to yap!'
                : 'No posts yet. Sign in with an invite code to start yapping!'}
            </p>
          </div>
        )}
      </div>
    </>
  );
}
