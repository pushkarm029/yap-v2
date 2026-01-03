'use client';

import { useQuery } from '@tanstack/react-query';
import { queryKeys } from '@/lib/queryKeys';

export interface InviteCodeData {
  code: string;
  used_count: number;
  created_at: string;
}

/**
 * Fetch user's own invite code
 */
export function useInviteCode() {
  return useQuery({
    queryKey: queryKeys.invite.myCode(),
    queryFn: async (): Promise<InviteCodeData | null> => {
      const res = await fetch('/api/invite/my-code');
      if (!res.ok) {
        return null;
      }
      const data = await res.json();
      return data.code ? data : null;
    },
    // Invite codes never change for a user
    staleTime: Infinity,
  });
}
