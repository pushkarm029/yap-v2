'use client';

import { useQuery, useMutation, useQueryClient, useInfiniteQuery } from '@tanstack/react-query';
import { queryKeys } from '@/lib/queryKeys';
import type { PostWithUserAndUpvotes, ThreadResponse, FeedPage } from '@/types';

/**
 * Fetch the home feed with infinite scroll pagination
 * Loads 20 posts per page, fetches more on scroll
 */
export function useFeed() {
  return useInfiniteQuery({
    queryKey: queryKeys.posts.feed(),
    queryFn: async ({ pageParam }): Promise<FeedPage> => {
      const url = pageParam
        ? `/api/posts?cursor=${encodeURIComponent(pageParam)}&limit=20`
        : '/api/posts?limit=20';

      const res = await fetch(url);
      if (!res.ok) {
        throw new Error('Failed to fetch posts');
      }
      return res.json();
    },
    initialPageParam: null as string | null,
    getNextPageParam: (lastPage) => lastPage.nextCursor,
    staleTime: 1000 * 60 * 5, // 5 minutes - social feeds accept some staleness
  });
}

/**
 * Helper to invalidate all feed caches (both regular and infinite)
 */
export function useInvalidateFeed() {
  const queryClient = useQueryClient();
  return () => {
    queryClient.invalidateQueries({ queryKey: queryKeys.posts.all });
  };
}

/**
 * Fetch a single post by ID
 */
export function usePost(postId: string) {
  return useQuery({
    queryKey: queryKeys.posts.detail(postId),
    queryFn: async (): Promise<PostWithUserAndUpvotes> => {
      const res = await fetch(`/api/posts/${postId}`);
      if (!res.ok) {
        throw new Error('Failed to fetch post');
      }
      return res.json();
    },
    enabled: !!postId,
  });
}

/**
 * Fetch comments/thread for a post
 */
export function usePostThread(postId: string) {
  return useQuery({
    queryKey: queryKeys.posts.thread(postId),
    queryFn: async (): Promise<ThreadResponse> => {
      const res = await fetch(`/api/posts/${postId}/thread`);
      if (!res.ok) {
        throw new Error('Failed to fetch thread');
      }
      return res.json();
    },
    enabled: !!postId,
  });
}

interface CreatePostData {
  content: string;
  image_url?: string | null;
}

/**
 * Create a new post
 *
 * On success:
 * - Invalidates the feed to show the new post
 * - Invalidates limits (action was consumed)
 */
export function useCreatePost() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: CreatePostData) => {
      const res = await fetch('/api/posts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });

      if (!res.ok) {
        const error = await res.json().catch(() => ({}));
        throw new Error(error.error || 'Failed to create post');
      }

      return res.json();
    },
    onSuccess: () => {
      // Invalidate all feeds (regular and infinite) to show new post
      queryClient.invalidateQueries({ queryKey: queryKeys.posts.all });
      // Invalidate limits since we consumed one
      queryClient.invalidateQueries({ queryKey: queryKeys.limits.daily() });
    },
  });
}

/** Custom error for invite requirement */
export class InviteRequiredError extends Error {
  constructor() {
    super('INVITE_REQUIRED');
    this.name = 'InviteRequiredError';
  }
}

interface CreateCommentData {
  postId: string;
  content: string;
  image_url?: string | null;
}

/**
 * Create a comment on a post
 * Throws InviteRequiredError if user needs to redeem invite code
 */
export function useCreateComment() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ postId, content, image_url }: CreateCommentData) => {
      const res = await fetch(`/api/posts/${postId}/comments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content, image_url }),
      });

      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        if (res.status === 403 && data.error === 'INVITE_REQUIRED') {
          throw new InviteRequiredError();
        }
        throw new Error(data.error || 'Failed to create comment');
      }

      return data;
    },
    onSuccess: (_, variables) => {
      // Invalidate the thread to show new comment
      queryClient.invalidateQueries({ queryKey: queryKeys.posts.thread(variables.postId) });
      // Invalidate limits
      queryClient.invalidateQueries({ queryKey: queryKeys.limits.daily() });
      // Invalidate all feeds to update comment count
      queryClient.invalidateQueries({ queryKey: queryKeys.posts.all });
    },
  });
}

/** Helper to update a post's upvote in a posts array */
function updatePostUpvote(
  posts: PostWithUserAndUpvotes[],
  postId: string,
  voteWeight: number
): PostWithUserAndUpvotes[] {
  return posts.map((post) =>
    post.id === postId
      ? {
          ...post,
          upvote_count: (post.upvote_count ?? 0) + (post.user_upvoted ? -voteWeight : voteWeight),
          user_upvoted: !post.user_upvoted,
        }
      : post
  );
}

/** Type for feed data structure */
interface FeedData {
  pages: FeedPage[];
  pageParams: (string | null)[];
}

/** Upvote API response */
interface UpvoteResponse {
  upvoted: boolean;
  upvoteCount: number;
}

/** Upvote mutation input */
interface UpvoteMutationInput {
  postId: string;
  currentlyUpvoted: boolean;
  voteWeight?: number;
}

/**
 * Toggle upvote on a post with optimistic update
 * Handles both upvote (POST) and remove upvote (DELETE)
 */
export function useUpvote() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      postId,
      currentlyUpvoted,
    }: UpvoteMutationInput): Promise<UpvoteResponse> => {
      const res = await fetch(`/api/posts/${postId}/upvote`, {
        method: currentlyUpvoted ? 'DELETE' : 'POST',
      });

      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        if (res.status === 403 && data.error === 'INVITE_REQUIRED') {
          throw new InviteRequiredError();
        }
        throw new Error(data.error || data.message || 'Failed to upvote');
      }

      return data;
    },
    onMutate: async ({ postId, voteWeight = 1 }) => {
      await queryClient.cancelQueries({ queryKey: queryKeys.posts.all });

      const previousFeed = queryClient.getQueryData<FeedData>(queryKeys.posts.feed());

      if (previousFeed) {
        queryClient.setQueryData<FeedData>(
          queryKeys.posts.feed(),
          (old) =>
            old && {
              ...old,
              pages: old.pages.map((page) => ({
                ...page,
                posts: updatePostUpvote(page.posts, postId, voteWeight),
              })),
            }
        );
      }

      return { previousFeed };
    },
    onError: (_, __, context) => {
      if (context?.previousFeed) {
        queryClient.setQueryData(queryKeys.posts.feed(), context.previousFeed);
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.posts.all });
      queryClient.invalidateQueries({ queryKey: queryKeys.limits.daily() });
      // Points changed - invalidate related caches
      queryClient.invalidateQueries({ queryKey: queryKeys.rewards.all });
      queryClient.invalidateQueries({ queryKey: queryKeys.users.all });
    },
  });
}
