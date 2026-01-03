'use client';

import { useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { queryKeys } from '@/lib/queryKeys';
import { APP_CONFIG } from '@/constants';

// API response structure from /api/users/:username
interface UserProfileApiResponse {
  user: {
    id: string;
    name: string | null;
    avatar: string | null;
    username: string | null;
    points: number;
    currentStreak?: number | null;
  };
  stats: {
    posts: number;
    votePower: number;
  };
  follow: {
    followerCount: number;
    followingCount: number;
    isFollowing: boolean;
  };
}

// Transformed profile structure used by components
export interface UserProfile {
  id: string;
  name: string | null;
  image: string | null;
  username: string | null;
  points: number;
  postsCount: number;
  votePower: number;
  streak: number | null;
  followerCount: number;
  followingCount: number;
  isFollowing: boolean;
}

export interface UserSearchResult {
  id: string;
  name: string;
  username: string;
  image: string | null;
}

/**
 * Fetch user profile by username
 * Transforms API response into component-friendly format
 */
export function useUserProfile(username: string) {
  return useQuery({
    queryKey: queryKeys.users.profile(username),
    queryFn: async (): Promise<UserProfile> => {
      const res = await fetch(`/api/users/${username}`);
      if (!res.ok) {
        if (res.status === 404) {
          throw new Error('User not found');
        }
        throw new Error('Failed to fetch profile');
      }
      const data: UserProfileApiResponse = await res.json();

      // Transform API response to component format
      return {
        id: data.user.id,
        name: data.user.name,
        image: data.user.avatar,
        username: data.user.username,
        points: data.user.points,
        postsCount: data.stats.posts,
        votePower: data.stats.votePower,
        streak: data.user.currentStreak ?? APP_CONFIG.DEFAULT_STREAK,
        followerCount: data.follow.followerCount,
        followingCount: data.follow.followingCount,
        isFollowing: data.follow.isFollowing,
      };
    },
    // Profiles rarely change
    staleTime: 1000 * 60 * 5, // 5 minutes
    enabled: !!username,
  });
}

/**
 * Hook to invalidate user profile cache
 * Use after follow/unfollow actions
 */
export function useInvalidateUserProfile() {
  const queryClient = useQueryClient();

  return useCallback(
    (username: string) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.users.profile(username) });
    },
    [queryClient]
  );
}

/**
 * Search users by query
 */
export function useUserSearch(query: string) {
  return useQuery({
    queryKey: queryKeys.users.search(query),
    queryFn: async (): Promise<{ users: UserSearchResult[] }> => {
      const res = await fetch(`/api/users/search?q=${encodeURIComponent(query)}`);
      if (!res.ok) {
        throw new Error('Failed to search users');
      }
      return res.json();
    },
    // Search results can be cached briefly
    staleTime: 1000 * 60 * 2, // 2 minutes
    enabled: query.length > 0,
  });
}

/**
 * Fetch popular users
 */
export function usePopularUsers() {
  return useQuery({
    queryKey: queryKeys.users.popular(),
    queryFn: async () => {
      const res = await fetch('/api/users/popular');
      if (!res.ok) {
        throw new Error('Failed to fetch popular users');
      }
      return res.json();
    },
    staleTime: 1000 * 60 * 5, // 5 minutes
  });
}

/**
 * Fetch newest users
 */
export function useNewestUsers() {
  return useQuery({
    queryKey: queryKeys.users.newest(),
    queryFn: async () => {
      const res = await fetch('/api/users/newest');
      if (!res.ok) {
        throw new Error('Failed to fetch newest users');
      }
      return res.json();
    },
    staleTime: 1000 * 60 * 5, // 5 minutes
  });
}

/**
 * Fetch suggested users
 */
export function useSuggestedUsers() {
  return useQuery({
    queryKey: queryKeys.users.suggested(),
    queryFn: async () => {
      const res = await fetch('/api/users/suggested');
      if (!res.ok) {
        throw new Error('Failed to fetch suggested users');
      }
      return res.json();
    },
    staleTime: 1000 * 60 * 5, // 5 minutes
  });
}

/** Follow mutation input */
interface FollowMutationInput {
  username: string;
  currentlyFollowing: boolean;
}

/** Follow API response */
interface FollowResponse {
  following: boolean;
  followerCount: number;
}

/**
 * Toggle follow/unfollow a user with optimistic update
 * Handles both follow (POST) and unfollow (DELETE)
 */
export function useFollowUser() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      username,
      currentlyFollowing,
    }: FollowMutationInput): Promise<FollowResponse> => {
      const res = await fetch(`/api/users/${username}/follow`, {
        method: currentlyFollowing ? 'DELETE' : 'POST',
      });
      if (!res.ok) {
        const error = await res.json().catch(() => ({}));
        throw new Error(error.error || 'Failed to update follow status');
      }
      return res.json();
    },
    onSuccess: (_, { username }) => {
      // Invalidate the profile to update follow status
      queryClient.invalidateQueries({ queryKey: queryKeys.users.profile(username) });
      // Invalidate suggested users
      queryClient.invalidateQueries({ queryKey: queryKeys.users.suggested() });
    },
  });
}

/**
 * Fetch a user's posts by userId
 */
export function useUserPosts(userId: string) {
  return useQuery({
    queryKey: queryKeys.users.posts(userId),
    queryFn: async () => {
      const res = await fetch(`/api/profile/${userId}/posts?type=all`);
      if (!res.ok) {
        throw new Error('Failed to fetch user posts');
      }
      return res.json();
    },
    staleTime: 1000 * 60 * 2, // 2 minutes
    enabled: !!userId,
  });
}
