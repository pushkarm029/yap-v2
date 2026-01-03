import { NextResponse } from 'next/server';
import { auth } from '@/auth';
import { db } from '@/lib/database';
import { apiLogger } from '@/lib/logger';

export const dynamic = 'force-dynamic';

// GET /api/rewards/score - Get user's score/points data
export async function GET() {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const user = await db.findUserById(session.user.id);
    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Get distributed total to calculate pending
    const distributedTotal = await db.getUserDistributedTotal(session.user.id);
    const pending = Math.max(0, user.points - distributedTotal);

    // Get vote power from wallet snapshots
    const votePower = await db.getVoteWeight(session.user.id);

    return NextResponse.json({
      points: user.points,
      pending,
      votePower,
    });
  } catch (error) {
    apiLogger.error({ error }, 'Error fetching user score');
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
