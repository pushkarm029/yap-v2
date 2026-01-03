'use client';

import PostCard from '../posts/PostCard';
import LoadingSpinner from '../ui/LoadingSpinner';
import ErrorBoundary from '../ui/ErrorBoundary';
import { useUserPosts } from '@/hooks/queries';
import type { PostWithUserAndUpvotes } from '@/types';

interface ProfileFeedProps {
  userId: string;
}

export default function ProfileFeed({ userId }: ProfileFeedProps) {
  const { data: posts, isLoading, error, refetch } = useUserPosts(userId);

  return (
    <div>
      {/* Content */}
      <div className="min-h-[400px] border-t border-gray-200">
        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <LoadingSpinner />
          </div>
        ) : error ? (
          <div className="bg-red-50 border border-red-200 text-red-600 p-4 m-4 rounded-lg flex items-center justify-between">
            <p>{error instanceof Error ? error.message : 'Failed to load posts'}</p>
            <button
              onClick={() => refetch()}
              className="bg-red-600 hover:bg-red-700 text-white px-3 py-1 rounded text-sm font-medium transition-colors"
            >
              Try Again
            </button>
          </div>
        ) : !posts || posts.length === 0 ? (
          <div className="text-center p-12 text-gray-500">
            <div className="text-6xl mb-4">🤷‍♀️</div>
            <p className="text-lg font-medium mb-2">No posts yet</p>
            <p className="text-sm">Start yapping to see your activity here!</p>
          </div>
        ) : (
          <div>
            {posts.map((post: PostWithUserAndUpvotes) => (
              <ErrorBoundary key={post.id}>
                <PostCard post={post} />
              </ErrorBoundary>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
