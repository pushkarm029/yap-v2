#!/usr/bin/env bun
import {
  Connection,
  PublicKey,
  Transaction,
  Keypair,
  SystemProgram,
  SYSVAR_RENT_PUBKEY,
} from '@solana/web3.js';
import {
  TOKEN_PROGRAM_ID,
  getAssociatedTokenAddress,
  createAssociatedTokenAccountInstruction,
} from '@solana/spl-token';
import * as fs from 'fs';
import { db } from '../lib/database';

const PROGRAM_ID = new PublicKey('3WFzJo73trsB8vd6W7EsN31Szc5ybT8mGArP7SCLCk63');
const CONFIG_SEED = Buffer.from('config');
const MINT_SEED = Buffer.from('mint');
const VAULT_SEED = Buffer.from('vault');
const USER_CLAIM_SEED = Buffer.from('user_claim');

async function testClaim() {
  const connection = new Connection('https://api.devnet.solana.com', 'confirmed');

  // Load keypair for simulation
  const keypairData = JSON.parse(
    fs.readFileSync(process.env.HOME + '/.config/solana/id.json', 'utf-8')
  );
  const payer = Keypair.fromSecretKey(Uint8Array.from(keypairData));

  // User wallet to claim for
  const userWallet = new PublicKey('7zVkXGnfCFLUjGpNzt5SSy9a7YfAyvobVxRHbQNzuTkw');

  console.log('User wallet:', userWallet.toBase58());

  // Get claim proof from API/DB
  const claimable = await db.getClaimableRewardByWallet(userWallet.toBase58());
  if (!claimable) {
    console.log('No claimable reward found');
    return;
  }

  console.log('Claimable reward:', claimable.amount);

  // Get all rewards for this distribution to build merkle tree
  const allRewards = await db.getDistributionRewards(claimable.distribution_id);
  console.log('Distribution has', allRewards.length, 'rewards');

  // Import merkle functions
  const { buildMerkleTree, getProof } = await import('../lib/solana/merkle');
  const { address } = await import('@solana/kit');
  type RewardEntry = { wallet: ReturnType<typeof address>; amount: bigint };

  const entries: RewardEntry[] = allRewards.map((r) => ({
    wallet: address(r.wallet_address),
    amount: BigInt(r.amount),
  }));

  const distribution = buildMerkleTree(entries);
  const proof = getProof(distribution, address(userWallet.toBase58()));

  if (!proof) {
    console.log('Could not generate proof for user');
    return;
  }

  console.log('Proof elements:', proof.proof.length);
  console.log('Amount:', proof.amount.toString());
  console.log('Merkle root:', Buffer.from(distribution.root).toString('hex'));

  // Derive PDAs
  const [configPda] = PublicKey.findProgramAddressSync([CONFIG_SEED], PROGRAM_ID);
  const [mintPda] = PublicKey.findProgramAddressSync([MINT_SEED], PROGRAM_ID);
  const [vaultPda] = PublicKey.findProgramAddressSync([VAULT_SEED], PROGRAM_ID);
  const [userClaimPda] = PublicKey.findProgramAddressSync(
    [USER_CLAIM_SEED, userWallet.toBuffer()],
    PROGRAM_ID
  );

  console.log('\nPDAs:');
  console.log('  Config:', configPda.toBase58());
  console.log('  Mint:', mintPda.toBase58());
  console.log('  Vault:', vaultPda.toBase58());
  console.log('  UserClaim:', userClaimPda.toBase58());

  // Check if user claim status exists
  const userClaimInfo = await connection.getAccountInfo(userClaimPda);
  console.log('\nUserClaimStatus exists:', !!userClaimInfo);
  if (userClaimInfo) {
    console.log('  Already claimed some amount');
  }

  // Get user ATA
  const userAta = await getAssociatedTokenAddress(mintPda, userWallet);
  console.log('User ATA:', userAta.toBase58());

  const ataInfo = await connection.getAccountInfo(userAta);
  console.log('ATA exists:', !!ataInfo);

  // Build transaction
  const transaction = new Transaction();

  // Create ATA if needed
  if (!ataInfo) {
    console.log('\nWill create ATA first');
    transaction.add(
      createAssociatedTokenAccountInstruction(payer.publicKey, userAta, userWallet, mintPda)
    );
  }

  // Build claim instruction data
  const proofBuffers = proof.proof.map((p) => Buffer.from(p));
  const claimData = buildClaimInstructionData(proof.amount, proofBuffers);
  console.log('\nClaim instruction data length:', claimData.length);
  console.log('  Discriminator:', claimData[0]);
  console.log('  Amount:', claimData.readBigUInt64LE(1).toString());
  console.log('  Proof length:', claimData.readUInt32LE(9));

  transaction.add({
    programId: PROGRAM_ID,
    keys: [
      { pubkey: userWallet, isSigner: true, isWritable: true },
      { pubkey: userAta, isSigner: false, isWritable: true },
      { pubkey: userClaimPda, isSigner: false, isWritable: true },
      { pubkey: configPda, isSigner: false, isWritable: false },
      { pubkey: vaultPda, isSigner: false, isWritable: true },
      { pubkey: mintPda, isSigner: false, isWritable: false },
      { pubkey: TOKEN_PROGRAM_ID, isSigner: false, isWritable: false },
      { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
      { pubkey: SYSVAR_RENT_PUBKEY, isSigner: false, isWritable: false },
    ],
    data: claimData,
  });

  // Simulate
  console.log('\n🔍 Simulating transaction...');
  const { blockhash } = await connection.getLatestBlockhash();
  transaction.recentBlockhash = blockhash;
  transaction.feePayer = userWallet;

  try {
    const result = await connection.simulateTransaction(transaction);
    console.log('\nSimulation result:');
    if (result.value.err) {
      console.log('❌ Error:', JSON.stringify(result.value.err));
    } else {
      console.log('✅ Success!');
    }
    console.log('\nLogs:');
    result.value.logs?.forEach((log) => console.log('  ', log));
  } catch (e) {
    console.log('Simulation error:', e);
  }
}

function buildClaimInstructionData(amount: bigint, proof: Buffer[]): Buffer {
  const size = 1 + 8 + 4 + proof.length * 32;
  const data = Buffer.alloc(size);
  let offset = 0;

  data.writeUInt8(3, offset); // Claim discriminator
  offset += 1;

  data.writeBigUInt64LE(amount, offset);
  offset += 8;

  data.writeUInt32LE(proof.length, offset);
  offset += 4;

  for (const element of proof) {
    element.copy(data, offset);
    offset += 32;
  }

  return data;
}

testClaim().catch(console.error);
