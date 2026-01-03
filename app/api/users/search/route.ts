import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { db } from '@/lib/database';
import { apiLogger } from '@/lib/logger';
import { enrichUsersWithFollowStatus } from '@/lib/user-helpers';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const query = searchParams.get('q');
    const limitParam = searchParams.get('limit');

    if (!query || query.trim().length === 0) {
      return NextResponse.json({ users: [] });
    }

    const limit = limitParam ? parseInt(limitParam, 10) : 5;
    const validLimit = isNaN(limit) || limit < 1 ? 5 : Math.min(limit, 50);

    const users = await db.searchUsersByUsername(query.trim(), validLimit);
    const session = await auth();
    const enrichedUsers = await enrichUsersWithFollowStatus(users, session?.user?.id);

    return NextResponse.json({ users: enrichedUsers });
  } catch (error) {
    apiLogger.error({ error }, 'Error searching users');
    return NextResponse.json({ users: [] });
  }
}
