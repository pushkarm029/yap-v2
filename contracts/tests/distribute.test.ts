/**
 * Distribute instruction tests using LiteSVM
 * Tests time-based rate limiting for token distribution
 */
import { describe, it, expect, beforeEach } from 'bun:test';
import {
  PublicKey,
  Keypair,
  Transaction,
  TransactionInstruction,
  LAMPORTS_PER_SOL,
} from '@solana/web3.js';
import { TOKEN_PROGRAM_ID } from '@solana/spl-token';
import * as borsh from 'borsh';

import {
  createTestEnv,
  initializeProgram,
  distribute,
  warpTime,
  getConfig,
  getTokenBalance,
  isSuccess,
  getLogs,
  buildDistributeIx,
  distributeSchema,
  TestEnv,
  INITIAL_SUPPLY,
  SECONDS_PER_YEAR,
  DECIMALS,
} from './helpers/litesvm-setup';

describe('distribute', () => {
  let env: TestEnv;

  beforeEach(() => {
    env = createTestEnv();
    // Initialize program first
    const initResult = initializeProgram(env);
    expect(isSuccess(initResult)).toBe(true);
  });

  it('distributes tokens within rate limit', () => {
    // Warp forward 1 day to have some available tokens
    warpTime(env, 86400);

    const vaultBefore = getTokenBalance(env, env.vaultPda);
    const pendingBefore = getTokenBalance(env, env.pendingClaimsPda);

    // Calculate available: (elapsed / SECONDS_PER_YEAR) * vault_balance
    // After 1 day: (86400 / 31536000) * 1B = ~2.74M tokens
    const available = (BigInt(86400) * vaultBefore) / BigInt(SECONDS_PER_YEAR);
    const distributeAmount = available / 2n; // Request half of available

    console.log(`Available after 1 day: ${Number(available) / 10 ** DECIMALS} tokens`);
    console.log(`Distributing: ${Number(distributeAmount) / 10 ** DECIMALS} tokens`);

    const merkleRoot = Buffer.alloc(32);
    crypto.getRandomValues(merkleRoot);

    const result = distribute(env, distributeAmount, merkleRoot);
    if (!isSuccess(result)) {
      console.log('Distribute failed:', getLogs(result));
    }
    expect(isSuccess(result)).toBe(true);

    // Verify transfer happened
    const vaultAfter = getTokenBalance(env, env.vaultPda);
    const pendingAfter = getTokenBalance(env, env.pendingClaimsPda);

    expect(vaultAfter).toBe(vaultBefore - distributeAmount);
    expect(pendingAfter).toBe(pendingBefore + distributeAmount);

    // Verify merkle root updated
    const config = getConfig(env);
    expect(Buffer.from(config.merkle_root)).toEqual(merkleRoot);

    console.log('Distribution within rate limit: OK');
  });

  it('fails when amount exceeds rate limit', () => {
    // Warp forward just 1 second
    warpTime(env, 1);

    // Calculate available after 1 second - should be very small
    const vaultBalance = getTokenBalance(env, env.vaultPda);
    const available = (BigInt(1) * vaultBalance) / BigInt(SECONDS_PER_YEAR);
    console.log(`Available after 1 second: ${available} lamports`);

    // Request way more than available
    const hugeAmount = BigInt(1_000_000) * BigInt(10 ** DECIMALS); // 1M tokens

    const merkleRoot = Buffer.alloc(32);
    crypto.getRandomValues(merkleRoot);

    const result = distribute(env, hugeAmount, merkleRoot);
    expect(isSuccess(result)).toBe(false);

    console.log('Exceeded rate limit rejected: OK');
  });

  it('allows zero amount (merkle root update only)', () => {
    const vaultBefore = getTokenBalance(env, env.vaultPda);
    const pendingBefore = getTokenBalance(env, env.pendingClaimsPda);

    const merkleRoot = Buffer.alloc(32);
    crypto.getRandomValues(merkleRoot);

    const result = distribute(env, 0n, merkleRoot);
    expect(isSuccess(result)).toBe(true);

    // Verify no transfer
    const vaultAfter = getTokenBalance(env, env.vaultPda);
    const pendingAfter = getTokenBalance(env, env.pendingClaimsPda);

    expect(vaultAfter).toBe(vaultBefore);
    expect(pendingAfter).toBe(pendingBefore);

    // Verify merkle root updated
    const config = getConfig(env);
    expect(Buffer.from(config.merkle_root)).toEqual(merkleRoot);

    console.log('Zero amount distribution (merkle update only): OK');
  });

  it('fails with unauthorized signer', () => {
    const fakeUpdater = Keypair.generate();
    env.svm.airdrop(fakeUpdater.publicKey, BigInt(LAMPORTS_PER_SOL));

    const merkleRoot = Buffer.alloc(32);
    crypto.getRandomValues(merkleRoot);

    const data = borsh.serialize(distributeSchema, {
      instruction: 2,
      amount: 0n,
      merkle_root: Array.from(merkleRoot),
    });

    const ix = new TransactionInstruction({
      programId: env.programId,
      keys: [
        { pubkey: fakeUpdater.publicKey, isSigner: true, isWritable: false },
        { pubkey: env.configPda, isSigner: false, isWritable: true },
        { pubkey: env.vaultPda, isSigner: false, isWritable: true },
        { pubkey: env.pendingClaimsPda, isSigner: false, isWritable: true },
        { pubkey: env.mintPda, isSigner: false, isWritable: false },
        { pubkey: TOKEN_PROGRAM_ID, isSigner: false, isWritable: false },
      ],
      data: Buffer.from(data),
    });

    const tx = new Transaction();
    tx.recentBlockhash = env.svm.latestBlockhash();
    tx.add(ix);
    tx.sign(fakeUpdater);

    const result = env.svm.sendTransaction(tx);
    expect(isSuccess(result)).toBe(false);

    console.log('Unauthorized signer rejected: OK');
  });

  it('rapid distributions have diminishing available amounts', () => {
    // Warp forward 1 day
    warpTime(env, 86400);

    // First distribution uses half the available
    const merkleRoot1 = Buffer.alloc(32);
    crypto.getRandomValues(merkleRoot1);

    const vaultBalance = getTokenBalance(env, env.vaultPda);
    const available = (BigInt(86400) * vaultBalance) / BigInt(SECONDS_PER_YEAR);
    const firstAmount = available / 2n;

    const result1 = distribute(env, firstAmount, merkleRoot1);
    expect(isSuccess(result1)).toBe(true);
    console.log(`First distribution: ${Number(firstAmount) / 10 ** DECIMALS} tokens`);

    // Immediately try to distribute again without time passing
    // Should fail because last_distribution_ts was just updated
    const merkleRoot2 = Buffer.alloc(32);
    crypto.getRandomValues(merkleRoot2);

    // Even 1 token should fail
    const result2 = distribute(env, BigInt(1), merkleRoot2);
    expect(isSuccess(result2)).toBe(false);

    console.log('Rapid distribution blocked: OK');
  });

  it('time warp allows more distribution', () => {
    // First distribution at day 1
    warpTime(env, 86400);

    const merkleRoot1 = Buffer.alloc(32);
    crypto.getRandomValues(merkleRoot1);

    const vaultBalance1 = getTokenBalance(env, env.vaultPda);
    const available1 = (BigInt(86400) * vaultBalance1) / BigInt(SECONDS_PER_YEAR);
    const amount1 = available1 / 2n;

    const result1 = distribute(env, amount1, merkleRoot1);
    expect(isSuccess(result1)).toBe(true);
    console.log(`Day 1: Distributed ${Number(amount1) / 10 ** DECIMALS} tokens`);

    // Warp to day 2
    warpTime(env, 86400);

    // Now we should have more available
    const merkleRoot2 = Buffer.alloc(32);
    crypto.getRandomValues(merkleRoot2);

    const vaultBalance2 = getTokenBalance(env, env.vaultPda);
    const available2 = (BigInt(86400) * vaultBalance2) / BigInt(SECONDS_PER_YEAR);
    const amount2 = available2 / 2n;

    const result2 = distribute(env, amount2, merkleRoot2);
    expect(isSuccess(result2)).toBe(true);
    console.log(`Day 2: Distributed ${Number(amount2) / 10 ** DECIMALS} tokens`);

    console.log('Time warp enables more distribution: OK');
  });

  it('fails with wrong config PDA', () => {
    const wrongConfig = Keypair.generate().publicKey;
    const merkleRoot = Buffer.alloc(32);
    crypto.getRandomValues(merkleRoot);

    const data = borsh.serialize(distributeSchema, {
      instruction: 2,
      amount: 0n,
      merkle_root: Array.from(merkleRoot),
    });

    const ix = new TransactionInstruction({
      programId: env.programId,
      keys: [
        { pubkey: env.merkleUpdater.publicKey, isSigner: true, isWritable: false },
        { pubkey: wrongConfig, isSigner: false, isWritable: true },
        { pubkey: env.vaultPda, isSigner: false, isWritable: true },
        { pubkey: env.pendingClaimsPda, isSigner: false, isWritable: true },
        { pubkey: env.mintPda, isSigner: false, isWritable: false },
        { pubkey: TOKEN_PROGRAM_ID, isSigner: false, isWritable: false },
      ],
      data: Buffer.from(data),
    });

    const tx = new Transaction();
    tx.recentBlockhash = env.svm.latestBlockhash();
    tx.add(ix);
    tx.sign(env.merkleUpdater);

    const result = env.svm.sendTransaction(tx);
    expect(isSuccess(result)).toBe(false);

    console.log('Wrong config PDA rejected: OK');
  });

  it('updates last_distribution_ts after each distribution', () => {
    warpTime(env, 86400);

    const configBefore = getConfig(env);
    const tsBefore = BigInt(configBefore.last_distribution_ts);

    const merkleRoot = Buffer.alloc(32);
    crypto.getRandomValues(merkleRoot);

    const result = distribute(env, 0n, merkleRoot);
    expect(isSuccess(result)).toBe(true);

    const configAfter = getConfig(env);
    const tsAfter = BigInt(configAfter.last_distribution_ts);

    expect(tsAfter).toBeGreaterThan(tsBefore);

    console.log(`Timestamp updated: ${tsBefore} -> ${tsAfter}`);
  });
});
