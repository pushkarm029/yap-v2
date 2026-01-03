/**
 * Query Keys Factory for TanStack Query
 *
 * This creates a consistent, type-safe structure for query keys.
 * Using a factory ensures:
 * - Consistent naming across the app
 * - Easy cache invalidation (e.g., invalidate all posts)
 * - Type safety for query key parameters
 *
 * Usage:
 *   useQuery({ queryKey: queryKeys.posts.feed() })
 *   queryClient.invalidateQueries({ queryKey: queryKeys.posts.all })
 */

export const queryKeys = {
  // Posts & Feed
  posts: {
    all: ['posts'] as const,
    feed: () => [...queryKeys.posts.all, 'feed'] as const,
    detail: (postId: string) => [...queryKeys.posts.all, 'detail', postId] as const,
    comments: (postId: string) => [...queryKeys.posts.all, 'comments', postId] as const,
    thread: (postId: string) => [...queryKeys.posts.all, 'thread', postId] as const,
  },

  // Users & Profiles
  users: {
    all: ['users'] as const,
    profile: (username: string) => [...queryKeys.users.all, 'profile', username] as const,
    posts: (userId: string) => [...queryKeys.users.all, 'posts', userId] as const,
    search: (query: string) => [...queryKeys.users.all, 'search', query] as const,
    popular: () => [...queryKeys.users.all, 'popular'] as const,
    newest: () => [...queryKeys.users.all, 'newest'] as const,
    suggested: () => [...queryKeys.users.all, 'suggested'] as const,
  },

  // Notifications
  notifications: {
    all: ['notifications'] as const,
    list: () => [...queryKeys.notifications.all, 'list'] as const,
    unreadCount: () => [...queryKeys.notifications.all, 'unread-count'] as const,
  },

  // Rewards & YAP
  rewards: {
    all: ['rewards'] as const,
    user: () => [...queryKeys.rewards.all, 'user'] as const,
    score: () => [...queryKeys.rewards.all, 'score'] as const,
    pool: () => [...queryKeys.rewards.all, 'pool'] as const,
    yap: () => [...queryKeys.rewards.all, 'yap'] as const,
    history: () => [...queryKeys.rewards.all, 'history'] as const,
    claimable: (wallet: string) => [...queryKeys.rewards.all, 'claimable', wallet] as const,
  },

  // User Limits (action limits per day)
  limits: {
    all: ['limits'] as const,
    daily: () => [...queryKeys.limits.all, 'daily'] as const,
  },

  // Current User Profile
  profile: {
    all: ['profile'] as const,
    me: () => [...queryKeys.profile.all, 'me'] as const,
  },

  // Invite Codes
  invite: {
    all: ['invite'] as const,
    myCode: () => [...queryKeys.invite.all, 'my-code'] as const,
  },
} as const;

// Type helpers for query keys
export type PostsQueryKey = ReturnType<
  typeof queryKeys.posts.feed | typeof queryKeys.posts.detail | typeof queryKeys.posts.comments
>;
export type UsersQueryKey = ReturnType<
  typeof queryKeys.users.profile | typeof queryKeys.users.search
>;
export type NotificationsQueryKey = ReturnType<
  typeof queryKeys.notifications.list | typeof queryKeys.notifications.unreadCount
>;
