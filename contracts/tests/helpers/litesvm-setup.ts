/**
 * Shared LiteSVM test setup and utilities
 * Provides common functionality for all integration tests
 */

import { LiteSVM, Clock, TransactionMetadata, FailedTransactionMetadata } from 'litesvm';
import {
  PublicKey,
  Keypair,
  Transaction,
  TransactionInstruction,
  SystemProgram,
  LAMPORTS_PER_SOL,
  SYSVAR_RENT_PUBKEY,
} from '@solana/web3.js';
import {
  TOKEN_PROGRAM_ID,
  ASSOCIATED_TOKEN_PROGRAM_ID,
  createAssociatedTokenAccountInstruction,
  getAssociatedTokenAddressSync,
} from '@solana/spl-token';
import * as borsh from 'borsh';
import { keccak256 as keccak } from 'js-sha3';

// ============== Constants ==============

export const DECIMALS = 9;
export const INITIAL_SUPPLY = BigInt(1_000_000_000) * BigInt(10 ** DECIMALS);
export const SECONDS_PER_YEAR = 31_536_000;

// Metaplex Token Metadata Program ID
export const METADATA_PROGRAM_ID = new PublicKey('metaqbxxUerdq28cj1RbAWkYQm3ybzjb6a8bt518x1s');

// Seeds
export const CONFIG_SEED = Buffer.from('config');
export const MINT_SEED = Buffer.from('mint');
export const VAULT_SEED = Buffer.from('vault');
export const PENDING_CLAIMS_SEED = Buffer.from('pending_claims');
export const USER_CLAIM_SEED = Buffer.from('user_claim');
export const METADATA_SEED = Buffer.from('metadata');

// Merkle tree domain separator
export const LEAF_DOMAIN = Buffer.from('YAP_CLAIM_V1');

// ============== Schemas ==============

export const initializeSchema = {
  struct: {
    instruction: 'u8',
    merkle_updater: { array: { type: 'u8', len: 32 } },
    inflation_rate_bps: 'u16',
  },
};

export const distributeSchema = {
  struct: {
    instruction: 'u8',
    amount: 'u64',
    merkle_root: { array: { type: 'u8', len: 32 } },
  },
};

export const claimSchema = {
  struct: {
    instruction: 'u8',
    amount: 'u64',
    proof: { array: { type: { array: { type: 'u8', len: 32 } } } },
  },
};

export const triggerInflationSchema = {
  struct: {
    instruction: 'u8',
  },
};

export const burnSchema = {
  struct: {
    instruction: 'u8',
    amount: 'u64',
  },
};

export const configSchema = {
  struct: {
    discriminator: { array: { type: 'u8', len: 8 } },
    mint: { array: { type: 'u8', len: 32 } },
    vault: { array: { type: 'u8', len: 32 } },
    pending_claims: { array: { type: 'u8', len: 32 } },
    merkle_root: { array: { type: 'u8', len: 32 } },
    merkle_updater: { array: { type: 'u8', len: 32 } },
    current_supply: 'u64',
    last_inflation_ts: 'i64',
    last_distribution_ts: 'i64',
    admin: { array: { type: 'u8', len: 32 } },
    inflation_rate_bps: 'u16',
    bump: 'u8',
  },
};

// ============== Transaction Helpers ==============

/**
 * Check if a transaction succeeded (litesvm@0.2.0 returns different types)
 */
export function isSuccess(result: TransactionMetadata | FailedTransactionMetadata): boolean {
  return !('err' in result && typeof (result as any).err === 'function');
}

/**
 * Get transaction logs (works for both success and failure)
 */
export function getLogs(result: TransactionMetadata | FailedTransactionMetadata): string[] {
  if (isSuccess(result)) {
    return (result as TransactionMetadata).logs();
  }
  return (result as FailedTransactionMetadata).meta().logs();
}

/**
 * Read u64 from Uint8Array at offset
 */
export function readU64LE(data: Uint8Array, offset: number): bigint {
  const view = new DataView(data.buffer, data.byteOffset + offset, 8);
  return view.getBigUint64(0, true);
}

/**
 * Convert account data to Buffer for borsh deserialization
 */
export function toBuffer(data: Uint8Array | Buffer): Buffer {
  return data instanceof Uint8Array ? Buffer.from(data) : data;
}

// ============== Merkle Tree Utilities ==============

export function keccak256(data: Buffer): Buffer {
  return Buffer.from(keccak.arrayBuffer(data));
}

