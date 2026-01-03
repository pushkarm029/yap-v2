import { NextResponse } from 'next/server';
import { auth } from '@/auth';
import { db } from '@/lib/database';
import { apiLogger } from '@/lib/logger';
import { getRateLimitedAvailable } from '@/lib/solana';

export const dynamic = 'force-dynamic';

// Calculate seconds until next midnight UTC
function getSecondsUntilMidnightUTC(): number {
  const now = new Date();
  const midnight = new Date(now);
  midnight.setUTCDate(midnight.getUTCDate() + 1);
  midnight.setUTCHours(0, 0, 0, 0);
  return Math.floor((midnight.getTime() - now.getTime()) / 1000);
}

// GET /api/rewards/pool - Get distribution pool info
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

    // Calculate pending points
    const distributedTotal = await db.getUserDistributedTotal(session.user.id);
    const pending = Math.max(0, user.points - distributedTotal);

    // Get rate-limited daily pool from chain (this is the slow call)
    // Returns 0 if program not yet initialized on chain
    let dailyPoolBigInt: bigint;
    let dailyPool: string;
    try {
      dailyPoolBigInt = await getRateLimitedAvailable();
      dailyPool = dailyPoolBigInt.toString();
    } catch (error) {
      // Program not initialized on chain yet - show 0 for daily pool
      apiLogger.warn(
        { error: error instanceof Error ? error.message : error },
        'Config account not found - using 0 for daily pool'
      );
      dailyPoolBigInt = BigInt(0);
      dailyPool = '0';
    }

    // Get total pending points across all users
    const totalPendingPoints = await db.getTotalPendingPoints();

    // Calculate user's share
    let userSharePercent = 0;
    let estimatedReward = '0';
    if (totalPendingPoints > 0 && pending > 0) {
      userSharePercent = (pending / totalPendingPoints) * 100;
      const estimatedBigInt =
        (BigInt(Math.floor(pending)) * dailyPoolBigInt) / BigInt(Math.floor(totalPendingPoints));
      estimatedReward = estimatedBigInt.toString();
    }

    return NextResponse.json({
      walletConnected: !!user.wallet_address,
      dailyPool,
      totalPendingPoints,
      userSharePercent,
      estimatedReward,
      nextDistributionIn: getSecondsUntilMidnightUTC(),
    });
  } catch (error) {
    apiLogger.error(
      {
        error: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined,
      },
      'Error fetching pool info'
    );
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
