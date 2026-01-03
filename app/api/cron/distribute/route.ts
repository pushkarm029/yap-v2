import { NextRequest, NextResponse } from 'next/server';
import { randomUUID } from 'crypto';
import { address } from '@solana/kit';
import { Connection, PublicKey, type AccountInfo } from '@solana/web3.js';
import { getAssociatedTokenAddressSync } from '@solana/spl-token';
import { db } from '@/lib/database';
import { apiLogger } from '@/lib/logger';
import {
  buildMerkleTree,
  submitMerkleRoot,
  getRateLimitedAvailable,
  getProof,
  getMintPda,
  getRpcEndpoint,
  type RewardEntry,
} from '@/lib/solana';
import { getNowISO } from '@/lib/utils/dates';
import {
  processActionsRecharged,
  processDistributionComplete,
  processDistributionMissed,
  processDistributionNudge,
} from '@/lib/services/gamifiedNotifications';

// RPC batch size for wallet balance fetching
const RPC_BATCH_SIZE = 100;

/**
 * Daily Distribution Cron Job
 *
 * Runs at midnight UTC to:
 * 1. Snapshot wallet balances (for vote power calculation)
 * 2. Distribute points as YAP tokens via merkle distribution
 *
 * TODO: Split snapshot logic back to separate cron when Vercel plan supports >2 crons
 * The snapshot could run every 6 hours for more granular vote power updates
 */
