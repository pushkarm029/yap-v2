/**
 * TriggerInflation instruction tests using LiteSVM
 * Tests continuous inflation mechanics (rate-limited like distribution)
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
  warpTime,
  getConfig,
  getTokenBalance,
  isSuccess,
  getLogs,
  buildTriggerInflationIx,
  triggerInflationSchema,
  TestEnv,
  INITIAL_SUPPLY,
  SECONDS_PER_YEAR,
  DECIMALS,
} from './helpers/litesvm-setup';

describe('trigger_inflation', () => {
  let env: TestEnv;

  beforeEach(() => {
    env = createTestEnv();
    const initResult = initializeProgram(env);
    expect(isSuccess(initResult)).toBe(true);
  });

  function triggerInflation(admin: Keypair = env.admin) {
    const ix = buildTriggerInflationIx(env);
    const tx = new Transaction();
    tx.recentBlockhash = env.svm.latestBlockhash();
    tx.add(ix);
    tx.sign(admin);
    return env.svm.sendTransaction(tx);
  }

  it('triggers inflation after time passes', () => {
    const configBefore = getConfig(env);
    const supplyBefore = BigInt(configBefore.current_supply);
    const vaultBefore = getTokenBalance(env, env.vaultPda);

    // Warp 1 year
    warpTime(env, SECONDS_PER_YEAR);

    const result = triggerInflation();
    if (!isSuccess(result)) {
      console.log('TriggerInflation failed:', getLogs(result));
    }
    expect(isSuccess(result)).toBe(true);

    const configAfter = getConfig(env);
    const supplyAfter = BigInt(configAfter.current_supply);
    const vaultAfter = getTokenBalance(env, env.vaultPda);

    // Supply should increase by ~10% (full year at 10% rate)
    const expectedInflation = (supplyBefore * BigInt(1000)) / BigInt(10000);
    expect(supplyAfter).toBe(supplyBefore + expectedInflation);

    // Vault should have more tokens
    expect(vaultAfter).toBe(vaultBefore + expectedInflation);

    console.log(`TriggerInflation: OK`);
    console.log(
      `  Supply: ${Number(supplyBefore) / 10 ** DECIMALS} -> ${Number(supplyAfter) / 10 ** DECIMALS}`
    );
    console.log(`  Inflation: +${Number(expectedInflation) / 10 ** DECIMALS} tokens (10%)`);
  });

  it('fails immediately after initialization (no time elapsed)', () => {
    // Try immediately after initialization
    const result = triggerInflation();
    expect(isSuccess(result)).toBe(false);

    console.log('Inflation with no elapsed time rejected: OK');
  });

  it('fails on second call without time passing', () => {
    // Warp some time
    warpTime(env, SECONDS_PER_YEAR);

    // First call succeeds
    const result1 = triggerInflation();
    expect(isSuccess(result1)).toBe(true);

    // Second call fails (no time elapsed since last call)
    const result2 = triggerInflation();
    expect(isSuccess(result2)).toBe(false);

    console.log('Double inflation without time rejected: OK');
  });

  it('allows consecutive inflations with time between', () => {
    // First inflation after 6 months
    warpTime(env, SECONDS_PER_YEAR / 2);

    const result1 = triggerInflation();
    expect(isSuccess(result1)).toBe(true);

    const config1 = getConfig(env);
    const supply1 = BigInt(config1.current_supply);

    // Should be ~5% inflation (half year at 10% rate)
    const expected1 = INITIAL_SUPPLY + (INITIAL_SUPPLY * BigInt(500)) / BigInt(10000);
    expect(supply1).toBe(expected1);

    // Second inflation after another 6 months
    warpTime(env, SECONDS_PER_YEAR / 2);

    const result2 = triggerInflation();
    if (!isSuccess(result2)) {
      console.log('Second inflation failed:', getLogs(result2));
    }
    expect(isSuccess(result2)).toBe(true);

    const config2 = getConfig(env);
    const supply2 = BigInt(config2.current_supply);

    // Should be ~5% more (on the new supply)
    const expected2 = supply1 + (supply1 * BigInt(500)) / BigInt(10000);
    expect(supply2).toBe(expected2);

    console.log('Consecutive inflation: OK');
    console.log(`  After 6mo: ${Number(supply1) / 10 ** DECIMALS}`);
    console.log(`  After 1yr: ${Number(supply2) / 10 ** DECIMALS}`);
  });

  it('inflation scales with elapsed time', () => {
    // Test 1 day of inflation
    warpTime(env, 86400); // 1 day

    const configBefore = getConfig(env);
    const supplyBefore = BigInt(configBefore.current_supply);

    const result = triggerInflation();
    expect(isSuccess(result)).toBe(true);

    const configAfter = getConfig(env);
    const supplyAfter = BigInt(configAfter.current_supply);

    // 1 day = 86400 seconds out of 31536000 per year
    // Expected: supply * 1000 * 86400 / (10000 * 31536000)
    const expectedInflation =
      (supplyBefore * BigInt(1000) * BigInt(86400)) / (BigInt(10000) * BigInt(SECONDS_PER_YEAR));
    expect(supplyAfter).toBe(supplyBefore + expectedInflation);

    console.log(`1-day inflation: +${Number(expectedInflation) / 10 ** DECIMALS} tokens`);
  });

  it('fails with non-admin signer', () => {
    const nonAdmin = Keypair.generate();
    env.svm.airdrop(nonAdmin.publicKey, BigInt(LAMPORTS_PER_SOL));

    warpTime(env, SECONDS_PER_YEAR);

    const data = borsh.serialize(triggerInflationSchema, { instruction: 1 });

    const ix = new TransactionInstruction({
      programId: env.programId,
      keys: [
        { pubkey: nonAdmin.publicKey, isSigner: true, isWritable: false },
        { pubkey: env.configPda, isSigner: false, isWritable: true },
        { pubkey: env.mintPda, isSigner: false, isWritable: true },
        { pubkey: env.vaultPda, isSigner: false, isWritable: true },
        { pubkey: TOKEN_PROGRAM_ID, isSigner: false, isWritable: false },
      ],
      data: Buffer.from(data),
    });

    const tx = new Transaction();
    tx.recentBlockhash = env.svm.latestBlockhash();
    tx.add(ix);
    tx.sign(nonAdmin);

    const result = env.svm.sendTransaction(tx);
    expect(isSuccess(result)).toBe(false);

    console.log('Non-admin inflation rejected: OK');
  });

  it('fails with wrong config PDA', () => {
    const wrongConfig = Keypair.generate().publicKey;

    warpTime(env, SECONDS_PER_YEAR);

    const data = borsh.serialize(triggerInflationSchema, { instruction: 1 });

    const ix = new TransactionInstruction({
      programId: env.programId,
      keys: [
        { pubkey: env.admin.publicKey, isSigner: true, isWritable: false },
        { pubkey: wrongConfig, isSigner: false, isWritable: true },
        { pubkey: env.mintPda, isSigner: false, isWritable: true },
        { pubkey: env.vaultPda, isSigner: false, isWritable: true },
        { pubkey: TOKEN_PROGRAM_ID, isSigner: false, isWritable: false },
      ],
      data: Buffer.from(data),
    });

    const tx = new Transaction();
    tx.recentBlockhash = env.svm.latestBlockhash();
    tx.add(ix);
    tx.sign(env.admin);

    const result = env.svm.sendTransaction(tx);
    expect(isSuccess(result)).toBe(false);

    console.log('Wrong config PDA rejected: OK');
  });

  it('fails with wrong token program', () => {
    const fakeTokenProgram = Keypair.generate().publicKey;

    warpTime(env, SECONDS_PER_YEAR);

    const data = borsh.serialize(triggerInflationSchema, { instruction: 1 });

    const ix = new TransactionInstruction({
      programId: env.programId,
      keys: [
        { pubkey: env.admin.publicKey, isSigner: true, isWritable: false },
        { pubkey: env.configPda, isSigner: false, isWritable: true },
        { pubkey: env.mintPda, isSigner: false, isWritable: true },
        { pubkey: env.vaultPda, isSigner: false, isWritable: true },
        { pubkey: fakeTokenProgram, isSigner: false, isWritable: false },
      ],
      data: Buffer.from(data),
    });

    const tx = new Transaction();
    tx.recentBlockhash = env.svm.latestBlockhash();
    tx.add(ix);
    tx.sign(env.admin);

    const result = env.svm.sendTransaction(tx);
    expect(isSuccess(result)).toBe(false);

    console.log('Wrong token program rejected: OK');
  });

  it('updates last_inflation_ts correctly', () => {
    warpTime(env, SECONDS_PER_YEAR);

    const configBefore = getConfig(env);
    const tsBefore = BigInt(configBefore.last_inflation_ts);

    const result = triggerInflation();
    expect(isSuccess(result)).toBe(true);

    const configAfter = getConfig(env);
    const tsAfter = BigInt(configAfter.last_inflation_ts);

    // last_inflation_ts should advance by ~1 year
    expect(tsAfter).toBeGreaterThanOrEqual(tsBefore + BigInt(SECONDS_PER_YEAR));

    console.log(`last_inflation_ts: ${tsBefore} -> ${tsAfter}`);
  });

  it('respects custom inflation rate', () => {
    // Create new env with custom rate
    const customEnv = createTestEnv();
    const customRate = 500; // 5%
    initializeProgram(customEnv, customRate);

    const configBefore = getConfig(customEnv);
    const supplyBefore = BigInt(configBefore.current_supply);

    // Warp 1 year
    warpTime(customEnv, SECONDS_PER_YEAR);

    const ix = buildTriggerInflationIx(customEnv);
    const tx = new Transaction();
    tx.recentBlockhash = customEnv.svm.latestBlockhash();
    tx.add(ix);
    tx.sign(customEnv.admin);

    const result = customEnv.svm.sendTransaction(tx);
    expect(isSuccess(result)).toBe(true);

    const configAfter = getConfig(customEnv);
    const supplyAfter = BigInt(configAfter.current_supply);

    // 5% inflation
    const expectedInflation = (supplyBefore * BigInt(customRate)) / BigInt(10000);
    expect(supplyAfter).toBe(supplyBefore + expectedInflation);

    console.log(`Custom inflation rate ${customRate / 100}%: OK`);
    console.log(`  Inflation: +${Number(expectedInflation) / 10 ** DECIMALS} tokens`);
  });

  it('quarterly inflation - 4 times over a year', () => {
    const QUARTER = SECONDS_PER_YEAR / 4;

    console.log('Quarterly inflation test (10% annual):');
    console.log(`  Starting supply: ${Number(INITIAL_SUPPLY) / 10 ** DECIMALS}`);

    for (let q = 1; q <= 4; q++) {
      // Warp forward 3 months
      warpTime(env, QUARTER);

      const configBefore = getConfig(env);
      const supplyBefore = BigInt(configBefore.current_supply);

      const result = triggerInflation();
      if (!isSuccess(result)) {
        console.log(`Q${q} inflation failed:`, getLogs(result));
      }
      expect(isSuccess(result)).toBe(true);

      const configAfter = getConfig(env);
      const supplyAfter = BigInt(configAfter.current_supply);

      // Verify ~2.5% inflation per quarter
      const expectedInflation =
        (supplyBefore * BigInt(1000) * BigInt(QUARTER)) /
        (BigInt(10000) * BigInt(SECONDS_PER_YEAR));
      expect(supplyAfter).toBe(supplyBefore + expectedInflation);

      const inflationAmount = supplyAfter - supplyBefore;
      console.log(
        `  Q${q}: +${Number(inflationAmount) / 10 ** DECIMALS} tokens -> ${Number(supplyAfter) / 10 ** DECIMALS}`
      );
    }

    // Get final supply
    const finalConfig = getConfig(env);
    const finalSupply = BigInt(finalConfig.current_supply);

    // After 4 quarters, total should be ~10% more than initial (compound)
    const totalInflation = finalSupply - INITIAL_SUPPLY;
    const percentIncrease = (Number(totalInflation) / Number(INITIAL_SUPPLY)) * 100;
    console.log(
      `  Total inflation: +${Number(totalInflation) / 10 ** DECIMALS} tokens (${percentIncrease.toFixed(2)}%)`
    );

    // Should be approximately 10% (with slight compounding from quarterly)
    expect(percentIncrease).toBeGreaterThan(9.9);
    expect(percentIncrease).toBeLessThan(10.5);
  });
});
