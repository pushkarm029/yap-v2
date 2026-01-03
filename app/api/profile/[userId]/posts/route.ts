import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { db } from '@/lib/database';
import { apiLogger } from '@/lib/logger';

export const dynamic = 'force-dynamic';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ userId: string }> }
) {
  try {
    const session = await auth();
    const viewerId = session?.user?.id;

    const { userId } = await params;
    const { searchParams } = new URL(request.url);
    const type = searchParams.get('type') || 'posts';

    if (!userId) {
      return NextResponse.json({ error: 'User ID is required' }, { status: 400 });
    }

    const user = await db.findUserById(userId);

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    let posts: unknown[] = [];

    switch (type) {
      case 'all':
      case 'posts':
        posts = await db.getPostsByUserIdWithUpvotes(user.id, viewerId);
        break;

      case 'replies':
        posts = [];
        break;

      case 'likes':
        posts = await db.getLikedPostsByUserIdWithUpvotes(user.id, viewerId);
        break;

      default:
        return NextResponse.json({ error: 'Invalid type parameter' }, { status: 400 });
    }

    return NextResponse.json(posts);
  } catch (error) {
    apiLogger.error({ error }, 'Error fetching user posts');
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
