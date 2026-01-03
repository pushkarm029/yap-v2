import { NextRequest } from 'next/server';
import { auth } from '@/auth';
import { db } from '@/lib/database';
import { apiLogger } from '@/lib/logger';
import { ok, notFound, serverError } from '@/lib/api';

export const dynamic = 'force-dynamic';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ username: string }> }
) {
  try {
    const { username } = await params;

    const user = await db.findUserByUsername(username);
    if (!user) {
      return notFound('User not found');
    }

    const session = await auth();
    const currentUserId = session?.user?.id;
    const isOwnProfile = currentUserId === user.id;

    const [stats, posts, followerCount, followingCount, isFollowing, votePower] = await Promise.all(
      [
        db.getUserStats(user.id),
        db.getPostsByUserIdWithUpvotes(user.id, currentUserId),
        db.getFollowerCount(user.id),
        db.getFollowingCount(user.id),
        currentUserId ? db.isFollowing(currentUserId, user.id) : Promise.resolve(false),
        isOwnProfile ? db.getVoteWeight(user.id) : Promise.resolve(undefined),
      ]
    );

    const profile = {
      user: {
        id: user.id,
        username: user.username,
        name: user.name,
        avatar: user.image,
        bio: user.bio || null,
        points: user.points || 0,
        currentStreak: user.current_streak || 0,
        longestStreak: user.longest_streak || 0,
      },
      stats: {
        posts: stats.postCount,
        likes: stats.likeCount,
        ...(isOwnProfile && votePower !== undefined && { votePower }),
      },
      follow: {
        followerCount,
        followingCount,
        isFollowing,
      },
      posts,
    };

    apiLogger.info({ username, userId: user.id }, 'Profile fetched successfully');
    return ok(profile);
  } catch (error) {
    const { username } = await params;
    apiLogger.error({ error, username }, 'Error fetching profile');
    return serverError('Failed to fetch profile');
  }
}
