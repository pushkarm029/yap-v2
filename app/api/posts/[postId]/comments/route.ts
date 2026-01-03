import { NextRequest } from 'next/server';
import { db } from '@/lib/database';
import { APP_CONFIG } from '@/constants';
import { apiLogger } from '@/lib/logger';
import { verifyImageOwnership } from '@/lib/utils';
import { sendSocialNotification } from '@/lib/services/notifications';
import {
  requireInvite,
  isAuthError,
  ok,
  badRequest,
  forbidden,
  notFound,
  tooManyRequests,
  serverError,
  requireString,
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
    const { content, parentCommentId, image_url } = await request.json();

    // Validate content
    const contentResult = requireString(content, 'Comment content', APP_CONFIG.TWEET_MAX_LENGTH);
    if (!contentResult.ok) return contentResult.error;
    const validContent = contentResult.value;

    // Verify image ownership if provided
    if (image_url && !verifyImageOwnership(image_url, userId)) {
      apiLogger.warn(
        { userId, attemptedImageUrl: image_url, postId },
        'IDOR attempt: User tried to use image they do not own in comment'
      );
      return forbidden('You can only use images you uploaded');
    }

    const result = await db.createCommentTransaction(
      userId,
      postId,
      validContent,
      parentCommentId || null,
      image_url
    );

    if (!result.success) {
      if (result.error === 'Daily action limit reached') {
        apiLogger.warn({ userId, postId }, 'Daily action limit reached');
        return tooManyRequests(result.error, { commentCount: result.commentCount });
      }
      if (result.error === 'Post not found') {
        return notFound(result.error);
      }
      return badRequest(result.error ?? 'Failed to create comment', {
        commentCount: result.commentCount,
      });
    }

    apiLogger.info({ userId, postId, commentCount: result.commentCount }, 'Comment created');

    // Handle mentions
    const mentionedUsernames = db.extractMentions(validContent);
    if (mentionedUsernames.length > 0 && result.comment) {
      try {
        const mentionedUsers = await db.validateUsernames(mentionedUsernames);
        const mentionSnippet =
          validContent.substring(0, 100) + (validContent.length > 100 ? '...' : '');

        for (const mentionedUser of mentionedUsers) {
          await sendSocialNotification({
            type: 'mention',
            recipientId: mentionedUser.id,
            actorId: userId,
            postId,
            mentionSnippet,
          });
        }
      } catch (mentionError) {
        apiLogger.warn(
          { error: mentionError, postId, commentId: result.comment?.id },
          'Failed to process mentions in comment'
        );
      }
    }

    // Notify post author
    if (result.authorId) {
      await sendSocialNotification({
        type: 'comment',
        recipientId: result.authorId,
        actorId: userId,
        postId,
      });
    }

    return ok({
      success: true,
      comment: result.comment,
      commentCount: result.commentCount,
      remaining: result.remaining,
    });
  } catch (error) {
    apiLogger.error({ error }, 'Error in POST /api/posts/[postId]/comments');
    return serverError();
  }
}
