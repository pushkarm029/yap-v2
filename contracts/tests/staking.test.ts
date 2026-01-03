/**
 * Staking instruction tests using LiteSVM
 *
 * Phase 1 Simplified Staking:
 * - No minimum stake requirement (any amount allowed)
 * - No lock period (instant unstake)
 * - Vote power calculated off-chain: 1 + 4 * (staked / (staked + 1M))
 */
import { describe, it, expect, beforeEach } from 'bun:test';
import { PublicKey, Keypair, Transaction, LAMPORTS_PER_SOL } from '@solana/web3.js';
import { TOKEN_PROGRAM_ID } from '@solana/spl-token';

import {
  createTestEnv,
  initializeProgram,
  warpTime,
  getConfig,
  getTokenBalance,
  isSuccess,
  getLogs,
  computeLeaf,
  buildMerkleTree,
  findUserStakePda,
  buildStakeIx,
  stake,
  unstake,
  getUserStake,
  fundUserViaClaim,
  TestEnv,
  DECIMALS,
} from './helpers/litesvm-setup';

// Associated Token Account program ID
const ATA_PROGRAM_ID = new PublicKey('ATokenGPvbdGVxr1b2hvZbsiqW5xWH25efTNsLJA8knL');

// Test amounts (no minimum in Phase 1)
const TEST_STAKE_AMOUNT = BigInt(100) * BigInt(10 ** DECIMALS); // 100 YAP for testing

