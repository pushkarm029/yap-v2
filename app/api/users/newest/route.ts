import { NextResponse } from 'next/server';
import { auth } from '@/auth';
import { db } from '@/lib/database';
import { apiLogger } from '@/lib/logger';
import { enrichUsersWithFollowStatus } from '@/lib/user-helpers';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const users = await db.getNewestUsers(5);
    const session = await auth();
    const enrichedUsers = await enrichUsersWithFollowStatus(users, session?.user?.id);

    return NextResponse.json({ users: enrichedUsers });
  } catch (error) {
    apiLogger.error({ error }, 'Error fetching newest users');
    return NextResponse.json({ error: 'Failed to fetch newest users' }, { status: 500 });
  }
}
