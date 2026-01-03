import { NextRequest } from 'next/server';
import { auth } from '@/auth';
import { db } from '@/lib/database';
import { APP_CONFIG } from '@/constants';
import { apiLogger } from '@/lib/logger';
import { verifyImageOwnership } from '@/lib/utils/image';
import { sendSocialNotification } from '@/lib/services/notifications';
import { checkStreakMilestone, triggerDailyGoal } from '@/lib/services/realTimeNotifications';
import {
  requireInvitedUser,
  isAuthError,
  ok,
  forbidden,
  tooManyRequests,
  serverError,
  validatePostContentOptional,
  validateLimit,
} from '@/lib/api';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    const userId = session?.user?.id;

    const { searchParams } = new URL(request.url);
    const cursor = searchParams.get('cursor') || undefined;
    const limit = validateLimit(searchParams.get('limit'), 20, 50);

    if (searchParams.has('limit') || cursor) {
      const { posts, nextCursor } = await db.getPaginatedPosts(userId, cursor, limit);
      return ok({ posts, nextCursor });
    }

    const posts = await db.getAllPostsWithUpvotes(userId);
    return ok(posts);
  } catch (error) {
    apiLogger.error({ error }, 'Error fetching posts');
    return serverError('Failed to fetch posts');
  }
}

export async function POST(request: NextRequest) {
  try {
    // Auth + invite + user validation in one call
    const authResult = await requireInvitedUser();
    if (isAuthError(authResult)) return authResult;
    const { userId } = authResult;

    // Check daily action limit
    const actionLimit = await db.checkTotalDailyLimit(userId, APP_CONFIG.DAILY_ACTION_LIMIT);
    if (actionLimit.remaining <= 0) {
      apiLogger.warn({ userId, limit: actionLimit }, 'Daily action limit reached');
      return tooManyRequests('Daily action limit reached', { limit: actionLimit });
    }

    const { content, image_url } = await request.json();

    // Validate content (optional if image is present - allows photo-only posts)
    const hasImage = !!image_url;
    const contentResult = validatePostContentOptional(content, hasImage);
    if (!contentResult.ok) return contentResult.error;
    const validContent = contentResult.value;

    // Verify image ownership if provided
    if (image_url && !verifyImageOwnership(image_url, userId)) {
      apiLogger.warn(
        { userId, attemptedImageUrl: image_url },
        'IDOR attempt: User tried to use image they do not own'
      );
      return forbidden('You can only use images you uploaded');
    }

    // Extract mentions only if there's content
    const mentionedUsernames = validContent ? db.extractMentions(validContent) : [];
    const mentionedUsers = await db.validateUsernames(mentionedUsernames);

    const post = await db.createPost(validContent, userId, image_url);

    // Update user's streak and check for milestone
    const streakResult = await db.updateStreak(userId);
    if (streakResult?.updated) {
      await checkStreakMilestone(userId, streakResult.previousStreak, streakResult.newStreak);
    }

    // Check if this was the user's last daily action (trigger daily_goal notification)
    const remaining = actionLimit.remaining - 1;
    if (remaining === 0) {
      await triggerDailyGoal(userId);
    }

    // Send mention notifications
    if (mentionedUsers.length > 0) {
      const mentionSnippet =
        validContent.substring(0, 100) + (validContent.length > 100 ? '...' : '');

      for (const mentionedUser of mentionedUsers) {
        await sendSocialNotification({
          type: 'mention',
          recipientId: mentionedUser.id,
          actorId: userId,
          postId: post.id,
          mentionSnippet,
        });
      }
    }

    apiLogger.info(
      {
        postId: post.id,
        userId,
        contentLength: validContent.length,
        mentions: mentionedUsers.length,
        streak: streakResult?.newStreak,
      },
      'Post created successfully'
    );

    return ok({ ...post, remaining });
  } catch (error) {
    apiLogger.error({ error }, 'Error creating post');
    return serverError('Failed to create post');
  }
}