export async function GET(request: NextRequest) {
  const logger = apiLogger.child({ cron: 'distribute' });

  try {
    // Verify cron secret for security
    const authHeader = request.headers.get('authorization');
    const cronSecret = process.env.CRON_SECRET;

    if (!cronSecret) {
      logger.error('CRON_SECRET environment variable is not set');
      return NextResponse.json({ error: 'Server configuration error' }, { status: 500 });
    }

    if (authHeader !== `Bearer ${cronSecret}`) {
      logger.warn({ hasAuthHeader: !!authHeader }, 'Unauthorized cron attempt');
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    logger.info('Starting daily distribution (with wallet snapshot)');

    // =========================================================================
    // STEP 1: Snapshot wallet balances for vote power
    // =========================================================================
    let snapshotStats = { usersProcessed: 0, avgVotePower: 1.0 };

    try {
      snapshotStats = await snapshotWalletBalances(logger);
      logger.info(snapshotStats, 'Wallet snapshot complete');
    } catch (snapshotError) {
      // Log but don't fail - distribution can proceed with existing snapshots
      logger.error({ error: snapshotError }, 'Wallet snapshot failed - using existing data');
    }

    // =========================================================================
    // STEP 2: Distribute points as YAP tokens
    // =========================================================================
    const distributableUsers = await db.getDistributableUsers();

    if (distributableUsers.length === 0) {
      logger.info('No users with allocatable points, skipping distribution');
      return NextResponse.json({
        success: true,
        message: 'No distribution needed',
        usersProcessed: 0,
        totalAmount: '0',
        snapshot: snapshotStats,
        timestamp: getNowISO(),
      });
    }

    // Get rate-limited available from chain (matches contract's rate limiting)
    let dailyAvailable: bigint;
    try {
      dailyAvailable = await getRateLimitedAvailable();
      logger.info(
        { dailyAvailable: dailyAvailable.toString() },
        'Rate-limited available from chain'
      );
    } catch (chainError) {
      logger.error({ error: chainError }, 'Failed to get daily available from chain');
      return NextResponse.json(
        { error: 'Failed to query chain for daily available' },
        { status: 500 }
      );
    }

    // Calculate total allocatable points across all users
    const totalAllocatablePoints = distributableUsers.reduce(
      (sum, u) => sum + u.allocatable_points,
      0
    );

    if (totalAllocatablePoints === 0) {
      logger.info('Total allocatable points is 0, skipping');
      return NextResponse.json({
        success: true,
        message: 'No points to distribute',
        usersProcessed: 0,
        totalAmount: '0',
        snapshot: snapshotStats,
        timestamp: getNowISO(),
      });
    }

    logger.info(
      {
        totalAllocatablePoints,
        dailyAvailable: dailyAvailable.toString(),
        userCount: distributableUsers.length,
      },
      'Calculating proportional distribution'
    );

    // Calculate each user's share and build merkle entries with CUMULATIVE amounts
    const userAllocations: {
      user: (typeof distributableUsers)[0];
      newYapRaw: bigint;
      cumulativeYapRaw: bigint;
    }[] = [];

    // Scale factor to convert floating point points to integers for BigInt math
    // Points can be fractional due to weighted voting (vote_weight ranges 1.0-5.0)
    const POINTS_PRECISION = 1e12;

    for (const user of distributableUsers) {
      // Proportional share: (user_points / total_points) * daily_available
      // Scale floats to integers for BigInt math - scales cancel out in division
      const scaledUserPoints = BigInt(Math.round(user.allocatable_points * POINTS_PRECISION));
      const scaledTotalPoints = BigInt(Math.round(totalAllocatablePoints * POINTS_PRECISION));
      const newYapRaw = (scaledUserPoints * dailyAvailable) / scaledTotalPoints;

      // Cumulative = previous + new
      const previousCumulative = BigInt(user.cumulative_yap || '0');
      const cumulativeYapRaw = previousCumulative + newYapRaw;

      userAllocations.push({
        user,
        newYapRaw,
        cumulativeYapRaw,
      });
    }

    // Build merkle tree with CUMULATIVE amounts (not just new allocation)
    // Defense: Filter out any invalid wallets (should be caught by DB query, but defense in depth)
    const validAllocations = userAllocations.filter((ua) => {
      if (!ua.user.wallet_address) {
        logger.error({ userId: ua.user.id }, 'User has no wallet despite DB filter - skipping');
        return false;
      }
      return true;
    });

    const entries: RewardEntry[] = validAllocations.map((ua) => ({
      wallet: address(ua.user.wallet_address),
      amount: ua.cumulativeYapRaw,
    }));

    const distribution = buildMerkleTree(entries);
    const merkleRoot = distribution.root;

    // Total NEW amount being distributed this cycle (only valid allocations)
    const totalNewAmountBigInt = validAllocations.reduce(
      (sum, ua) => sum + ua.newYapRaw,
      BigInt(0)
    );
    const totalNewAmount = totalNewAmountBigInt.toString();

    logger.info(
      {
        userCount: entries.length,
        totalNewAmount,
        merkleRoot: Buffer.from(merkleRoot).toString('hex').slice(0, 16) + '...',
      },
      'Merkle tree built with cumulative amounts'
    );

    // Create distribution record in database
    const distributionId = randomUUID();
    await db.createDistribution(
      distributionId,
      Buffer.from(merkleRoot).toString('hex'),
      totalNewAmountBigInt,
      entries.length
    );

    // Create user_rewards records with points tracking
    // Store CUMULATIVE YAP amounts (matching merkle tree design)
    // Also pre-compute and store merkle proofs for O(1) claim lookups
    for (const ua of validAllocations) {
      const rewardId = randomUUID();
      const walletAddr = address(ua.user.wallet_address);

      // Get merkle proof for this user's wallet
      const claimProof = getProof(distribution, walletAddr);
      const proofHexArray = claimProof
        ? claimProof.proof.map((p) => Buffer.from(p).toString('hex'))
        : [];

      await db.createUserReward(
        rewardId,
        distributionId,
        ua.user.id,
        ua.user.wallet_address,
        ua.cumulativeYapRaw, // Store cumulative for merkle verification
        ua.user.allocatable_points, // Track points converted
        ua.newYapRaw, // Store incremental amount_earned
        proofHexArray // Pre-computed merkle proof
      );
    }

    logger.info({ distributionId }, 'Distribution records created');

    // Submit distribution onchain (transfers tokens and sets merkle root)
    let submitTx: string | undefined;
    try {
      submitTx = await submitMerkleRoot(merkleRoot, totalNewAmountBigInt);
      logger.info({ submitTx }, 'Distribution submitted onchain');

      // Mark distribution as submitted
      await db.submitDistribution(distributionId, submitTx);
    } catch (submitError) {
      // Log but don't fail - distribution can be submitted manually later
      logger.error(
        { error: submitError, distributionId },
        'Failed to submit merkle root onchain - manual submission required'
      );
    }

    // =========================================================================
    // STEP 3: Send "Actions Recharged" notifications
    // =========================================================================
    let actionsRechargedSent = 0;
    try {
      actionsRechargedSent = await processActionsRecharged();
      logger.info({ actionsRechargedSent }, 'Actions recharged notifications sent');
    } catch (notifError) {
      // Log but don't fail - distribution succeeded
      logger.error({ error: notifError }, 'Failed to send actions recharged notifications');
    }

    // =========================================================================
    // STEP 4: Send distribution notifications (complete, missed, nudge)
    // =========================================================================
    const distributionNotifs = { complete: 0, missed: 0, nudge: 0 };
    try {
      distributionNotifs.complete = await processDistributionComplete();
      distributionNotifs.missed = await processDistributionMissed();
      distributionNotifs.nudge = await processDistributionNudge();
      logger.info({ distributionNotifs }, 'Distribution notifications sent');
    } catch (notifError) {
      // Log but don't fail - distribution succeeded
      logger.error({ error: notifError }, 'Failed to send distribution notifications');
    }

    return NextResponse.json({
      success: true,
      distributionId,
      usersProcessed: distributableUsers.length,
      totalNewAmount,
      dailyPool: dailyAvailable.toString(),
      totalAllocatablePoints,
      merkleRoot: Buffer.from(merkleRoot).toString('hex'),
      submitTx,
      snapshot: snapshotStats,
      actionsRechargedSent,
      distributionNotifs,
      timestamp: getNowISO(),
    });
  } catch (error) {
    logger.error({ error }, 'Distribution cron failed');
    return NextResponse.json({ error: 'Distribution failed' }, { status: 500 });
  }
}

/**
 * Snapshot wallet balances + unclaimed rewards for vote power calculation.
 * Vote power is calculated from effectiveBalance = walletBalance + unclaimedBalance.
 *
 * Returns stats about the snapshot.
 */
async function snapshotWalletBalances(
  logger: typeof apiLogger
): Promise<{ usersProcessed: number; avgVotePower: number }> {
  const usersWithWallets = await db.getUsersWithWallets();

  if (usersWithWallets.length === 0) {
    logger.info('No users with wallets, skipping snapshot');
    return { usersProcessed: 0, avgVotePower: 1.0 };
  }

  logger.info(
    { userCount: usersWithWallets.length },
    'Fetching wallet balances and unclaimed rewards'
  );

  // ========================================
  // STEP 1: Fetch on-chain wallet balances
  // ========================================
  const connection = new Connection(getRpcEndpoint(), 'confirmed');
  const [mintPda] = getMintPda();

  // Derive all ATAs (with validation for invalid wallet addresses)
  const ataInfos: { user: (typeof usersWithWallets)[0]; ata: PublicKey }[] = [];
  let invalidWalletCount = 0;

  for (const user of usersWithWallets) {
    try {
      const walletPubkey = new PublicKey(user.wallet_address);
      const ata = getAssociatedTokenAddressSync(mintPda, walletPubkey);
      ataInfos.push({ user, ata });
    } catch {
      logger.warn(
        { userId: user.id, wallet: user.wallet_address },
        'Invalid wallet address format'
      );
      invalidWalletCount++;
    }
  }

  if (invalidWalletCount > 0) {
    logger.warn({ invalidWalletCount }, 'Skipped users with invalid wallet addresses');
  }

  // Batch fetch ATA accounts in chunks (RPC limit is typically 100)
  const ataAccounts: (AccountInfo<Buffer> | null)[] = [];

  for (let i = 0; i < ataInfos.length; i += RPC_BATCH_SIZE) {
    const batch = ataInfos.slice(i, i + RPC_BATCH_SIZE);
    const batchResults = await connection.getMultipleAccountsInfo(batch.map((info) => info.ata));
    ataAccounts.push(...batchResults);
  }

  // ========================================
  // STEP 2: Batch fetch unclaimed rewards
  // ========================================
  const userIds = ataInfos.map((info) => info.user.id);
  const unclaimedMap = await db.getBatchUnclaimedTotals(userIds);

  logger.info({ usersWithUnclaimed: unclaimedMap.size }, 'Fetched unclaimed rewards');

  // ========================================
  // STEP 3: Build snapshot entries
  // ========================================
  const snapshotEntries: {
    userId: string;
    walletAddress: string;
    balance: string;
    unclaimedBalance: string;
    effectiveBalance: string;
    votePower: number;
  }[] = [];

  let zeroBalanceCount = 0;
  let errorCount = 0;

  for (let i = 0; i < ataInfos.length; i++) {
    const { user } = ataInfos[i];
    const accountInfo = ataAccounts[i];

    let walletBalance = BigInt(0);

    if (accountInfo) {
      // Token account data layout:
      // mint (32) + owner (32) + amount (8) + ...
      // Amount is at offset 64, 8 bytes little-endian
      if (accountInfo.data.length >= 72) {
        const amountBytes = accountInfo.data.slice(64, 72);
        walletBalance = amountBytes.readBigUInt64LE();
      } else {
        logger.warn(
          { userId: user.id, dataLength: accountInfo.data.length },
          'Invalid token account data length'
        );
        errorCount++;
        continue;
      }
    } else {
      // Account doesn't exist = zero balance (not an error)
      zeroBalanceCount++;
    }

    // Get unclaimed balance (defaults to '0' if user has no rewards)
    const unclaimedBalance = BigInt(unclaimedMap.get(user.id) || '0');

    // Calculate effective balance = wallet + unclaimed
    const effectiveBalance = walletBalance + unclaimedBalance;

    // Calculate vote power from effective balance (not just wallet)
    const votePower = db.calculateVotePower(effectiveBalance.toString());

    snapshotEntries.push({
      userId: user.id,
      walletAddress: user.wallet_address,
      balance: walletBalance.toString(),
      unclaimedBalance: unclaimedBalance.toString(),
      effectiveBalance: effectiveBalance.toString(),
      votePower,
    });
  }

  // ========================================
  // STEP 4: Save all snapshots
  // ========================================
  if (snapshotEntries.length > 0) {
    await db.batchSaveWalletSnapshots(snapshotEntries);
  }

  // Calculate stats
  const avgVotePower =
    snapshotEntries.length > 0
      ? snapshotEntries.reduce((sum, e) => sum + e.votePower, 0) / snapshotEntries.length
      : 1.0;

  const nonZeroUnclaimed = snapshotEntries.filter((e) => e.unclaimedBalance !== '0').length;

  logger.info(
    {
      usersProcessed: snapshotEntries.length,
      zeroBalanceCount,
      nonZeroUnclaimed,
      errorCount,
      avgVotePower: avgVotePower.toFixed(2),
    },
    'Wallet + unclaimed balance snapshot saved'
  );

  return {
    usersProcessed: snapshotEntries.length,
    avgVotePower: Number(avgVotePower.toFixed(2)),
  };
}
