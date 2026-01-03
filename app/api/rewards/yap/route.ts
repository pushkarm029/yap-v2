import { NextResponse } from 'next/server';
import { auth } from '@/auth';
import { db } from '@/lib/database';
import { apiLogger } from '@/lib/logger';

export const dynamic = 'force-dynamic';

// GET /api/rewards/yap - Get user's YAP token balances and claimable info
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

    // Get claim totals
    const claimedTotal = await db.getUserClaimedTotal(session.user.id);
    const unclaimedTotal = await db.getUserUnclaimedTotal(session.user.id);

    // Get claimable reward (from submitted distributions)
    const claimable = await db.getUserClaimableReward(session.user.id);

    return NextResponse.json({
      walletConnected: !!user.wallet_address,
      claimable: claimable
        ? {
            id: claimable.id,
            amount: claimable.amount,
            distributionId: claimable.distribution_id,
          }
        : null,
      claimableTotal: unclaimedTotal,
      claimedTotal: claimedTotal,
    });
  } catch (error) {
    apiLogger.error({ error }, 'Error fetching YAP balance');
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
