import { NextRequest } from 'next/server';
import { db } from '@/lib/database';
import { apiLogger } from '@/lib/logger';
import { sendSocialNotification } from '@/lib/services/notifications';
import { checkFollowerMilestone } from '@/lib/services/realTimeNotifications';
import { requireAuth, isAuthError, ok, badRequest, notFound, serverError } from '@/lib/api';

export const dynamic = 'force-dynamic';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ username: string }> }
) {
  try {
    const authResult = await requireAuth();
    if (isAuthError(authResult)) return authResult;
    const { userId } = authResult;

    const { username } = await params;
    const userToFollow = await db.findUserByUsername(username);

    if (!userToFollow) {
      return notFound('User not found');
    }

    if (userToFollow.id === userId) {
      return badRequest('Cannot follow yourself');
    }

    const isAlreadyFollowing = await db.isFollowing(userId, userToFollow.id);
    if (isAlreadyFollowing) {
      return badRequest('Already following');
    }

    // Get previous follower count for milestone tracking
    const previousFollowerCount = await db.getFollowerCount(userToFollow.id);

    await db.followUser(userId, userToFollow.id);

    await sendSocialNotification({
      type: 'follow',
      recipientId: userToFollow.id,
      actorId: userId,
    });

    const followerCount = await db.getFollowerCount(userToFollow.id);

    // Real-time: Check if user crossed a follower milestone
    await checkFollowerMilestone(userToFollow.id, previousFollowerCount, followerCount);

    apiLogger.info(
      { followerId: userId, followingId: userToFollow.id },
      'User followed successfully'
    );

    return ok({ following: true, followerCount });
  } catch (error) {
    const { username } = await params;
    apiLogger.error({ error, username }, 'Error following user');
    return serverError('Failed to follow user');
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ username: string }> }
) {
  try {
    const authResult = await requireAuth();
    if (isAuthError(authResult)) return authResult;
    const { userId } = authResult;

    const { username } = await params;
    const userToUnfollow = await db.findUserByUsername(username);

    if (!userToUnfollow) {
      return notFound('User not found');
    }

    await db.unfollowUser(userId, userToUnfollow.id);

    const followerCount = await db.getFollowerCount(userToUnfollow.id);

    apiLogger.info(
      { followerId: userId, followingId: userToUnfollow.id },
      'User unfollowed successfully'
    );

    return ok({ following: false, followerCount });
  } catch (error) {
    const { username } = await params;
    apiLogger.error({ error, username }, 'Error unfollowing user');
    return serverError('Failed to unfollow user');
  }
}
