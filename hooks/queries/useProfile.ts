'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { queryKeys } from '@/lib/queryKeys';

interface ProfileData {
  name: string;
}

/**
 * Fetch current user's profile for editing
 */
export function useProfile() {
  return useQuery({
    queryKey: queryKeys.profile.me(),
    queryFn: async (): Promise<ProfileData> => {
      const res = await fetch('/api/profile');
      if (!res.ok) {
        throw new Error('Failed to fetch profile');
      }
      const data = await res.json();
      return {
        name: data.name || '',
      };
    },
    staleTime: 1000 * 60 * 5, // 5 minutes
  });
}

/**
 * Update current user's profile
 */
export function useUpdateProfile() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: ProfileData) => {
      const res = await fetch('/api/profile', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });

      if (!res.ok) {
        const error = await res.json().catch(() => ({}));
        throw new Error(error.error || 'Failed to update profile');
      }

      return res.json();
    },
    onSuccess: () => {
      // Invalidate profile cache
      queryClient.invalidateQueries({ queryKey: queryKeys.profile.me() });
    },
  });
}
