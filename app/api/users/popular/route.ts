import { NextResponse } from 'next/server';
import { auth } from '@/auth';
import { db } from '@/lib/database';
import { apiLogger } from '@/lib/logger';
import { enrichUsersWithFollowStatus } from '@/lib/user-helpers';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const users = await db.getPopularUsers(10);
    const session = await auth();
    const enrichedUsers = await enrichUsersWithFollowStatus(users, session?.user?.id);

    return NextResponse.json({ users: enrichedUsers });
  } catch (error) {
    apiLogger.error({ error }, 'Error fetching popular users');
    return NextResponse.json({ error: 'Failed to fetch popular users' }, { status: 500 });
  }
}