export function computeLeaf(wallet: PublicKey, amount: bigint): Buffer {
  const data = Buffer.concat([
    LEAF_DOMAIN,
    wallet.toBuffer(),
    Buffer.from(new BigUint64Array([amount]).buffer),
  ]);
  return keccak256(data);
}

export function sortAndHash(a: Buffer, b: Buffer): Buffer {
  if (a.compare(b) <= 0) {
    return keccak256(Buffer.concat([a, b]));
  } else {
    return keccak256(Buffer.concat([b, a]));
  }
}

export interface MerkleTree {
  root: Buffer;
  getProof: (index: number) => Buffer[];
}

export function buildMerkleTree(leaves: Buffer[]): MerkleTree {
  if (leaves.length === 0) throw new Error('No leaves');

  const levels: Buffer[][] = [leaves];
  let currentLevel = leaves;

  while (currentLevel.length > 1) {
    const nextLevel: Buffer[] = [];
    for (let i = 0; i < currentLevel.length; i += 2) {
      if (i + 1 < currentLevel.length) {
        nextLevel.push(sortAndHash(currentLevel[i], currentLevel[i + 1]));
      } else {
        nextLevel.push(currentLevel[i]);
      }
    }
    levels.push(nextLevel);
    currentLevel = nextLevel;
  }

  return {
    root: currentLevel[0],
    getProof(index: number): Buffer[] {
      const proof: Buffer[] = [];
      let idx = index;

      for (let level = 0; level < levels.length - 1; level++) {
        const levelNodes = levels[level];
        const siblingIdx = idx % 2 === 1 ? idx - 1 : idx + 1;

        if (siblingIdx < levelNodes.length) {
          proof.push(levelNodes[siblingIdx]);
        }

        idx = Math.floor(idx / 2);
      }

      return proof;
    },
  };
}

// ============== Test Environment Setup ==============

export interface TestEnv {
  readonly svm: LiteSVM;
  readonly programId: PublicKey;
  readonly admin: Keypair;
  readonly merkleUpdater: Keypair;
  readonly user: Keypair;
  // PDAs (derived from programId, except metadataPda which uses METADATA_PROGRAM_ID)
  readonly configPda: PublicKey;
  readonly mintPda: PublicKey;
  readonly vaultPda: PublicKey;
  readonly pendingClaimsPda: PublicKey;
  readonly metadataPda: PublicKey;
}

/**
 * Create a fresh LiteSVM test environment with the YAP program loaded
 */
export function createTestEnv(): TestEnv {
  const svm = new LiteSVM();

  // Generate program ID and load the program
  const programId = Keypair.generate().publicKey;
  svm.addProgramFromFile(programId, 'target/deploy/yap.so');

  // Load Metaplex Token Metadata program for CPI testing
  svm.addProgramFromFile(METADATA_PROGRAM_ID, 'tests/fixtures/mpl_token_metadata.so');

  // Generate keypairs
  const admin = Keypair.generate();
  const merkleUpdater = Keypair.generate();
  const user = Keypair.generate();

  // Airdrop SOL
  svm.airdrop(admin.publicKey, BigInt(100 * LAMPORTS_PER_SOL));
  svm.airdrop(merkleUpdater.publicKey, BigInt(10 * LAMPORTS_PER_SOL));
  svm.airdrop(user.publicKey, BigInt(10 * LAMPORTS_PER_SOL));

  // Derive PDAs
  const [configPda] = PublicKey.findProgramAddressSync([CONFIG_SEED], programId);
  const [mintPda] = PublicKey.findProgramAddressSync([MINT_SEED], programId);
  const [vaultPda] = PublicKey.findProgramAddressSync([VAULT_SEED], programId);
  const [pendingClaimsPda] = PublicKey.findProgramAddressSync([PENDING_CLAIMS_SEED], programId);
  // Metadata PDA is derived from Metaplex program, not YAP program
  const [metadataPda] = PublicKey.findProgramAddressSync(
    [METADATA_SEED, METADATA_PROGRAM_ID.toBuffer(), mintPda.toBuffer()],
    METADATA_PROGRAM_ID
  );

  // Set initial clock to a reasonable start time
  const startTime = BigInt(1731628800); // Nov 15, 2024
  svm.setClock(new Clock(BigInt(1000), startTime, BigInt(0), BigInt(0), startTime));

  return {
    svm,
    programId,
    admin,
    merkleUpdater,
    user,
    configPda,
    mintPda,
    vaultPda,
    pendingClaimsPda,
    metadataPda,
  };
}

/**
 * Find user claim PDA
 */
export function findUserClaimPda(programId: PublicKey, user: PublicKey): [PublicKey, number] {
  return PublicKey.findProgramAddressSync([USER_CLAIM_SEED, user.toBuffer()], programId);
}

