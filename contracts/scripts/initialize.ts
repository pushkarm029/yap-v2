/**
 * Initialize YAP program on devnet
 *
 * Usage: bun run scripts/initialize.ts
 */
import {
  Connection,
  Keypair,
  PublicKey,
  Transaction,
  TransactionInstruction,
  sendAndConfirmTransaction,
  SYSVAR_RENT_PUBKEY,
  SystemProgram,
} from '@solana/web3.js';
import { TOKEN_PROGRAM_ID } from '@solana/spl-token';
import * as fs from 'fs';
import * as path from 'path';

// Program ID - update after deployment
const PROGRAM_ID = new PublicKey('CP5uP8kmwMnRDLh2yfrbeZLByo2wNCUdmQqTz3bso5dy');

// Metaplex Token Metadata Program ID
const METADATA_PROGRAM_ID = new PublicKey('metaqbxxUerdq28cj1RbAWkYQm3ybzjb6a8bt518x1s');

// PDA seeds
const CONFIG_SEED = Buffer.from('config');
const MINT_SEED = Buffer.from('mint');
const VAULT_SEED = Buffer.from('vault');
const PENDING_CLAIMS_SEED = Buffer.from('pending_claims');
const METADATA_SEED = Buffer.from('metadata');

// Derive PDAs
function getConfigPda(): [PublicKey, number] {
  return PublicKey.findProgramAddressSync([CONFIG_SEED], PROGRAM_ID);
}

function getMintPda(): [PublicKey, number] {
  return PublicKey.findProgramAddressSync([MINT_SEED], PROGRAM_ID);
}

function getVaultPda(): [PublicKey, number] {
  return PublicKey.findProgramAddressSync([VAULT_SEED], PROGRAM_ID);
}

function getPendingClaimsPda(): [PublicKey, number] {
  return PublicKey.findProgramAddressSync([PENDING_CLAIMS_SEED], PROGRAM_ID);
}

function getMetadataPda(mint: PublicKey): [PublicKey, number] {
  return PublicKey.findProgramAddressSync(
    [METADATA_SEED, METADATA_PROGRAM_ID.toBuffer(), mint.toBuffer()],
    METADATA_PROGRAM_ID
  );
}

// Build initialize instruction data
// Layout: [discriminator(1)] [merkle_updater(32)] [inflation_rate_bps(2)]
function buildInitializeData(merkleUpdater: PublicKey, inflationRateBps: number): Buffer {
  const data = Buffer.alloc(35);

  // Instruction discriminator (0 = Initialize)
  data.writeUInt8(0, 0);

  // Merkle updater pubkey
  merkleUpdater.toBuffer().copy(data, 1);

  // Inflation rate in basis points (little-endian u16)
  data.writeUInt16LE(inflationRateBps, 33);

  return data;
}

async function main() {
  // Load wallet from default Solana config
  const homeDir = process.env.HOME || process.env.USERPROFILE || '';
  const keypairPath = path.join(homeDir, '.config', 'solana', 'id.json');

  if (!fs.existsSync(keypairPath)) {
    throw new Error(`Keypair not found at ${keypairPath}`);
  }

  const secretKey = JSON.parse(fs.readFileSync(keypairPath, 'utf-8'));
  const admin = Keypair.fromSecretKey(Uint8Array.from(secretKey));

  console.log('Admin wallet:', admin.publicKey.toBase58());
  console.log('Program ID:', PROGRAM_ID.toBase58());

  // Connect to devnet
  const connection = new Connection('https://api.devnet.solana.com', 'confirmed');

  const balance = await connection.getBalance(admin.publicKey);
  console.log('Balance:', balance / 1e9, 'SOL');

  if (balance < 0.1 * 1e9) {
    throw new Error('Insufficient balance - need at least 0.1 SOL');
  }

  // Derive all PDAs
  const [configPda] = getConfigPda();
  const [mintPda] = getMintPda();
  const [vaultPda] = getVaultPda();
  const [pendingClaimsPda] = getPendingClaimsPda();
  const [metadataPda] = getMetadataPda(mintPda);

  console.log('\nPDAs:');
  console.log('  Config:', configPda.toBase58());
  console.log('  Mint:', mintPda.toBase58());
  console.log('  Metadata:', metadataPda.toBase58());
  console.log('  Vault:', vaultPda.toBase58());
  console.log('  Pending Claims:', pendingClaimsPda.toBase58());

  // Check if already initialized
  const configAccount = await connection.getAccountInfo(configPda);
  if (configAccount) {
    console.log('\nProgram already initialized!');
    return;
  }

  // Initialize with:
  // - merkle_updater = admin (for testing, update in production)
  // - inflation_rate_bps = 1000 (10% annual)
  const merkleUpdater = admin.publicKey;
  const inflationRateBps = 1000; // 10%

  console.log('\nInitializing with:');
  console.log('  Merkle Updater:', merkleUpdater.toBase58());
  console.log('  Inflation Rate:', inflationRateBps / 100, '%');

  const data = buildInitializeData(merkleUpdater, inflationRateBps);

  const instruction = new TransactionInstruction({
    programId: PROGRAM_ID,
    keys: [
      { pubkey: admin.publicKey, isSigner: true, isWritable: true },
      { pubkey: configPda, isSigner: false, isWritable: true },
      { pubkey: mintPda, isSigner: false, isWritable: true },
      { pubkey: vaultPda, isSigner: false, isWritable: true },
      { pubkey: pendingClaimsPda, isSigner: false, isWritable: true },
      { pubkey: metadataPda, isSigner: false, isWritable: true },
      { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
      { pubkey: TOKEN_PROGRAM_ID, isSigner: false, isWritable: false },
      { pubkey: METADATA_PROGRAM_ID, isSigner: false, isWritable: false },
      { pubkey: SYSVAR_RENT_PUBKEY, isSigner: false, isWritable: false },
    ],
    data,
  });

  const transaction = new Transaction().add(instruction);

  console.log('\nSending transaction...');

  try {
    const signature = await sendAndConfirmTransaction(connection, transaction, [admin], {
      commitment: 'confirmed',
    });

    console.log('\nSuccess!');
    console.log('Signature:', signature);
    console.log('Explorer: https://explorer.solana.com/tx/' + signature + '?cluster=devnet');
  } catch (error) {
    console.error('\nError:', error);
    throw error;
  }
}

main().catch(console.error);
