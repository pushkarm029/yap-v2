/**
 * Upload YAP Token metadata to Arweave via Irys
 *
 * Prerequisites:
 * 1. Install Irys: bun add @irys/sdk
 * 2. Have SOL in the wallet for upload fees (~0.001 SOL for small files)
 *
 * Usage:
 * bun run contracts/metadata/upload-to-arweave.ts
 */

import Irys from '@irys/sdk';
import fs from 'fs';
import path from 'path';

const WALLET_PATH = process.env.SOLANA_WALLET_PATH || '~/.config/solana/id.json';
const RPC_URL = process.env.SOLANA_RPC_URL || 'https://api.devnet.solana.com';

async function main() {
  console.log('=== YAP Token Metadata Upload to Arweave ===\n');

  // Load wallet
  const walletPath = WALLET_PATH.replace('~', process.env.HOME || '');
  if (!fs.existsSync(walletPath)) {
    console.error(`Wallet not found at: ${walletPath}`);
    console.error('Set SOLANA_WALLET_PATH environment variable or use default path');
    process.exit(1);
  }

  const wallet = JSON.parse(fs.readFileSync(walletPath, 'utf-8'));
  console.log('Wallet loaded');

  // Initialize Irys
  // Note: Use "mainnet" for permanent storage (requires ~0.01 SOL in wallet)
  // Devnet uploads are temporary and may expire
  const network = process.env.ARWEAVE_NETWORK || 'devnet';
  const irys = new Irys({
    network,
    token: 'solana',
    key: wallet,
    config: {
      providerUrl: network === 'mainnet' ? 'https://api.mainnet-beta.solana.com' : RPC_URL,
    },
  });

  // Check balance
  const balance = await irys.getLoadedBalance();
  console.log(`Irys balance: ${irys.utils.fromAtomic(balance)} SOL`);

  // Fund if needed (for devnet, uploads are free but we check anyway)
  if (balance.toNumber() === 0) {
    console.log('\nFunding Irys node (devnet is free)...');
    try {
      await irys.fund(irys.utils.toAtomic(0.001));
      console.log('Funded successfully');
    } catch (e) {
      console.log('Funding not required for devnet');
    }
  }

  // Step 1: Upload image
  console.log('\n--- Step 1: Uploading image ---');
  const imagePath = path.join(__dirname, '../../public/logo.png');

  if (!fs.existsSync(imagePath)) {
    console.error(`Image not found at: ${imagePath}`);
    process.exit(1);
  }

  const imageData = fs.readFileSync(imagePath);
  const imageTags = [{ name: 'Content-Type', value: 'image/png' }];

  console.log(`Uploading: ${imagePath} (${(imageData.length / 1024).toFixed(1)} KB)`);

  const imageReceipt = await irys.upload(imageData, { tags: imageTags });
  const imageUri = `https://arweave.net/${imageReceipt.id}`;

  console.log(`Image uploaded!`);
  console.log(`Image URI: ${imageUri}`);

  // Step 2: Create and upload metadata JSON
  console.log('\n--- Step 2: Uploading metadata JSON ---');

  const metadata = {
    name: 'YAP Token',
    symbol: 'YAP',
    description:
      'YAP Network engagement rewards token. Earn through social engagement, claim via merkle proofs.',
    image: imageUri,
  };

  const metadataJson = JSON.stringify(metadata, null, 2);
  const metadataTags = [{ name: 'Content-Type', value: 'application/json' }];

  console.log('Metadata:');
  console.log(metadataJson);

  const metadataReceipt = await irys.upload(metadataJson, { tags: metadataTags });
  const metadataUri = `https://arweave.net/${metadataReceipt.id}`;

  console.log(`\nMetadata uploaded!`);
  console.log(`Metadata URI: ${metadataUri}`);

  // Summary
  console.log('\n=== Upload Complete ===');
  console.log(`\nImage URI:    ${imageUri}`);
  console.log(`Metadata URI: ${metadataUri}`);
  console.log(`\nUpdate contracts/programs/yap/src/state.rs with:`);
  console.log(`pub const TOKEN_URI: &str = "${metadataUri}";`);

  // Save URIs to file for reference
  const outputPath = path.join(__dirname, 'arweave-uris.json');
  fs.writeFileSync(
    outputPath,
    JSON.stringify(
      {
        imageUri,
        metadataUri,
        uploadedAt: new Date().toISOString(),
      },
      null,
      2
    )
  );
  console.log(`\nURIs saved to: ${outputPath}`);
}

main().catch((err) => {
  console.error('Upload failed:', err);
  process.exit(1);
});
