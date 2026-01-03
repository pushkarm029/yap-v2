import { NextResponse } from 'next/server';
import { auth } from '@/auth';
import { db } from '@/lib/database';
import { apiLogger } from '@/lib/logger';

export const dynamic = 'force-dynamic';

// GET /api/rewards/history - Get user's reward history (distributions + claims)
export async function GET() {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get distributions (what was earned) and claims (what was claimed) separately
    const [rewards, claims] = await Promise.all([
      db.getUserRewards(session.user.id),
      db.getUserClaimEvents(session.user.id),
    ]);

    return NextResponse.json({
      // Distributions: what the user earned in each distribution period
      distributions: rewards.map((r) => ({
        id: r.id,
        amountEarned: r.amount_earned ?? '0', // YAP earned this period
        cumulativeAmount: r.amount, // Total cumulative at this point (for reference)
        pointsConverted: r.points_converted,
        distributedAt: r.created_at,
      })),
      // Claims: actual on-chain claim transactions
      claims: claims.map((c) => ({
        id: c.id,
        amountClaimed: c.amount_claimed, // Delta transferred in this tx
        cumulativeClaimed: c.cumulative_claimed, // Total claimed after this tx
        txSignature: c.tx_signature,
        claimedAt: c.claimed_at,
      })),
    });
  } catch (error) {
    apiLogger.error({ error }, 'Error fetching reward history');
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
