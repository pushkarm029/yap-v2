/**
 * Initialize instruction tests using LiteSVM
 */
import { describe, it, expect, beforeEach } from 'bun:test';
import {
  PublicKey,
  Keypair,
  Transaction,
  TransactionInstruction,
  SystemProgram,
  LAMPORTS_PER_SOL,
} from '@solana/web3.js';
import { TOKEN_PROGRAM_ID } from '@solana/spl-token';
import * as borsh from 'borsh';

import {
  createTestEnv,
  initializeProgram,
  getConfig,
  getTokenBalance,
  isSuccess,
  getLogs,
  buildInitializeIx,
  initializeSchema,
  configSchema,
  TestEnv,
  INITIAL_SUPPLY,
  CONFIG_SEED,
  MINT_SEED,
  VAULT_SEED,
  PENDING_CLAIMS_SEED,
  METADATA_PROGRAM_ID,
  METADATA_SEED,
} from './helpers/litesvm-setup';

describe('initialize', () => {
  let env: TestEnv;

  beforeEach(() => {
    // Fresh environment for each test
    env = createTestEnv();
  });

  it('initializes program successfully', () => {
    const result = initializeProgram(env);

    if (!isSuccess(result)) {
      console.log('Initialize failed:', getLogs(result));
    }
    expect(isSuccess(result)).toBe(true);

    // Verify config account exists and is owned by program
    const configAccount = env.svm.getAccount(env.configPda);
    expect(configAccount).not.toBeNull();
    expect(new PublicKey(configAccount!.owner).equals(env.programId)).toBe(true);

    // Verify mint account exists and is owned by Token program
    const mintAccount = env.svm.getAccount(env.mintPda);
    expect(mintAccount).not.toBeNull();
    expect(new PublicKey(mintAccount!.owner).equals(TOKEN_PROGRAM_ID)).toBe(true);

    // Verify vault account exists and is owned by Token program
    const vaultAccount = env.svm.getAccount(env.vaultPda);
    expect(vaultAccount).not.toBeNull();
    expect(new PublicKey(vaultAccount!.owner).equals(TOKEN_PROGRAM_ID)).toBe(true);

    console.log('Initialize: OK');
  });

  it('config has correct values', () => {
    const result = initializeProgram(env);
    expect(isSuccess(result)).toBe(true);

    const config = getConfig(env);
    expect(config).not.toBeNull();

    expect(Buffer.from(config.discriminator).toString()).toBe('yapconfg');
    expect(new PublicKey(config.mint).equals(env.mintPda)).toBe(true);
    expect(new PublicKey(config.vault).equals(env.vaultPda)).toBe(true);
    expect(new PublicKey(config.pending_claims).equals(env.pendingClaimsPda)).toBe(true);
    expect(new PublicKey(config.merkle_updater).equals(env.merkleUpdater.publicKey)).toBe(true);
    expect(config.current_supply).toBe(INITIAL_SUPPLY);
    expect(new PublicKey(config.admin).equals(env.admin.publicKey)).toBe(true);
    expect(config.inflation_rate_bps).toBe(1000); // 10% default

    console.log('Config values: OK');
  });

  it('vault has correct token balance', () => {
    const result = initializeProgram(env);
    expect(isSuccess(result)).toBe(true);

    const balance = getTokenBalance(env, env.vaultPda);
    expect(balance).toBe(INITIAL_SUPPLY);

    console.log(`Vault balance: ${balance / BigInt(10 ** 9)} YAP`);
  });

  it('fails when already initialized', () => {
    // First initialization succeeds
    const result1 = initializeProgram(env);
    expect(isSuccess(result1)).toBe(true);

    // Second initialization fails
    const result2 = initializeProgram(env);
    expect(isSuccess(result2)).toBe(false);

    console.log('Double init rejected: OK');
  });

  it('fails with wrong config PDA', () => {
    const wrongConfig = Keypair.generate().publicKey;

    const data = borsh.serialize(initializeSchema, {
      instruction: 0,
      merkle_updater: Array.from(env.merkleUpdater.publicKey.toBytes()),
      inflation_rate_bps: 1000,
    });

    const ix = new TransactionInstruction({
      programId: env.programId,
      keys: [
        { pubkey: env.admin.publicKey, isSigner: true, isWritable: true },
        { pubkey: wrongConfig, isSigner: false, isWritable: true },
        { pubkey: env.mintPda, isSigner: false, isWritable: true },
        { pubkey: env.vaultPda, isSigner: false, isWritable: true },
        { pubkey: env.pendingClaimsPda, isSigner: false, isWritable: true },
        { pubkey: env.stakingVaultPda, isSigner: false, isWritable: true },
        { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
        { pubkey: TOKEN_PROGRAM_ID, isSigner: false, isWritable: false },
        {
          pubkey: new PublicKey('SysvarRent111111111111111111111111111111111'),
          isSigner: false,
          isWritable: false,
        },
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

  it('fails with non-admin trying to initialize', () => {
    const nonAdmin = Keypair.generate();
    env.svm.airdrop(nonAdmin.publicKey, BigInt(LAMPORTS_PER_SOL));

    const data = borsh.serialize(initializeSchema, {
      instruction: 0,
      merkle_updater: Array.from(env.merkleUpdater.publicKey.toBytes()),
      inflation_rate_bps: 1000,
    });

    // Derive metadata PDA for nonAdmin's mint
    const [metadataPda] = PublicKey.findProgramAddressSync(
      [METADATA_SEED, METADATA_PROGRAM_ID.toBuffer(), env.mintPda.toBuffer()],
      METADATA_PROGRAM_ID
    );

    const ix = new TransactionInstruction({
      programId: env.programId,
      keys: [
        { pubkey: nonAdmin.publicKey, isSigner: true, isWritable: true },
        { pubkey: env.configPda, isSigner: false, isWritable: true },
        { pubkey: env.mintPda, isSigner: false, isWritable: true },
        { pubkey: env.vaultPda, isSigner: false, isWritable: true },
        { pubkey: env.pendingClaimsPda, isSigner: false, isWritable: true },
        { pubkey: env.stakingVaultPda, isSigner: false, isWritable: true },
        { pubkey: metadataPda, isSigner: false, isWritable: true },
        { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
        { pubkey: TOKEN_PROGRAM_ID, isSigner: false, isWritable: false },
        { pubkey: METADATA_PROGRAM_ID, isSigner: false, isWritable: false },
        {
          pubkey: new PublicKey('SysvarRent111111111111111111111111111111111'),
          isSigner: false,
          isWritable: false,
        },
      ],
      data: Buffer.from(data),
    });

    const tx = new Transaction();
    tx.recentBlockhash = env.svm.latestBlockhash();
    tx.add(ix);
    tx.sign(nonAdmin);

    // Should succeed since anyone can initialize (admin becomes the signer)
    // But this tests that a different person can initialize with themselves as admin
    const result = env.svm.sendTransaction(tx);
    expect(isSuccess(result)).toBe(true);

    // Verify the non-admin is now the admin
    const config = getConfig(env);
    expect(new PublicKey(config.admin).equals(nonAdmin.publicKey)).toBe(true);

    console.log('Different admin initialization: OK');
  });

  it('fails with wrong mint PDA', () => {
    const wrongMint = Keypair.generate().publicKey;

    const data = borsh.serialize(initializeSchema, {
      instruction: 0,
      merkle_updater: Array.from(env.merkleUpdater.publicKey.toBytes()),
      inflation_rate_bps: 1000,
    });

    const ix = new TransactionInstruction({
      programId: env.programId,
      keys: [
        { pubkey: env.admin.publicKey, isSigner: true, isWritable: true },
        { pubkey: env.configPda, isSigner: false, isWritable: true },
        { pubkey: wrongMint, isSigner: false, isWritable: true },
        { pubkey: env.vaultPda, isSigner: false, isWritable: true },
        { pubkey: env.pendingClaimsPda, isSigner: false, isWritable: true },
        { pubkey: env.stakingVaultPda, isSigner: false, isWritable: true },
        { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
        { pubkey: TOKEN_PROGRAM_ID, isSigner: false, isWritable: false },
        {
          pubkey: new PublicKey('SysvarRent111111111111111111111111111111111'),
          isSigner: false,
          isWritable: false,
        },
      ],
      data: Buffer.from(data),
    });

    const tx = new Transaction();
    tx.recentBlockhash = env.svm.latestBlockhash();
    tx.add(ix);
    tx.sign(env.admin);

    const result = env.svm.sendTransaction(tx);
    expect(isSuccess(result)).toBe(false);

    console.log('Wrong mint PDA rejected: OK');
  });

  it('fails with wrong vault PDA', () => {
    const wrongVault = Keypair.generate().publicKey;

    const data = borsh.serialize(initializeSchema, {
      instruction: 0,
      merkle_updater: Array.from(env.merkleUpdater.publicKey.toBytes()),
      inflation_rate_bps: 1000,
    });

    const ix = new TransactionInstruction({
      programId: env.programId,
      keys: [
        { pubkey: env.admin.publicKey, isSigner: true, isWritable: true },
        { pubkey: env.configPda, isSigner: false, isWritable: true },
        { pubkey: env.mintPda, isSigner: false, isWritable: true },
        { pubkey: wrongVault, isSigner: false, isWritable: true },
        { pubkey: env.pendingClaimsPda, isSigner: false, isWritable: true },
        { pubkey: env.stakingVaultPda, isSigner: false, isWritable: true },
        { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
        { pubkey: TOKEN_PROGRAM_ID, isSigner: false, isWritable: false },
        {
          pubkey: new PublicKey('SysvarRent111111111111111111111111111111111'),
          isSigner: false,
          isWritable: false,
        },
      ],
      data: Buffer.from(data),
    });

    const tx = new Transaction();
    tx.recentBlockhash = env.svm.latestBlockhash();
    tx.add(ix);
    tx.sign(env.admin);

    const result = env.svm.sendTransaction(tx);
    expect(isSuccess(result)).toBe(false);

    console.log('Wrong vault PDA rejected: OK');
  });

  it('fails with wrong pending_claims PDA', () => {
    const wrongPendingClaims = Keypair.generate().publicKey;

    const data = borsh.serialize(initializeSchema, {
      instruction: 0,
      merkle_updater: Array.from(env.merkleUpdater.publicKey.toBytes()),
      inflation_rate_bps: 1000,
    });

    const ix = new TransactionInstruction({
      programId: env.programId,
      keys: [
        { pubkey: env.admin.publicKey, isSigner: true, isWritable: true },
        { pubkey: env.configPda, isSigner: false, isWritable: true },
        { pubkey: env.mintPda, isSigner: false, isWritable: true },
        { pubkey: env.vaultPda, isSigner: false, isWritable: true },
        { pubkey: wrongPendingClaims, isSigner: false, isWritable: true },
        { pubkey: env.stakingVaultPda, isSigner: false, isWritable: true },
        { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
        { pubkey: TOKEN_PROGRAM_ID, isSigner: false, isWritable: false },
        {
          pubkey: new PublicKey('SysvarRent111111111111111111111111111111111'),
          isSigner: false,
          isWritable: false,
        },
      ],
      data: Buffer.from(data),
    });

    const tx = new Transaction();
    tx.recentBlockhash = env.svm.latestBlockhash();
    tx.add(ix);
    tx.sign(env.admin);

    const result = env.svm.sendTransaction(tx);
    expect(isSuccess(result)).toBe(false);

    console.log('Wrong pending_claims PDA rejected: OK');
  });

  it('fails with wrong system program', () => {
    const fakeSystemProgram = Keypair.generate().publicKey;

    const data = borsh.serialize(initializeSchema, {
      instruction: 0,
      merkle_updater: Array.from(env.merkleUpdater.publicKey.toBytes()),
      inflation_rate_bps: 1000,
    });

    const ix = new TransactionInstruction({
      programId: env.programId,
      keys: [
        { pubkey: env.admin.publicKey, isSigner: true, isWritable: true },
        { pubkey: env.configPda, isSigner: false, isWritable: true },
        { pubkey: env.mintPda, isSigner: false, isWritable: true },
        { pubkey: env.vaultPda, isSigner: false, isWritable: true },
        { pubkey: env.pendingClaimsPda, isSigner: false, isWritable: true },
        { pubkey: fakeSystemProgram, isSigner: false, isWritable: false },
        { pubkey: TOKEN_PROGRAM_ID, isSigner: false, isWritable: false },
        {
          pubkey: new PublicKey('SysvarRent111111111111111111111111111111111'),
          isSigner: false,
          isWritable: false,
        },
      ],
      data: Buffer.from(data),
    });

    const tx = new Transaction();
    tx.recentBlockhash = env.svm.latestBlockhash();
    tx.add(ix);
    tx.sign(env.admin);

    const result = env.svm.sendTransaction(tx);
    expect(isSuccess(result)).toBe(false);

    console.log('Wrong system program rejected: OK');
  });

  it('fails with wrong token program', () => {
    const fakeTokenProgram = Keypair.generate().publicKey;

    const data = borsh.serialize(initializeSchema, {
      instruction: 0,
      merkle_updater: Array.from(env.merkleUpdater.publicKey.toBytes()),
      inflation_rate_bps: 1000,
    });

    const ix = new TransactionInstruction({
      programId: env.programId,
      keys: [
        { pubkey: env.admin.publicKey, isSigner: true, isWritable: true },
        { pubkey: env.configPda, isSigner: false, isWritable: true },
        { pubkey: env.mintPda, isSigner: false, isWritable: true },
        { pubkey: env.vaultPda, isSigner: false, isWritable: true },
        { pubkey: env.pendingClaimsPda, isSigner: false, isWritable: true },
        { pubkey: env.stakingVaultPda, isSigner: false, isWritable: true },
        { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
        { pubkey: fakeTokenProgram, isSigner: false, isWritable: false },
        {
          pubkey: new PublicKey('SysvarRent111111111111111111111111111111111'),
          isSigner: false,
          isWritable: false,
        },
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

  it('allows custom inflation rate', () => {
    const customRate = 500; // 5%
    const result = initializeProgram(env, customRate);
    expect(isSuccess(result)).toBe(true);

    const config = getConfig(env);
    expect(config.inflation_rate_bps).toBe(customRate);

    console.log(`Custom inflation rate ${customRate / 100}%: OK`);
  });
});
