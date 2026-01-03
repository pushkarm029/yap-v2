import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { db } from '@/lib/database';
import { apiLogger } from '@/lib/logger';
import { address } from '@solana/kit';

// POST /api/rewards/wallet - Save user's wallet address
export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { walletAddress } = body;

    if (!walletAddress) {
      return NextResponse.json({ error: 'Wallet address required' }, { status: 400 });
    }

    // Validate wallet address format
    try {
      address(walletAddress);
    } catch {
      return NextResponse.json({ error: 'Invalid wallet address' }, { status: 400 });
    }

    // Check if wallet is already linked to another user
    const existingUser = await db.getUserByWallet(walletAddress);
    if (existingUser && existingUser.id !== session.user.id) {
      return NextResponse.json(
        { error: 'Wallet already linked to another account' },
        { status: 409 }
      );
    }

    await db.saveUserWallet(session.user.id, walletAddress);

    apiLogger.info({ userId: session.user.id, walletAddress }, 'Wallet address saved');

    return NextResponse.json({
      success: true,
      walletAddress,
    });
  } catch (error) {
    apiLogger.error({ error }, 'Error saving wallet address');
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