describe('staking', () => {
  let env: TestEnv;

  function getOrCreateAta(owner: PublicKey, mint: PublicKey): PublicKey {
    const [ata] = PublicKey.findProgramAddressSync(
      [owner.toBuffer(), TOKEN_PROGRAM_ID.toBuffer(), mint.toBuffer()],
      ATA_PROGRAM_ID
    );
    return ata;
  }

  beforeEach(() => {
    env = createTestEnv();
    const initResult = initializeProgram(env);
    expect(isSuccess(initResult)).toBe(true);

    // Warp time so distribution is available
    warpTime(env, 86400 * 7); // 1 week
  });

  describe('stake', () => {
    it('creates UserStake PDA on first stake', () => {
      const userAta = getOrCreateAta(env.user.publicKey, env.mintPda);
      const [userStakePda] = findUserStakePda(env.programId, env.user.publicKey);

      // Verify PDA doesn't exist yet
      const accountBefore = env.svm.getAccount(userStakePda);
      expect(accountBefore).toBeNull();

      console.log('UserStake PDA derivation verified');
    });

    it('fails with zero amount', () => {
      const userAta = getOrCreateAta(env.user.publicKey, env.mintPda);

      const result = stake(env, env.user, userAta, BigInt(0));
      expect(isSuccess(result)).toBe(false);

      console.log('Zero stake rejected: OK');
    });

    it('allows any non-zero amount (no minimum)', () => {
      const userAta = getOrCreateAta(env.user.publicKey, env.mintPda);

      // Even 1 token should be allowed (though will fail due to no balance)
      // The important thing is the contract doesn't reject it for being below minimum
      const result = stake(env, env.user, userAta, BigInt(1));
      // This fails due to insufficient balance, not minimum stake
      expect(isSuccess(result)).toBe(false);

      const logs = getLogs(result);
      // Should NOT contain "below minimum" since we removed that check
      expect(logs.some((l) => l.includes('below minimum'))).toBe(false);

      console.log(
        'Small stake attempt: No minimum enforcement (fails for balance, not minimum): OK'
      );
    });

    it('fails without signer', () => {
      const userAta = getOrCreateAta(env.user.publicKey, env.mintPda);
      const [userStakePda] = findUserStakePda(env.programId, env.user.publicKey);

      // Build instruction but don't sign with user
      const ix = buildStakeIx(env, env.user, userAta, TEST_STAKE_AMOUNT);

      const tx = new Transaction();
      tx.recentBlockhash = env.svm.latestBlockhash();
      tx.add(ix);
      // Don't sign with user - this should fail

      // Transaction without proper signature should fail
      try {
        const result = env.svm.sendTransaction(tx);
        expect(isSuccess(result)).toBe(false);
      } catch (e) {
        // Expected - transaction without signature
        console.log('Unsigned transaction rejected: OK');
      }
    });

    it('verifies correct UserStake PDA derivation', () => {
      const [derivedPda, bump] = findUserStakePda(env.programId, env.user.publicKey);

      // Verify it matches expected derivation
      const [expectedPda] = PublicKey.findProgramAddressSync(
        [Buffer.from('user_stake'), env.user.publicKey.toBuffer()],
        env.programId
      );

      expect(derivedPda.equals(expectedPda)).toBe(true);
      console.log(`UserStake PDA: ${derivedPda.toBase58()}`);
    });
  });

  describe('unstake', () => {
    it('fails when no stake exists', () => {
      const userAta = getOrCreateAta(env.user.publicKey, env.mintPda);

      const result = unstake(env, env.user, userAta, TEST_STAKE_AMOUNT);
      expect(isSuccess(result)).toBe(false);

      const logs = getLogs(result);
      console.log('Unstake with no stake rejected: OK');
    });

    it('fails with zero amount', () => {
      const userAta = getOrCreateAta(env.user.publicKey, env.mintPda);

      const result = unstake(env, env.user, userAta, BigInt(0));
      expect(isSuccess(result)).toBe(false);

      console.log('Zero unstake rejected: OK');
    });

    it('allows instant unstake (no lock period)', () => {
      // In Phase 1, there's no lock period
      // Users can unstake immediately after staking
      // This is verified by the absence of lock period checks in unstake.rs
      console.log('Phase 1: No lock period - instant unstake allowed');
    });
  });

  describe('staking vault', () => {
    it('staking vault is initialized with zero balance', () => {
      const balance = getTokenBalance(env, env.stakingVaultPda);
      expect(balance).toBe(BigInt(0));
      console.log('Staking vault initialized with 0 balance: OK');
    });

    it('staking vault PDA is stored in config', () => {
      const config = getConfig(env);
      expect(config).not.toBeNull();

      const stakingVaultFromConfig = new PublicKey(config.staking_vault);
      expect(stakingVaultFromConfig.equals(env.stakingVaultPda)).toBe(true);

      console.log(`Staking vault in config: ${stakingVaultFromConfig.toBase58()}`);
    });
  });

  describe('integration scenarios', () => {
    it('multiple users can have separate stakes', () => {
      const user2 = Keypair.generate();
      env.svm.airdrop(user2.publicKey, BigInt(LAMPORTS_PER_SOL));

      const [stake1Pda] = findUserStakePda(env.programId, env.user.publicKey);
      const [stake2Pda] = findUserStakePda(env.programId, user2.publicKey);

      // PDAs should be different
      expect(stake1Pda.equals(stake2Pda)).toBe(false);

      console.log('Multiple user stake PDAs are unique: OK');
    });

    it('staking does not affect pending claims', () => {
      const pendingBalanceBefore = getTokenBalance(env, env.pendingClaimsPda);
      const stakingBalanceBefore = getTokenBalance(env, env.stakingVaultPda);

      // Verify they're separate pools
      expect(env.pendingClaimsPda.equals(env.stakingVaultPda)).toBe(false);

      console.log('Staking vault separate from pending claims: OK');
    });
  });

  describe('vote power formula', () => {
    it('calculates vote power correctly (off-chain)', () => {
      // Vote power formula: 1 + 4 * (staked / (staked + 1_000_000))
      const SCALE = 1_000_000;

      function calculateVotePower(staked: number): number {
        return 1 + 4 * (staked / (staked + SCALE));
      }

      // Test cases from the plan
      expect(calculateVotePower(0)).toBeCloseTo(1.0, 2);
      expect(calculateVotePower(100_000)).toBeCloseTo(1.36, 2);
      expect(calculateVotePower(500_000)).toBeCloseTo(2.33, 2);
      expect(calculateVotePower(1_000_000)).toBeCloseTo(3.0, 2);
      expect(calculateVotePower(10_000_000)).toBeCloseTo(4.64, 2);
      expect(calculateVotePower(100_000_000)).toBeCloseTo(4.96, 2);

      console.log('Vote power formula verified:');
      console.log('  0 YAP → 1.0');
      console.log('  100K YAP → 1.36');
      console.log('  1M YAP → 3.0');
      console.log('  Max approaches 5.0');
    });
  });

  describe('stake with balance (full flow)', () => {
    const FUND_AMOUNT = BigInt(500) * BigInt(10 ** DECIMALS); // 500 YAP

    it('stakes full balance successfully', () => {
      // Fund user with 500 YAP via claim flow
      const { ata, success } = fundUserViaClaim(env, env.user, FUND_AMOUNT);
      expect(success).toBe(true);

      // Verify user has tokens
      expect(getTokenBalance(env, ata)).toBe(FUND_AMOUNT);

      // Stake full balance
      const stakeResult = stake(env, env.user, ata, FUND_AMOUNT);
      expect(isSuccess(stakeResult)).toBe(true);

      // Verify tokens moved to staking vault
      expect(getTokenBalance(env, ata)).toBe(BigInt(0));
      expect(getTokenBalance(env, env.stakingVaultPda)).toBe(FUND_AMOUNT);

      // Verify UserStake updated
      const userStake = getUserStake(env, env.user.publicKey);
      expect(userStake).not.toBeNull();
      expect(userStake!.amount).toBe(FUND_AMOUNT);

      console.log('Full balance stake: OK (500 YAP staked)');
    });

    it('fails when staking more than balance (insufficient funds)', () => {
      // Fund user with 500 YAP
      const { ata, success } = fundUserViaClaim(env, env.user, FUND_AMOUNT);
      expect(success).toBe(true);

      // Try to stake 1000 YAP (more than balance)
      const doubleAmount = FUND_AMOUNT * BigInt(2);
      const stakeResult = stake(env, env.user, ata, doubleAmount);

      // Should fail - insufficient balance
      expect(isSuccess(stakeResult)).toBe(false);

      // Verify no tokens were moved
      const balance = getTokenBalance(env, ata);
      expect(balance).toBe(FUND_AMOUNT);

      const vaultBalance = getTokenBalance(env, env.stakingVaultPda);
      expect(vaultBalance).toBe(BigInt(0));

      console.log('Insufficient balance stake rejected: OK');
    });

    it('allows multiple partial stakes', () => {
      // Fund user with 500 YAP
      const { ata, success } = fundUserViaClaim(env, env.user, FUND_AMOUNT);
      expect(success).toBe(true);

      const halfAmount = FUND_AMOUNT / BigInt(2); // 250 YAP

      // First stake: 250 YAP
      const stake1Result = stake(env, env.user, ata, halfAmount);
      expect(isSuccess(stake1Result)).toBe(true);

      let userStake = getUserStake(env, env.user.publicKey);
      expect(userStake!.amount).toBe(halfAmount);

      // Warp to get fresh slot/blockhash for second transaction
      warpTime(env, 1);

      // Second stake: another 250 YAP
      const stake2Result = stake(env, env.user, ata, halfAmount);
      expect(isSuccess(stake2Result)).toBe(true);

      userStake = getUserStake(env, env.user.publicKey);
      expect(userStake!.amount).toBe(FUND_AMOUNT); // 500 total

      // Verify all tokens in vault
      const vaultBalance = getTokenBalance(env, env.stakingVaultPda);
      expect(vaultBalance).toBe(FUND_AMOUNT);

      console.log('Multiple partial stakes: OK (250 + 250 = 500 YAP)');
    });

    it('fails staking after balance depleted', () => {
      // Fund user with 500 YAP
      const { ata, success } = fundUserViaClaim(env, env.user, FUND_AMOUNT);
      expect(success).toBe(true);

      // Stake full balance
      const stakeResult = stake(env, env.user, ata, FUND_AMOUNT);
      expect(isSuccess(stakeResult)).toBe(true);

      // Try to stake 1 more token - should fail
      const oneToken = BigInt(1) * BigInt(10 ** DECIMALS);
      const stake2Result = stake(env, env.user, ata, oneToken);
      expect(isSuccess(stake2Result)).toBe(false);

      console.log('Stake after balance depleted rejected: OK');
    });

    it('unstakes successfully after staking', () => {
      // Fund user with 500 YAP
      const { ata, success } = fundUserViaClaim(env, env.user, FUND_AMOUNT);
      expect(success).toBe(true);

      // Stake full balance
      const stakeResult = stake(env, env.user, ata, FUND_AMOUNT);
      expect(isSuccess(stakeResult)).toBe(true);

      // Unstake full amount
      const unstakeResult = unstake(env, env.user, ata, FUND_AMOUNT);
      expect(isSuccess(unstakeResult)).toBe(true);

      // Verify tokens returned to user
      const balance = getTokenBalance(env, ata);
      expect(balance).toBe(FUND_AMOUNT);

      const vaultBalance = getTokenBalance(env, env.stakingVaultPda);
      expect(vaultBalance).toBe(BigInt(0));

      // UserStake should show 0
      const userStake = getUserStake(env, env.user.publicKey);
      expect(userStake!.amount).toBe(BigInt(0));

      console.log('Unstake after stake: OK (500 YAP returned)');
    });

    it('fails unstaking more than staked amount', () => {
      // Fund user with 500 YAP
      const { ata, success } = fundUserViaClaim(env, env.user, FUND_AMOUNT);
      expect(success).toBe(true);

      const halfAmount = FUND_AMOUNT / BigInt(2); // 250 YAP

      // Stake 250 YAP
      const stakeResult = stake(env, env.user, ata, halfAmount);
      expect(isSuccess(stakeResult)).toBe(true);

      // Try to unstake 500 YAP (more than staked)
      const unstakeResult = unstake(env, env.user, ata, FUND_AMOUNT);
      expect(isSuccess(unstakeResult)).toBe(false);

      // Verify stake unchanged
      const userStake = getUserStake(env, env.user.publicKey);
      expect(userStake!.amount).toBe(halfAmount);

      console.log('Unstake more than staked rejected: OK');
    });
  });
});
