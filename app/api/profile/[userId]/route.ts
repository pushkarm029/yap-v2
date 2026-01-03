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
    const { userId } = await params;

    if (!userId) {
      return NextResponse.json({ error: 'User ID is required' }, { status: 400 });
    }

    const profile = await db.getUserProfile(userId);

    if (!profile) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Check if the requesting user is viewing their own profile
    const session = await auth();
    const isOwner = session?.user?.id === profile.id;

    return NextResponse.json({ ...profile, isOwner });
  } catch (error) {
    apiLogger.error({ error }, 'Error fetching user profile');
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
