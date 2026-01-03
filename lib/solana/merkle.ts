import { MerkleTree } from 'merkletreejs';
import { keccak256 } from 'js-sha3';
import { getAddressEncoder, type Address } from '@solana/kit';

const encoder = getAddressEncoder();

// Domain separator - MUST match contract's LEAF_DOMAIN
const LEAF_DOMAIN = new Uint8Array([
  89,
  65,
  80,
  95,
  67,
  76,
  65,
  73,
  77,
  95,
  86,
  49, // "YAP_CLAIM_V1"
]);

export interface RewardEntry {
  wallet: Address;
  amount: bigint;
}

export interface MerkleDistribution {
  root: Uint8Array;
  tree: MerkleTree;
  entries: RewardEntry[];
}

export interface ClaimProof {
  wallet: Address;
  amount: bigint;
  proof: Uint8Array[];
}

// Keccak256 hash function
function keccak256Hash(data: Uint8Array): Uint8Array {
  return new Uint8Array(keccak256.arrayBuffer(data));
}

// Hash a leaf node: keccak256(domain || wallet || amount)
// MUST match contract's compute_leaf function
export function hashLeaf(wallet: Address, amount: bigint): Uint8Array {
  const walletBytes = encoder.encode(wallet);

  // Amount as little-endian u64
  const amountBytes = new Uint8Array(8);
  const view = new DataView(amountBytes.buffer);
  view.setBigUint64(0, amount, true); // true = little-endian

  // Combine: domain (12) + wallet (32) + amount (8) = 52 bytes
  const combined = new Uint8Array(LEAF_DOMAIN.length + walletBytes.length + amountBytes.length);
  combined.set(LEAF_DOMAIN, 0);
  combined.set(walletBytes, LEAF_DOMAIN.length);
  combined.set(amountBytes, LEAF_DOMAIN.length + walletBytes.length);

  return keccak256Hash(combined);
}

// Build merkle tree from reward entries
export function buildMerkleTree(entries: RewardEntry[]): MerkleDistribution {
  if (entries.length === 0) {
    throw new Error('Cannot build tree with no entries');
  }

  const leaves = entries.map((e) => hashLeaf(e.wallet, e.amount));

  // Use keccak256 for internal nodes, sortPairs for consistent ordering
  const tree = new MerkleTree(leaves, (data: Uint8Array) => keccak256Hash(data), {
    sortPairs: true,
  });

  return {
    root: new Uint8Array(tree.getRoot()),
    tree,
    entries,
  };
}

// Get proof for a specific wallet
export function getProof(distribution: MerkleDistribution, wallet: Address): ClaimProof | null {
  const entry = distribution.entries.find((e) => e.wallet === wallet);
  if (!entry) return null;

  const leaf = hashLeaf(wallet, entry.amount);
  const proof = distribution.tree.getProof(Buffer.from(leaf)).map((p) => new Uint8Array(p.data));

  return {
    wallet,
    amount: entry.amount,
    proof,
  };
}

// Verify a proof locally (for testing)
export function verifyProof(
  root: Uint8Array,
  wallet: Address,
  amount: bigint,
  proof: Uint8Array[]
): boolean {
  const leaf = hashLeaf(wallet, amount);
  const tree = new MerkleTree([], (data: Uint8Array) => keccak256Hash(data), {
    sortPairs: true,
  });

  return tree.verify(
    proof.map((p) => Buffer.from(p)),
    Buffer.from(leaf),
    Buffer.from(root)
  );
}

// Generate distribution from database rewards
export async function generateDistribution(
  getRewards: () => Promise<{ wallet: Address; points: number }[]>
): Promise<MerkleDistribution> {
  const rewards = await getRewards();

  const entries: RewardEntry[] = rewards
    .filter((r) => r.points > 0) // Skip zero-point entries
    .map((r) => ({
      wallet: r.wallet,
      amount: BigInt(r.points) * BigInt(1e9), // 1 point = 1 token (9 decimals)
    }));

  if (entries.length === 0) {
    throw new Error('No rewards to distribute');
  }

  return buildMerkleTree(entries);
}

// Export distribution data for storage
export function exportDistribution(distribution: MerkleDistribution): {
  root: string;
  entries: { wallet: string; amount: string }[];
} {
  return {
    root: Buffer.from(distribution.root).toString('hex'),
    entries: distribution.entries.map((e) => ({
      wallet: e.wallet,
      amount: e.amount.toString(),
    })),
  };
}

// Import distribution data from storage
export function importDistribution(data: {
  root: string;
  entries: { wallet: Address; amount: string }[];
}): MerkleDistribution {
  const entries: RewardEntry[] = data.entries.map((e) => ({
    wallet: e.wallet,
    amount: BigInt(e.amount),
  }));

  const distribution = buildMerkleTree(entries);

  const expectedRoot = Buffer.from(data.root, 'hex');
  if (!Buffer.from(distribution.root).equals(expectedRoot)) {
    throw new Error('Merkle root mismatch - data may be corrupted');
  }

  return distribution;
}
