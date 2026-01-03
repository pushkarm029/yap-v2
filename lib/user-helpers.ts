import { db } from './database';

interface User {
  id: string;
  username?: string | null;
  name?: string | null;
  image?: string | null;
  bio?: string | null;
  points?: number;
  created_at?: string;
}

export interface UserWithFollowStatus extends User {
  isFollowing: boolean;
}

export async function enrichUsersWithFollowStatus(
  users: User[],
  currentUserId?: string
): Promise<UserWithFollowStatus[]> {
  if (!currentUserId || users.length === 0) {
    return users.map((u) => ({ ...u, isFollowing: false }));
  }

  const userIds = users.map((u) => u.id).filter((id) => id !== currentUserId);

  if (userIds.length === 0) {
    return users.map((u) => ({ ...u, isFollowing: false }));
  }

  const followStatusMap = await db.getFollowStatusBatch(currentUserId, userIds);

  return users.map((user) => ({
    ...user,
    isFollowing: user.id === currentUserId ? false : followStatusMap.get(user.id) || false,
  }));
}
