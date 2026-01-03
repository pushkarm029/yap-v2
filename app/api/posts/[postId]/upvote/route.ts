import { NextRequest } from 'next/server';
import { db } from '@/lib/database';
import { apiLogger } from '@/lib/logger';
import { sendSocialNotification } from '@/lib/services/notifications';
import {
  checkPointsMilestone,
  checkPostMomentum,
  triggerDailyGoal,
} from '@/lib/services/realTimeNotifications';
import {
  requireInvite,
  requireAuth,
  isAuthError,
  ok,
  badRequest,
  notFound,
  tooManyRequests,
  serverError,
  respond,
} from '@/lib/api';

export const dynamic = 'force-dynamic';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ postId: string }> }
) {
  try {
    const authResult = await requireInvite();
    if (isAuthError(authResult)) return authResult;
    const { userId } = authResult;

    const { postId } = await params;

    const result = await db.createUpvoteTransaction(userId, postId);

    if (!result.success) {
      if (result.error === 'Daily action limit reached') {
        apiLogger.warn({ userId, postId }, 'Daily action limit reached');
        return tooManyRequests(result.error, { upvoteCount: result.upvoteCount });
      }
      if (result.error === 'Already upvoted') {
        return respond({ error: result.error, upvoteCount: result.upvoteCount }, 409);
      }
      if (result.error === 'Post not found') {
        return notFound(result.error);
      }
      return badRequest(result.error ?? 'Operation failed', { upvoteCount: result.upvoteCount });
    }

    apiLogger.info({ userId, postId, upvoteCount: result.upvoteCount }, 'Upvote created');

    if (result.authorId) {
      // Social notification for the upvote
      await sendSocialNotification({
        type: 'upvote',
        recipientId: result.authorId,
        actorId: userId,
        postId,
        votePower: result.voteWeight,
      });

      // Real-time: Check if author crossed a points milestone
      if (
        result.authorPreviousTotalUpvotes !== undefined &&
        result.authorTotalUpvotes !== undefined
      ) {
        await checkPointsMilestone(
          result.authorId,
          result.authorPreviousTotalUpvotes,
          result.authorTotalUpvotes
        );
      }

      // Real-time: Check if post has momentum (10+ upvotes in 6h)
      if (result.postCreatedAt) {
        await checkPostMomentum(postId, result.authorId, result.upvoteCount, result.postCreatedAt);
      }
    }

    // Check if this was the user's last daily action (trigger daily_goal notification)
    if (result.remaining === 0) {
      await triggerDailyGoal(userId);
    }

    return ok({
      success: true,
      upvoted: true,
      upvoteCount: result.upvoteCount,
      remaining: result.remaining,
    });
  } catch (error) {
    apiLogger.error({ error }, 'Error in POST /api/posts/[postId]/upvote');
    return serverError();
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ postId: string }> }
) {
  try {
    const authResult = await requireAuth();
    if (isAuthError(authResult)) return authResult;
    const { userId } = authResult;

    const { postId } = await params;

    const result = await db.removeUpvoteTransaction(userId, postId);

    if (!result.success) {
      if (result.error === 'Post not found') {
        return notFound(result.error);
      }
      return badRequest(result.error ?? 'Operation failed', { upvoteCount: result.upvoteCount });
    }

    apiLogger.info({ userId, postId, upvoteCount: result.upvoteCount }, 'Upvote removed');

    return ok({ success: true, upvoted: false, upvoteCount: result.upvoteCount });
  } catch (error) {
    apiLogger.error({ error }, 'Error in DELETE /api/posts/[postId]/upvote');
    return serverError();
  }
}