// ============== Instruction Builders ==============

/**
 * Build initialize instruction
 *
 * Note: The Metaplex Token Metadata program is loaded from tests/fixtures/mpl_token_metadata.so
 * (downloaded from mainnet via: solana program dump metaqbxxUerdq28cj1RbAWkYQm3ybzjb6a8bt518x1s)
 */
export function buildInitializeIx(
  env: TestEnv,
  inflationRateBps: number = 1000
): TransactionInstruction {
  const data = borsh.serialize(initializeSchema, {
    instruction: 0,
    merkle_updater: Array.from(env.merkleUpdater.publicKey.toBytes()),
    inflation_rate_bps: inflationRateBps,
  });

  return new TransactionInstruction({
    programId: env.programId,
    keys: [
      { pubkey: env.admin.publicKey, isSigner: true, isWritable: true },
      { pubkey: env.configPda, isSigner: false, isWritable: true },
      { pubkey: env.mintPda, isSigner: false, isWritable: true },
      { pubkey: env.vaultPda, isSigner: false, isWritable: true },
      { pubkey: env.pendingClaimsPda, isSigner: false, isWritable: true },
      { pubkey: env.stakingVaultPda, isSigner: false, isWritable: true },
      { pubkey: env.metadataPda, isSigner: false, isWritable: true },
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
}

export function buildDistributeIx(
  env: TestEnv,
  amount: bigint,
  merkleRoot: Buffer
): TransactionInstruction {
  const data = borsh.serialize(distributeSchema, {
    instruction: 2,
    amount,
    merkle_root: Array.from(merkleRoot),
  });

  return new TransactionInstruction({
    programId: env.programId,
    keys: [
      { pubkey: env.merkleUpdater.publicKey, isSigner: true, isWritable: false },
      { pubkey: env.configPda, isSigner: false, isWritable: true },
      { pubkey: env.vaultPda, isSigner: false, isWritable: true },
      { pubkey: env.pendingClaimsPda, isSigner: false, isWritable: true },
      { pubkey: env.mintPda, isSigner: false, isWritable: false },
      { pubkey: TOKEN_PROGRAM_ID, isSigner: false, isWritable: false },
    ],
    data: Buffer.from(data),
  });
}

export function buildClaimIx(
  env: TestEnv,
  claimer: Keypair,
  claimerAta: PublicKey,
  amount: bigint,
  proof: Buffer[]
): TransactionInstruction {
  const [userClaimPda] = findUserClaimPda(env.programId, claimer.publicKey);

  const data = borsh.serialize(claimSchema, {
    instruction: 3,
    amount,
    proof: proof.map((p) => Array.from(p)),
  });

  return new TransactionInstruction({
    programId: env.programId,
    keys: [
      { pubkey: claimer.publicKey, isSigner: true, isWritable: true },
      { pubkey: claimerAta, isSigner: false, isWritable: true },
      { pubkey: userClaimPda, isSigner: false, isWritable: true },
      { pubkey: env.configPda, isSigner: false, isWritable: false },
      { pubkey: env.pendingClaimsPda, isSigner: false, isWritable: true },
      { pubkey: env.mintPda, isSigner: false, isWritable: false },
      { pubkey: TOKEN_PROGRAM_ID, isSigner: false, isWritable: false },
      { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
      {
        pubkey: new PublicKey('SysvarRent111111111111111111111111111111111'),
        isSigner: false,
        isWritable: false,
      },
    ],
    data: Buffer.from(data),
  });
}

export function buildTriggerInflationIx(env: TestEnv): TransactionInstruction {
  const data = borsh.serialize(triggerInflationSchema, {
    instruction: 1,
  });

  return new TransactionInstruction({
    programId: env.programId,
    keys: [
      { pubkey: env.admin.publicKey, isSigner: true, isWritable: false },
      { pubkey: env.configPda, isSigner: false, isWritable: true },
      { pubkey: env.mintPda, isSigner: false, isWritable: true },
      { pubkey: env.vaultPda, isSigner: false, isWritable: true },
      { pubkey: TOKEN_PROGRAM_ID, isSigner: false, isWritable: false },
    ],
    data: Buffer.from(data),
  });
}

// ============== High-Level Test Helpers ==============

/**
 * Initialize the program and return the result
 */
export function initializeProgram(
  env: TestEnv,
  inflationRateBps: number = 1000
): TransactionMetadata | FailedTransactionMetadata {
  const ix = buildInitializeIx(env, inflationRateBps);
  const tx = new Transaction();
  tx.recentBlockhash = env.svm.latestBlockhash();
  tx.add(ix);
  tx.sign(env.admin);
  return env.svm.sendTransaction(tx);
}

/**
 * Distribute tokens with a new merkle root
 */
export function distribute(
  env: TestEnv,
  amount: bigint,
  merkleRoot: Buffer
): TransactionMetadata | FailedTransactionMetadata {
  const ix = buildDistributeIx(env, amount, merkleRoot);
  const tx = new Transaction();
  tx.recentBlockhash = env.svm.latestBlockhash();
  tx.add(ix);
  tx.sign(env.merkleUpdater);
  return env.svm.sendTransaction(tx);
}

/**
 * Warp clock forward by seconds
 * Also expires blockhash to allow identical transactions to succeed
 */
export function warpTime(env: TestEnv, seconds: number): void {
  const currentClock = env.svm.getClock();
  const newTimestamp = currentClock.unixTimestamp + BigInt(seconds);
  // Keep slot advances small to avoid issues
  const newSlot = currentClock.slot + BigInt(1);

  env.svm.setClock(
    new Clock(
      newSlot,
      currentClock.epochStartTimestamp,
      currentClock.epoch,
      currentClock.leaderScheduleEpoch,
      newTimestamp
    )
  );

  // Expire blockhash to allow identical transactions after time warp
  env.svm.expireBlockhash();
}

/**
 * Get config data from the config PDA
 */
export function getConfig(env: TestEnv): any {
  const account = env.svm.getAccount(env.configPda);
  if (!account) return null;
  const data = toBuffer(account.data);
  return borsh.deserialize(configSchema, data);
}

/**
 * Get token balance from a token account
 */
export function getTokenBalance(env: TestEnv, tokenAccount: PublicKey): bigint {
  const account = env.svm.getAccount(tokenAccount);
  if (!account) return 0n;
  // SPL Token account: amount is at offset 64
  return readU64LE(account.data, 64);
}

// ============== Burn Helpers ==============

/**
 * Build burn instruction
 */
export function buildBurnIx(
  env: TestEnv,
  burner: Keypair,
  burnerAta: PublicKey,
  amount: bigint
): TransactionInstruction {
  const data = borsh.serialize(burnSchema, {
    instruction: 4, // Burn instruction index
    amount,
  });

  return new TransactionInstruction({
    programId: env.programId,
    keys: [
      { pubkey: burner.publicKey, isSigner: true, isWritable: false },
      { pubkey: burnerAta, isSigner: false, isWritable: true },
      { pubkey: env.configPda, isSigner: false, isWritable: true },
      { pubkey: env.mintPda, isSigner: false, isWritable: true },
      { pubkey: TOKEN_PROGRAM_ID, isSigner: false, isWritable: false },
    ],
    data: Buffer.from(data),
  });
}

/**
 * Execute burn transaction
 */
export function burn(
  env: TestEnv,
  burner: Keypair,
  burnerAta: PublicKey,
  amount: bigint
): TransactionMetadata | FailedTransactionMetadata {
  const ix = buildBurnIx(env, burner, burnerAta, amount);
  const tx = new Transaction();
  tx.recentBlockhash = env.svm.latestBlockhash();
  tx.add(ix);
  tx.sign(burner);
  return env.svm.sendTransaction(tx);
}

// ============== Admin Helpers ==============

export const updateMerkleUpdaterSchema = {
  struct: {
    instruction: 'u8',
    new_updater: { array: { type: 'u8', len: 32 } },
  },
};

/**
 * Build UpdateMerkleUpdater instruction
 */
export function buildUpdateMerkleUpdaterIx(
  env: TestEnv,
  admin: Keypair,
  newUpdater: PublicKey
): TransactionInstruction {
  const data = borsh.serialize(updateMerkleUpdaterSchema, {
    instruction: 7, // UpdateMerkleUpdater instruction index
    new_updater: Array.from(newUpdater.toBytes()),
  });

  return new TransactionInstruction({
    programId: env.programId,
    keys: [
      { pubkey: admin.publicKey, isSigner: true, isWritable: false },
      { pubkey: env.configPda, isSigner: false, isWritable: true },
    ],
    data: Buffer.from(data),
  });
}

/**
 * Execute UpdateMerkleUpdater transaction
 */
export function updateMerkleUpdater(
  env: TestEnv,
  admin: Keypair,
  newUpdater: PublicKey
): TransactionMetadata | FailedTransactionMetadata {
  const ix = buildUpdateMerkleUpdaterIx(env, admin, newUpdater);
  const tx = new Transaction();
  tx.recentBlockhash = env.svm.latestBlockhash();
  tx.add(ix);
  tx.sign(admin);
  return env.svm.sendTransaction(tx);
}

/**
 * Build distribute instruction with custom signer
 * Used for testing authorization after UpdateMerkleUpdater
 */
export function buildDistributeIxWithSigner(
  env: TestEnv,
  signer: Keypair,
  amount: bigint,
  merkleRoot: Buffer
): TransactionInstruction {
  const data = borsh.serialize(distributeSchema, {
    instruction: 2,
    amount,
    merkle_root: Array.from(merkleRoot),
  });

  return new TransactionInstruction({
    programId: env.programId,
    keys: [
      { pubkey: signer.publicKey, isSigner: true, isWritable: false },
      { pubkey: env.configPda, isSigner: false, isWritable: true },
      { pubkey: env.vaultPda, isSigner: false, isWritable: true },
      { pubkey: env.pendingClaimsPda, isSigner: false, isWritable: true },
      { pubkey: env.mintPda, isSigner: false, isWritable: false },
      { pubkey: TOKEN_PROGRAM_ID, isSigner: false, isWritable: false },
    ],
    data: Buffer.from(data),
  });
}

/**
 * Execute distribute with custom signer
 */
export function distributeWithSigner(
  env: TestEnv,
  signer: Keypair,
  amount: bigint,
  merkleRoot: Buffer
): TransactionMetadata | FailedTransactionMetadata {
  const ix = buildDistributeIxWithSigner(env, signer, amount, merkleRoot);
  const tx = new Transaction();
  tx.recentBlockhash = env.svm.latestBlockhash();
  tx.add(ix);
  tx.sign(signer);
  return env.svm.sendTransaction(tx);
}

// ============== ATA Helpers ==============

/**
 * Get ATA address for a user and mint
 */
export function getAta(owner: PublicKey, mint: PublicKey): PublicKey {
  return getAssociatedTokenAddressSync(mint, owner);
}

/**
 * Create an Associated Token Account for a user
 * Returns the ATA address
 */
export function createAta(
  env: TestEnv,
  payer: Keypair,
  owner: PublicKey
): { ata: PublicKey; result: TransactionMetadata | FailedTransactionMetadata } {
  const ata = getAta(owner, env.mintPda);

  const ix = createAssociatedTokenAccountInstruction(payer.publicKey, ata, owner, env.mintPda);

  const tx = new Transaction();
  tx.recentBlockhash = env.svm.latestBlockhash();
  tx.add(ix);
  tx.sign(payer);

  const result = env.svm.sendTransaction(tx);
  return { ata, result };
}

// ============== Full Flow Helpers ==============

/**
 * Fund a user with tokens via the full claim flow:
 * 1. Create user's ATA
 * 2. Warp time for distribution availability
 * 3. Distribute with merkle root containing user's allocation
 * 4. User claims tokens
 *
 * Returns the user's ATA address and final balance
 */
export function fundUserViaClaim(
  env: TestEnv,
  user: Keypair,
  amount: bigint,
  warpDays: number = 1
): { ata: PublicKey; success: boolean; logs?: string[] } {
  // 1. Create user's ATA
  const { ata, result: ataResult } = createAta(env, user, user.publicKey);
  if (!isSuccess(ataResult)) {
    return { ata, success: false, logs: getLogs(ataResult) };
  }

  // 2. Warp time for distribution availability
  warpTime(env, warpDays * 86400);

  // 3. Build merkle tree with user's allocation and distribute
  const leaf = computeLeaf(user.publicKey, amount);
  const tree = buildMerkleTree([leaf]);
  const proof = tree.getProof(0);

  const distributeResult = distribute(env, amount, tree.root);
  if (!isSuccess(distributeResult)) {
    return { ata, success: false, logs: getLogs(distributeResult) };
  }

  // 4. User claims tokens
  const claimResult = claim(env, user, ata, amount, proof);
  if (!isSuccess(claimResult)) {
    return { ata, success: false, logs: getLogs(claimResult) };
  }

  return { ata, success: true };
}

/**
 * Execute claim transaction
 */
export function claim(
  env: TestEnv,
  claimer: Keypair,
  claimerAta: PublicKey,
  amount: bigint,
  proof: Buffer[]
): TransactionMetadata | FailedTransactionMetadata {
  const ix = buildClaimIx(env, claimer, claimerAta, amount, proof);
  const tx = new Transaction();
  tx.recentBlockhash = env.svm.latestBlockhash();
  tx.add(ix);
  tx.sign(claimer);
  return env.svm.sendTransaction(tx);
}
