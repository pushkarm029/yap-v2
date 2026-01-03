import { PublicKey } from '@solana/web3.js';
import { writeBigUInt64LE, writeUInt32LE } from './buffer-utils';

// Program ID - YAP Token Program
export const YAP_PROGRAM_ID = new PublicKey(
  process.env.NEXT_PUBLIC_YAP_PROGRAM_ID || 'CP5uP8kmwMnRDLh2yfrbeZLByo2wNCUdmQqTz3bso5dy'
);

// Token Program ID
export const TOKEN_PROGRAM_ID = new PublicKey('TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA');

// Associated Token Program ID
export const ASSOCIATED_TOKEN_PROGRAM_ID = new PublicKey(
  'ATokenGPvbdGVxr1b2hvZbsiqW5xWH25efTNsLJA8knL'
);

// System Program ID
export const SYSTEM_PROGRAM_ID = new PublicKey('11111111111111111111111111111111');

// Rent Sysvar ID
export const RENT_SYSVAR_ID = new PublicKey('SysvarRent111111111111111111111111111111111');

// Metaplex Token Metadata Program ID
export const METADATA_PROGRAM_ID = new PublicKey('metaqbxxUerdq28cj1RbAWkYQm3ybzjb6a8bt518x1s');

// PDA Seeds
export const CONFIG_SEED = Buffer.from('config');
export const MINT_SEED = Buffer.from('mint');
export const VAULT_SEED = Buffer.from('vault');
export const PENDING_CLAIMS_SEED = Buffer.from('pending_claims');
export const USER_CLAIM_SEED = Buffer.from('user_claim');
export const METADATA_SEED = Buffer.from('metadata');

// Derive Config PDA
export function getConfigPda(): [PublicKey, number] {
  return PublicKey.findProgramAddressSync([CONFIG_SEED], YAP_PROGRAM_ID);
}

// Derive Mint PDA
export function getMintPda(): [PublicKey, number] {
  return PublicKey.findProgramAddressSync([MINT_SEED], YAP_PROGRAM_ID);
}

// Derive Vault PDA
export function getVaultPda(): [PublicKey, number] {
  return PublicKey.findProgramAddressSync([VAULT_SEED], YAP_PROGRAM_ID);
}

// Derive Pending Claims PDA
export function getPendingClaimsPda(): [PublicKey, number] {
  return PublicKey.findProgramAddressSync([PENDING_CLAIMS_SEED], YAP_PROGRAM_ID);
}

// Derive UserClaimStatus PDA
export function getUserClaimPda(user: PublicKey): [PublicKey, number] {
  return PublicKey.findProgramAddressSync([USER_CLAIM_SEED, user.toBuffer()], YAP_PROGRAM_ID);
}

// Derive Metadata PDA (Metaplex Token Metadata account)
// Seeds: ["metadata", METADATA_PROGRAM_ID, MINT_PUBKEY]
export function getMetadataPda(mint?: PublicKey): [PublicKey, number] {
  const [mintPda] = mint ? [mint, 0] : getMintPda();
  return PublicKey.findProgramAddressSync(
    [METADATA_SEED, METADATA_PROGRAM_ID.toBuffer(), mintPda.toBuffer()],
    METADATA_PROGRAM_ID
  );
}

// Token decimals
export const YAP_DECIMALS = 9;

// Format token amount for display
export function formatTokenAmount(amount: bigint): string {
  const divisor = BigInt(10 ** YAP_DECIMALS);
  const whole = amount / divisor;
  const fraction = amount % divisor;

  if (fraction === BigInt(0)) {
    return whole.toLocaleString();
  }

  const fractionStr = fraction.toString().padStart(YAP_DECIMALS, '0');
  const trimmedFraction = fractionStr.replace(/0+$/, '');

  return `${whole.toLocaleString()}.${trimmedFraction}`;
}

// Parse token amount from string
export function parseTokenAmount(amount: string): bigint {
  const [whole, fraction = ''] = amount.split('.');
  const wholeNum = BigInt(whole.replace(/,/g, ''));
  const fractionPadded = fraction.padEnd(YAP_DECIMALS, '0').slice(0, YAP_DECIMALS);
  const fractionNum = BigInt(fractionPadded);

  return wholeNum * BigInt(10 ** YAP_DECIMALS) + fractionNum;
}

// Build claim instruction data
// Layout: [discriminator(1)] [amount(8)] [proof_len(4)] [proof(32 * n)]
export function buildClaimInstructionData(amount: bigint, proof: Buffer[]): Buffer {
  const size = 1 + 8 + 4 + proof.length * 32;
  const data = Buffer.alloc(size);

  let offset = 0;

  // Instruction discriminator (3 = Claim)
  data[offset] = 3;
  offset += 1;

  // Amount (u64 little-endian)
  writeBigUInt64LE(data, amount, offset);
  offset += 8;

  // Proof length (u32 little-endian)
  writeUInt32LE(data, proof.length, offset);
  offset += 4;

  // Proof elements
  for (const element of proof) {
    element.copy(data, offset);
    offset += 32;
  }

  return data;
}
