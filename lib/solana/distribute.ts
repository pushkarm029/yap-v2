import {
  Connection,
  Keypair,
  PublicKey,
  Transaction,
  TransactionInstruction,
  sendAndConfirmTransaction,
} from '@solana/web3.js';
import { AccountLayout, TOKEN_PROGRAM_ID } from '@solana/spl-token';
import {
  YAP_PROGRAM_ID,
  getConfigPda,
  getVaultPda,
  getPendingClaimsPda,
  getMintPda,
} from './claim';
import { SOLANA_NETWORK } from './explorer';
import { writeBigUInt64LE } from './buffer-utils';

// Seconds per year for rate limiting calculations
const SECONDS_PER_YEAR = 365 * 24 * 60 * 60;

// Instruction discriminator for Distribute = 2
const DISTRIBUTE_DISCRIMINATOR = 2;

// Get RPC endpoint
export function getRpcEndpoint(): string {
  if (process.env.SOLANA_RPC_URL) {
    return process.env.SOLANA_RPC_URL;
  }
  return SOLANA_NETWORK === 'mainnet-beta'
    ? 'https://api.mainnet-beta.solana.com'
    : 'https://api.devnet.solana.com';
}

// Load merkle updater keypair from environment
export function getMerkleUpdaterKeypair(): Keypair {
  const secretKey = process.env.MERKLE_UPDATER_SECRET_KEY;
  if (!secretKey) {
    throw new Error('MERKLE_UPDATER_SECRET_KEY not set');
  }

  try {
    const keyArray = JSON.parse(secretKey);
    return Keypair.fromSecretKey(Uint8Array.from(keyArray));
  } catch {
    throw new Error('Invalid MERKLE_UPDATER_SECRET_KEY format');
  }
}

// Build distribute instruction data
// Layout: [discriminator(1)] [amount(8)] [merkle_root(32)]
function buildDistributeData(amount: bigint, merkleRoot: Uint8Array): Buffer {
  if (merkleRoot.length !== 32) {
    throw new Error('Merkle root must be 32 bytes');
  }

  const data = Buffer.alloc(41); // 1 + 8 + 32
  data[0] = DISTRIBUTE_DISCRIMINATOR;
  writeBigUInt64LE(data, amount, 1);
  Buffer.from(merkleRoot).copy(data, 9);

  return data;
}

// Create distribute instruction
// Accounts (must match contract instruction.rs:38-45):
// 0. [signer] Merkle updater
// 1. [writable] Config PDA
// 2. [writable] Vault token account
// 3. [writable] Pending claims token account
// 4. [] Mint
// 5. [] Token program
export function createDistributeInstruction(
  updater: PublicKey,
  amount: bigint,
  merkleRoot: Uint8Array
): TransactionInstruction {
  const [configPda] = getConfigPda();
  const [vaultPda] = getVaultPda();
  const [pendingClaimsPda] = getPendingClaimsPda();
  const [mintPda] = getMintPda();
  const data = buildDistributeData(amount, merkleRoot);

  return new TransactionInstruction({
    programId: YAP_PROGRAM_ID,
    keys: [
      { pubkey: updater, isSigner: true, isWritable: false },
      { pubkey: configPda, isSigner: false, isWritable: true },
      { pubkey: vaultPda, isSigner: false, isWritable: true },
      { pubkey: pendingClaimsPda, isSigner: false, isWritable: true },
      { pubkey: mintPda, isSigner: false, isWritable: false },
      { pubkey: TOKEN_PROGRAM_ID, isSigner: false, isWritable: false },
    ],
    data,
  });
}

// Submit distribution onchain (transfers tokens from vault to pending_claims and sets merkle root)
export async function submitMerkleRoot(merkleRoot: Uint8Array, amount: bigint): Promise<string> {
  const connection = new Connection(getRpcEndpoint(), 'confirmed');
  const updater = getMerkleUpdaterKeypair();

  const instruction = createDistributeInstruction(updater.publicKey, amount, merkleRoot);

  const transaction = new Transaction().add(instruction);

  const signature = await sendAndConfirmTransaction(connection, transaction, [updater], {
    commitment: 'confirmed',
  });

  return signature;
}

// Verify merkle root was updated
export async function verifyMerkleRoot(expectedRoot: Uint8Array): Promise<boolean> {
  const connection = new Connection(getRpcEndpoint(), 'confirmed');
  const [configPda] = getConfigPda();

  const accountInfo = await connection.getAccountInfo(configPda);
  if (!accountInfo) {
    return false;
  }

  // Config layout:
  // discriminator: 8 bytes
  // mint: 32 bytes
  // vault: 32 bytes
  // pending_claims: 32 bytes
  // merkle_root: 32 bytes (offset 104)
  const merkleRootOffset = 8 + 32 + 32 + 32;
  const currentRoot = accountInfo.data.slice(merkleRootOffset, merkleRootOffset + 32);

  return Buffer.from(currentRoot).equals(Buffer.from(expectedRoot));
}

/**
 * Config account layout offsets
 * Layout: discriminator(8) + mint(32) + vault(32) + pending_claims(32) +
 *         merkle_root(32) + merkle_updater(32) + current_supply(8) +
 *         last_inflation_ts(8) + last_distribution_ts(8) + admin(32) +
 *         inflation_rate_bps(2) + bump(1)
 */
const CONFIG_OFFSETS = {
  discriminator: 0,
  mint: 8,
  vault: 40,
  pending_claims: 72,
  merkle_root: 104,
  merkle_updater: 136,
  current_supply: 168,
  last_inflation_ts: 176,
  last_distribution_ts: 184,
  admin: 192,
  inflation_rate_bps: 224,
  bump: 226,
} as const;

/**
 * Get vault token account balance (undistributed tokens)
 */
export async function getVaultBalance(): Promise<bigint> {
  const connection = new Connection(getRpcEndpoint(), 'confirmed');
  const [configPda] = getConfigPda();

  // Read config to get vault address
  const configInfo = await connection.getAccountInfo(configPda);
  if (!configInfo) {
    throw new Error('Config account not found - program not initialized');
  }

  const vaultPubkey = new PublicKey(
    configInfo.data.slice(CONFIG_OFFSETS.vault, CONFIG_OFFSETS.vault + 32)
  );

  // Read vault token account
  const vaultInfo = await connection.getAccountInfo(vaultPubkey);
  if (!vaultInfo) {
    throw new Error('Vault account not found');
  }

  // Parse SPL token account to get balance
  const vaultData = AccountLayout.decode(vaultInfo.data);
  return vaultData.amount;
}

/**
 * Get rate-limited available amount based on time elapsed
 * This matches the contract's rate limiting logic:
 * available = (elapsed_since_last_distribution * vault_balance) / SECONDS_PER_YEAR
 */
export async function getRateLimitedAvailable(): Promise<bigint> {
  const connection = new Connection(getRpcEndpoint(), 'confirmed');
  const [configPda] = getConfigPda();

  const configInfo = await connection.getAccountInfo(configPda);
  if (!configInfo) {
    throw new Error('Config account not found');
  }

  // Read last_distribution_ts (i64 at offset 216)
  const lastDistributionTs = configInfo.data.readBigInt64LE(CONFIG_OFFSETS.last_distribution_ts);

  // Get current time
  const now = BigInt(Math.floor(Date.now() / 1000));
  const secondsElapsed = now - lastDistributionTs;

  // Get vault balance
  const vaultBalance = await getVaultBalance();

  // Rate limited: (seconds_elapsed * vault_balance) / seconds_per_year
  const available = (secondsElapsed * vaultBalance) / BigInt(SECONDS_PER_YEAR);

  return available;
}
