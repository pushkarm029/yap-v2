/**
 * UpdateInflationRate instruction tests using LiteSVM
 * Tests admin-only inflation rate updates
 */
import { describe, it, expect, beforeEach } from 'bun:test';
import {
  PublicKey,
  Keypair,
  Transaction,
  TransactionInstruction,
  LAMPORTS_PER_SOL,
} from '@solana/web3.js';
import * as borsh from 'borsh';

import {
  createTestEnv,
  initializeProgram,
  getConfig,
  isSuccess,
  getLogs,
  TestEnv,
} from './helpers/litesvm-setup';

const updateInflationRateSchema = {
  struct: {
    instruction: 'u8',
    new_rate_bps: 'u16',
  },
};

function buildUpdateInflationRateIx(env: TestEnv, newRateBps: number): TransactionInstruction {
  const data = borsh.serialize(updateInflationRateSchema, {
    instruction: 8, // UpdateInflationRate variant index (after Stake=5, Unstake=6, UpdateMerkleUpdater=7)
    new_rate_bps: newRateBps,
  });

  return new TransactionInstruction({
    programId: env.programId,
    keys: [
      { pubkey: env.admin.publicKey, isSigner: true, isWritable: false },
      { pubkey: env.configPda, isSigner: false, isWritable: true },
    ],
    data: Buffer.from(data),
  });
}

describe('update_inflation_rate', () => {
  let env: TestEnv;

  beforeEach(() => {
    env = createTestEnv();
    const initResult = initializeProgram(env);
    expect(isSuccess(initResult)).toBe(true);
  });

  it('updates inflation rate successfully', () => {
    const configBefore = getConfig(env);
    const rateBefore = configBefore.inflation_rate_bps;
    expect(rateBefore).toBe(1000); // Default 10%

    const newRate = 500; // 5%
    const ix = buildUpdateInflationRateIx(env, newRate);
    const tx = new Transaction();
    tx.recentBlockhash = env.svm.latestBlockhash();
    tx.add(ix);
    tx.sign(env.admin);

    const result = env.svm.sendTransaction(tx);
    if (!isSuccess(result)) {
      console.log('UpdateInflationRate failed:', getLogs(result));
    }
    expect(isSuccess(result)).toBe(true);

    const configAfter = getConfig(env);
    expect(configAfter.inflation_rate_bps).toBe(newRate);

    console.log(`Inflation rate: ${rateBefore} -> ${configAfter.inflation_rate_bps} bps`);
  });

  it('updates to 0% (disable inflation)', () => {
    const ix = buildUpdateInflationRateIx(env, 0);
    const tx = new Transaction();
    tx.recentBlockhash = env.svm.latestBlockhash();
    tx.add(ix);
    tx.sign(env.admin);

    const result = env.svm.sendTransaction(tx);
    expect(isSuccess(result)).toBe(true);

    const configAfter = getConfig(env);
    expect(configAfter.inflation_rate_bps).toBe(0);

    console.log(`Set 0% inflation: ${configAfter.inflation_rate_bps} bps`);
  });

  it('updates to 100% (max inflation)', () => {
    const ix = buildUpdateInflationRateIx(env, 10000);
    const tx = new Transaction();
    tx.recentBlockhash = env.svm.latestBlockhash();
    tx.add(ix);
    tx.sign(env.admin);

    const result = env.svm.sendTransaction(tx);
    expect(isSuccess(result)).toBe(true);

    const configAfter = getConfig(env);
    expect(configAfter.inflation_rate_bps).toBe(10000);

    console.log(`Set max inflation: ${configAfter.inflation_rate_bps} bps`);
  });

  it('fails with rate > 100%', () => {
    const ix = buildUpdateInflationRateIx(env, 10001);
    const tx = new Transaction();
    tx.recentBlockhash = env.svm.latestBlockhash();
    tx.add(ix);
    tx.sign(env.admin);

    const result = env.svm.sendTransaction(tx);
    expect(isSuccess(result)).toBe(false);

    console.log('Rate > 100% rejected: OK');
  });

  it('fails with non-admin signer', () => {
    const nonAdmin = Keypair.generate();
    env.svm.airdrop(nonAdmin.publicKey, BigInt(LAMPORTS_PER_SOL));

    const data = borsh.serialize(updateInflationRateSchema, {
      instruction: 6,
      new_rate_bps: 500,
    });

    const ix = new TransactionInstruction({
      programId: env.programId,
      keys: [
        { pubkey: nonAdmin.publicKey, isSigner: true, isWritable: false },
        { pubkey: env.configPda, isSigner: false, isWritable: true },
      ],
      data: Buffer.from(data),
    });

    const tx = new Transaction();
    tx.recentBlockhash = env.svm.latestBlockhash();
    tx.add(ix);
    tx.sign(nonAdmin);

    const result = env.svm.sendTransaction(tx);
    expect(isSuccess(result)).toBe(false);

    console.log('Non-admin signer rejected: OK');
  });

  it('fails with wrong config PDA', () => {
    const wrongConfig = Keypair.generate().publicKey;

    const data = borsh.serialize(updateInflationRateSchema, {
      instruction: 6,
      new_rate_bps: 500,
    });

    const ix = new TransactionInstruction({
      programId: env.programId,
      keys: [
        { pubkey: env.admin.publicKey, isSigner: true, isWritable: false },
        { pubkey: wrongConfig, isSigner: false, isWritable: true },
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
});
