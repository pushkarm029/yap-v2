import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { db } from '@/lib/database';
import { apiLogger } from '@/lib/logger';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ postId: string }> }
) {
  try {
    const session = await auth();
    const { postId } = await params;

    apiLogger.debug({ postId, userId: session?.user?.id }, 'Fetching top-level comments');

    // Get only top-level comments with enrichment
    const comments = await db.getTopLevelCommentsWithEnrichment(postId, session?.user?.id);

    apiLogger.info(
      { postId, commentCount: comments.length },
      'Top-level comments fetched successfully'
    );

    return NextResponse.json({
      comments: comments,
    });
  } catch (error) {
    apiLogger.error({ error }, 'Error fetching thread');
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
