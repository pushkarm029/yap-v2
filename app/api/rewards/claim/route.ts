import { NextRequest } from 'next/server';
import { randomUUID } from 'crypto';
import { db } from '@/lib/database';
import { apiLogger } from '@/lib/logger';
import { address, type Address } from '@solana/kit';
import { getProof, buildMerkleTree, type RewardEntry } from '@/lib/solana';
import {
  requireUser,
  isAuthError,
  ok,
  badRequest,
  forbidden,
  notFound,
  serverError,
  requireWallet,
  requireString,
  requireTxSignature,
} from '@/lib/api';

// GET /api/rewards/claim?wallet=xxx - Get claim proof for wallet
export async function GET(request: NextRequest) {
  try {
    const authResult = await requireUser();
    if (isAuthError(authResult)) return authResult;
    const { user } = authResult;

    const walletParam = request.nextUrl.searchParams.get('wallet');
    const walletResult = requireWallet(walletParam);
    if (!walletResult.ok) return walletResult.error;
    const userWallet: Address = walletResult.value;

    // Security: Verify the wallet belongs to the authenticated user
    if (!user.wallet_address) {
      return badRequest('No wallet linked to account');
    }
    if (user.wallet_address !== walletParam) {
      return forbidden('Wallet mismatch');
    }

    const claimable = await db.getClaimableRewardByWallet(walletParam);

    if (!claimable) {
      return ok({
        wallet: userWallet,
        amount: '0',
        proof: [],
        claimable: false,
        message: 'No claimable rewards found',
      });
    }

    // Check for pre-stored merkle proof
    if (claimable.merkle_proof) {
      try {
        const proof = JSON.parse(claimable.merkle_proof) as string[];
        return ok({
          wallet: userWallet,
          amount: claimable.amount,
          proof,
          claimable: true,
          rewardId: claimable.id,
        });
      } catch {
        apiLogger.warn({ rewardId: claimable.id }, 'Invalid stored merkle proof, rebuilding');
      }
    }

    // Fallback: Build merkle tree (expensive - prefer storing proofs)
    const allRewardsResult = await db.getDistributionRewards(claimable.distribution_id);
    const entries: RewardEntry[] = allRewardsResult.map((r) => ({
      wallet: address(r.wallet_address),
      amount: BigInt(r.amount),
    }));

    const merkleDistribution = buildMerkleTree(entries);
    const proof = getProof(merkleDistribution, userWallet);

    if (!proof) {
      return ok({
        wallet: userWallet,
        amount: '0',
        proof: [],
        claimable: false,
        message: 'Wallet not found in distribution',
      });
    }

    return ok({
      wallet: proof.wallet,
      amount: proof.amount.toString(),
      proof: proof.proof.map((p) => Buffer.from(p).toString('hex')),
      claimable: true,
      rewardId: claimable.id,
    });
  } catch (error) {
    apiLogger.error({ error }, 'Error fetching claim proof');
    return serverError();
  }
}

// POST /api/rewards/claim - Record a successful claim transaction
export async function POST(request: NextRequest) {
  try {
    const authResult = await requireUser();
    if (isAuthError(authResult)) return authResult;
    const { userId } = authResult;

    const body = await request.json();

    const rewardIdResult = requireString(body.rewardId, 'rewardId');
    if (!rewardIdResult.ok) return rewardIdResult.error;
    const rewardId = rewardIdResult.value;

    const claimTxResult = requireTxSignature(body.claimTx);
    if (!claimTxResult.ok) return claimTxResult.error;
    const claimTx = claimTxResult.value;

    // Idempotent check
    const alreadyRecorded = await db.claimEventExistsForTx(claimTx);
    if (alreadyRecorded) {
      apiLogger.info({ claimTx }, 'Claim transaction already recorded');
      return ok({ success: true, message: 'Claim already recorded' });
    }

    const reward = await db.getRewardById(rewardId);
    if (!reward) {
      return notFound('Reward not found');
    }
    if (reward.user_id !== userId) {
      return forbidden('Not your reward');
    }

    const previousClaimedTotal = await db.getUserClaimedTotal(userId);
    const previousClaimed = BigInt(previousClaimedTotal);
    const rewardAmount = BigInt(reward.amount);
    const amountClaimed = rewardAmount - previousClaimed;

    if (amountClaimed <= BigInt(0)) {
      return badRequest('Nothing to claim');
    }

    await db.createClaimEvent(
      randomUUID(),
      userId,
      reward.wallet_address,
      amountClaimed,
      rewardAmount,
      rewardId,
      claimTx
    );

    apiLogger.info(
      { userId, rewardId, claimTx, amountClaimed: amountClaimed.toString() },
      'Claim event recorded'
    );

    return ok({
      success: true,
      message: 'Claim recorded',
      amountClaimed: amountClaimed.toString(),
    });
  } catch (error) {
    apiLogger.error({ error }, 'Error recording claim');
    return serverError();
  }
}
