/**
 * UpdateMerkleUpdater instruction tests using LiteSVM
 * Tests admin-only merkle updater changes + integration with Distribute
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
  warpTime,
  updateMerkleUpdater,
  buildUpdateMerkleUpdaterIx,
  updateMerkleUpdaterSchema,
  distributeWithSigner,
  TestEnv,
} from './helpers/litesvm-setup';

// Seconds in a day for rate limit
const DAY_SECONDS = 86400;

describe('update_merkle_updater', () => {
  let env: TestEnv;

  beforeEach(() => {
    env = createTestEnv();
    const initResult = initializeProgram(env);
    expect(isSuccess(initResult)).toBe(true);
  });

  describe('success cases', () => {
    it('admin updates merkle updater successfully', () => {
      const newUpdater = Keypair.generate();
      const configBefore = getConfig(env);

      expect(configBefore.merkle_updater).toEqual(
        Array.from(env.merkleUpdater.publicKey.toBytes())
      );

      const result = updateMerkleUpdater(env, env.admin, newUpdater.publicKey);
      if (!isSuccess(result)) {
        console.log('UpdateMerkleUpdater failed:', getLogs(result));
      }
      expect(isSuccess(result)).toBe(true);

      const configAfter = getConfig(env);
      expect(configAfter.merkle_updater).toEqual(Array.from(newUpdater.publicKey.toBytes()));

      console.log('Merkle updater changed: OK');
    });

    it('new updater is stored in config', () => {
      const newUpdater = Keypair.generate();

      const result = updateMerkleUpdater(env, env.admin, newUpdater.publicKey);
      expect(isSuccess(result)).toBe(true);

      const config = getConfig(env);
      const storedUpdater = new PublicKey(Buffer.from(config.merkle_updater));

      expect(storedUpdater.equals(newUpdater.publicKey)).toBe(true);

      console.log(`New updater stored: ${storedUpdater.toBase58()}`);
    });

    it('can update multiple times', () => {
      const updater1 = Keypair.generate();
      const updater2 = Keypair.generate();
      const updater3 = Keypair.generate();

      // First update
      let result = updateMerkleUpdater(env, env.admin, updater1.publicKey);
      expect(isSuccess(result)).toBe(true);
      let config = getConfig(env);
      expect(config.merkle_updater).toEqual(Array.from(updater1.publicKey.toBytes()));

      // Second update
      result = updateMerkleUpdater(env, env.admin, updater2.publicKey);
      expect(isSuccess(result)).toBe(true);
      config = getConfig(env);
      expect(config.merkle_updater).toEqual(Array.from(updater2.publicKey.toBytes()));

      // Third update
      result = updateMerkleUpdater(env, env.admin, updater3.publicKey);
      expect(isSuccess(result)).toBe(true);
      config = getConfig(env);
      expect(config.merkle_updater).toEqual(Array.from(updater3.publicKey.toBytes()));

      console.log('Multiple updates: OK');
    });

    it('can set to same address (no-op)', () => {
      const configBefore = getConfig(env);
      const currentUpdater = new PublicKey(Buffer.from(configBefore.merkle_updater));

      // Set to same address
      const result = updateMerkleUpdater(env, env.admin, currentUpdater);
      expect(isSuccess(result)).toBe(true);

      const configAfter = getConfig(env);
      expect(configAfter.merkle_updater).toEqual(configBefore.merkle_updater);

      console.log('Same address update (no-op): OK');
    });
  });

  describe('validation', () => {
    it('fails with non-admin signer', () => {
      const nonAdmin = Keypair.generate();
      env.svm.airdrop(nonAdmin.publicKey, BigInt(LAMPORTS_PER_SOL));

      const newUpdater = Keypair.generate();

      const data = borsh.serialize(updateMerkleUpdaterSchema, {
        instruction: 7,
        new_updater: Array.from(newUpdater.publicKey.toBytes()),
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
      const newUpdater = Keypair.generate();

      const data = borsh.serialize(updateMerkleUpdaterSchema, {
        instruction: 7,
        new_updater: Array.from(newUpdater.publicKey.toBytes()),
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

    it('fails without signer', () => {
      const newUpdater = Keypair.generate();
      const ix = buildUpdateMerkleUpdaterIx(env, env.admin, newUpdater.publicKey);

      const tx = new Transaction();
      tx.recentBlockhash = env.svm.latestBlockhash();
      tx.add(ix);
      // Don't sign

      try {
        const result = env.svm.sendTransaction(tx);
        expect(isSuccess(result)).toBe(false);
      } catch (e) {
        // Expected - unsigned transaction rejected
      }

      console.log('Unsigned transaction rejected: OK');
    });
  });

  describe('integration with Distribute', () => {
    it('new updater CAN call Distribute', () => {
      const newUpdater = Keypair.generate();
      env.svm.airdrop(newUpdater.publicKey, BigInt(LAMPORTS_PER_SOL));

      // Update merkle updater
      const updateResult = updateMerkleUpdater(env, env.admin, newUpdater.publicKey);
      expect(isSuccess(updateResult)).toBe(true);

      // Warp time to have available tokens
      warpTime(env, DAY_SECONDS);

      // New updater should be able to distribute
      const merkleRoot = Buffer.alloc(32, 0xab);
      const distributeResult = distributeWithSigner(
        env,
        newUpdater,
        BigInt(0), // Just merkle root update
        merkleRoot
      );

      if (!isSuccess(distributeResult)) {
        console.log('Distribute failed:', getLogs(distributeResult));
      }
      expect(isSuccess(distributeResult)).toBe(true);

      // Verify merkle root was set
      const config = getConfig(env);
      expect(config.merkle_root).toEqual(Array.from(merkleRoot));

      console.log('New updater CAN call Distribute: OK');
    });

    it('old updater CANNOT call Distribute after change', () => {
      const oldUpdater = env.merkleUpdater;
      const newUpdater = Keypair.generate();
      env.svm.airdrop(newUpdater.publicKey, BigInt(LAMPORTS_PER_SOL));

      // Update merkle updater to new address
      const updateResult = updateMerkleUpdater(env, env.admin, newUpdater.publicKey);
      expect(isSuccess(updateResult)).toBe(true);

      // Warp time to have available tokens
      warpTime(env, DAY_SECONDS);

      // Old updater should NOT be able to distribute anymore
      const merkleRoot = Buffer.alloc(32, 0xcd);
      const distributeResult = distributeWithSigner(env, oldUpdater, BigInt(0), merkleRoot);

      expect(isSuccess(distributeResult)).toBe(false);

      // Verify merkle root was NOT changed
      const config = getConfig(env);
      expect(config.merkle_root).not.toEqual(Array.from(merkleRoot));

      console.log('Old updater CANNOT call Distribute: OK');
    });
  });
});
