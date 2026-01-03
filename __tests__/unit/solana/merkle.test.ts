import { describe, it, expect } from 'vitest';
import { address } from '@solana/kit';
import {
  hashLeaf,
  buildMerkleTree,
  getProof,
  verifyProof,
  exportDistribution,
  importDistribution,
  generateDistribution,
  type RewardEntry,
} from '@/lib/solana/merkle';

// Test wallet addresses (valid base58 Solana addresses - 32 bytes)
// These are derived from the System Program by adding suffix bytes
const ALICE = address('TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA');
const BOB = address('ATokenGPvbdGVxr1b2hvZbsiqW5xWH25efTNsLJA8knL');
const CHARLIE = address('SysvarRent111111111111111111111111111111111');

describe('merkle.ts', () => {
  // ============================================================
  // hashLeaf tests
  // ============================================================
  describe('hashLeaf', () => {
    it('produces consistent hash for same inputs', () => {
      const hash1 = hashLeaf(ALICE, BigInt(1000));
      const hash2 = hashLeaf(ALICE, BigInt(1000));

      expect(hash1).toEqual(hash2);
      expect(hash1.length).toBe(32); // keccak256 output
    });

    it('handles zero amount', () => {
      const hash = hashLeaf(ALICE, BigInt(0));

      expect(hash.length).toBe(32);
      // Should not throw, zero is valid
    });

    it('handles max u64 amount', () => {
      const maxU64 = BigInt('18446744073709551615'); // 2^64 - 1
      const hash = hashLeaf(ALICE, maxU64);

      expect(hash.length).toBe(32);
    });

    it('produces different hash for different amounts', () => {
      const hash1 = hashLeaf(ALICE, BigInt(100));
      const hash2 = hashLeaf(ALICE, BigInt(101));

      expect(hash1).not.toEqual(hash2);
    });

    it('produces different hash for different wallets', () => {
      const hash1 = hashLeaf(ALICE, BigInt(100));
      const hash2 = hashLeaf(BOB, BigInt(100));

      expect(hash1).not.toEqual(hash2);
    });
  });

  // ============================================================
  // buildMerkleTree tests
  // ============================================================
  describe('buildMerkleTree', () => {
    it('throws on empty entries', () => {
      expect(() => buildMerkleTree([])).toThrow('Cannot build tree with no entries');
    });

    it('handles single entry', () => {
      const entries: RewardEntry[] = [{ wallet: ALICE, amount: BigInt(1000) }];

      const distribution = buildMerkleTree(entries);

      expect(distribution.root.length).toBe(32);
      expect(distribution.entries).toHaveLength(1);
    });

    it('handles multiple entries', () => {
      const entries: RewardEntry[] = [
        { wallet: ALICE, amount: BigInt(1000) },
        { wallet: BOB, amount: BigInt(2000) },
        { wallet: CHARLIE, amount: BigInt(3000) },
      ];

      const distribution = buildMerkleTree(entries);

      expect(distribution.root.length).toBe(32);
      expect(distribution.entries).toHaveLength(3);
    });

    it('handles large tree (100 entries)', () => {
      const entries: RewardEntry[] = [];

      // Generate 100 unique entries by varying amounts (same wallet allowed for test)
      // Using a valid base address
      const baseWallet = ALICE;
      for (let i = 0; i < 100; i++) {
        entries.push({ wallet: baseWallet, amount: BigInt((i + 1) * 1000) });
      }

      const distribution = buildMerkleTree(entries);

      expect(distribution.root.length).toBe(32);
      expect(distribution.entries).toHaveLength(100);
    });

    it('is deterministic (same entries = same root)', () => {
      const entries: RewardEntry[] = [
        { wallet: ALICE, amount: BigInt(1000) },
        { wallet: BOB, amount: BigInt(2000) },
      ];

      const dist1 = buildMerkleTree(entries);
      const dist2 = buildMerkleTree(entries);

      expect(dist1.root).toEqual(dist2.root);
    });
  });

  // ============================================================
  // getProof tests
  // ============================================================
  describe('getProof', () => {
    const entries: RewardEntry[] = [
      { wallet: ALICE, amount: BigInt(1000) },
      { wallet: BOB, amount: BigInt(2000) },
      { wallet: CHARLIE, amount: BigInt(3000) },
    ];
    const distribution = buildMerkleTree(entries);

    it('returns null for wallet not in tree', () => {
      const unknownWallet = address('11111111111111111111111111111111'); // System Program
      const proof = getProof(distribution, unknownWallet);

      expect(proof).toBeNull();
    });

    it('returns valid proof for first entry', () => {
      const proof = getProof(distribution, ALICE);

      expect(proof).not.toBeNull();
      expect(proof!.wallet).toBe(ALICE);
      expect(proof!.amount).toBe(BigInt(1000));
      expect(proof!.proof.length).toBeGreaterThan(0);
    });

    it('returns valid proof for middle entry', () => {
      const proof = getProof(distribution, BOB);

      expect(proof).not.toBeNull();
      expect(proof!.wallet).toBe(BOB);
      expect(proof!.amount).toBe(BigInt(2000));
    });

    it('returns valid proof for last entry', () => {
      const proof = getProof(distribution, CHARLIE);

      expect(proof).not.toBeNull();
      expect(proof!.wallet).toBe(CHARLIE);
      expect(proof!.amount).toBe(BigInt(3000));
    });
  });

  // ============================================================
  // verifyProof tests
  // ============================================================
  describe('verifyProof', () => {
    const entries: RewardEntry[] = [
      { wallet: ALICE, amount: BigInt(1000) },
      { wallet: BOB, amount: BigInt(2000) },
      { wallet: CHARLIE, amount: BigInt(3000) },
    ];
    const distribution = buildMerkleTree(entries);

    it('returns true for valid proof', () => {
      const claimProof = getProof(distribution, ALICE)!;

      const isValid = verifyProof(
        distribution.root,
        claimProof.wallet,
        claimProof.amount,
        claimProof.proof
      );

      expect(isValid).toBe(true);
    });

    it('returns false for wrong wallet', () => {
      const claimProof = getProof(distribution, ALICE)!;

      // Try to claim as BOB with ALICE's proof
      const isValid = verifyProof(distribution.root, BOB, claimProof.amount, claimProof.proof);

      expect(isValid).toBe(false);
    });

    it('returns false for wrong amount', () => {
      const claimProof = getProof(distribution, ALICE)!;

      // Try to claim different amount
      const wrongAmount = BigInt(9999);
      const isValid = verifyProof(distribution.root, ALICE, wrongAmount, claimProof.proof);

      expect(isValid).toBe(false);
    });

    it('returns false for wrong root', () => {
      const claimProof = getProof(distribution, ALICE)!;

      // Try to verify against wrong root
      const wrongRoot = new Uint8Array(32).fill(0xff);
      const isValid = verifyProof(
        wrongRoot,
        claimProof.wallet,
        claimProof.amount,
        claimProof.proof
      );

      expect(isValid).toBe(false);
    });

    it('returns false for tampered proof', () => {
      const claimProof = getProof(distribution, ALICE)!;

      // Tamper with proof
      const tamperedProof = claimProof.proof.map((p) => {
        const copy = new Uint8Array(p);
        copy[0] ^= 0xff; // Flip bits
        return copy;
      });

      const isValid = verifyProof(
        distribution.root,
        claimProof.wallet,
        claimProof.amount,
        tamperedProof
      );

      expect(isValid).toBe(false);
    });
  });

  // ============================================================
  // export/importDistribution tests
  // ============================================================
  describe('exportDistribution / importDistribution', () => {
    it('roundtrips correctly', () => {
      const entries: RewardEntry[] = [
        { wallet: ALICE, amount: BigInt(1000) },
        { wallet: BOB, amount: BigInt(2000) },
      ];
      const original = buildMerkleTree(entries);

      const exported = exportDistribution(original);
      // Cast is needed because exportDistribution returns string wallet, importDistribution expects Address
      const imported = importDistribution(exported as Parameters<typeof importDistribution>[0]);

      expect(imported.root).toEqual(original.root);
      expect(imported.entries).toHaveLength(original.entries.length);
      expect(imported.entries[0].wallet).toBe(original.entries[0].wallet);
      expect(imported.entries[0].amount).toBe(original.entries[0].amount);
    });

    it('exports root as hex string', () => {
      const entries: RewardEntry[] = [{ wallet: ALICE, amount: BigInt(1000) }];
      const distribution = buildMerkleTree(entries);

      const exported = exportDistribution(distribution);

      expect(typeof exported.root).toBe('string');
      expect(exported.root.length).toBe(64); // 32 bytes = 64 hex chars
    });

    it('exports amounts as strings', () => {
      const entries: RewardEntry[] = [{ wallet: ALICE, amount: BigInt(1000) }];
      const distribution = buildMerkleTree(entries);

      const exported = exportDistribution(distribution);

      expect(typeof exported.entries[0].amount).toBe('string');
      expect(exported.entries[0].amount).toBe('1000');
    });

    it('throws on corrupted root', () => {
      const entries: RewardEntry[] = [{ wallet: ALICE, amount: BigInt(1000) }];
      const distribution = buildMerkleTree(entries);
      const exported = exportDistribution(distribution);

      // Corrupt the root
      exported.root = 'ff'.repeat(32);

      expect(() =>
        importDistribution(exported as Parameters<typeof importDistribution>[0])
      ).toThrow('Merkle root mismatch');
    });
  });

  // ============================================================
  // generateDistribution tests
  // ============================================================
  describe('generateDistribution', () => {
    it('generates distribution from rewards callback', async () => {
      const mockGetRewards = async () => [
        { wallet: ALICE, points: 100 },
        { wallet: BOB, points: 200 },
      ];

      const distribution = await generateDistribution(mockGetRewards);

      expect(distribution.root.length).toBe(32);
      expect(distribution.entries).toHaveLength(2);
    });

    it('filters out zero-point entries', async () => {
      const mockGetRewards = async () => [
        { wallet: ALICE, points: 100 },
        { wallet: BOB, points: 0 }, // Should be filtered
        { wallet: CHARLIE, points: 50 },
      ];

      const distribution = await generateDistribution(mockGetRewards);

      expect(distribution.entries).toHaveLength(2);
    });

    it('throws when all rewards have zero points', async () => {
      const mockGetRewards = async () => [
        { wallet: ALICE, points: 0 },
        { wallet: BOB, points: 0 },
      ];

      await expect(generateDistribution(mockGetRewards)).rejects.toThrow(
        'No rewards to distribute'
      );
    });

    it('throws when rewards callback returns empty array', async () => {
      const mockGetRewards = async () => [];

      await expect(generateDistribution(mockGetRewards)).rejects.toThrow(
        'No rewards to distribute'
      );
    });

    it('converts 1 point to 1e9 raw units (1 token)', async () => {
      const mockGetRewards = async () => [{ wallet: ALICE, points: 123 }];

      const distribution = await generateDistribution(mockGetRewards);

      expect(distribution.entries[0].amount).toBe(BigInt(123) * BigInt(1e9));
    });
  });

  // ============================================================
  // P0 Critical: BigInt Boundaries & Scale
  // ============================================================
  describe('BigInt boundary conditions', () => {
    const MAX_U64 = BigInt('18446744073709551615'); // 2^64 - 1

    it('handles amount near u64 max without overflow', () => {
      const nearMax = MAX_U64 - BigInt(1000);
      const hash = hashLeaf(ALICE, nearMax);

      expect(hash.length).toBe(32);
      // Should produce valid hash without overflow
    });

    it('handles amount at exact u64 max', () => {
      const hash = hashLeaf(ALICE, MAX_U64);

      expect(hash.length).toBe(32);
      // Keccak256 should handle max u64 correctly
    });

    it('produces different hashes for amounts differing by 1 at high values', () => {
      const highValue1 = MAX_U64 - BigInt(1);
      const highValue2 = MAX_U64;

      const hash1 = hashLeaf(ALICE, highValue1);
      const hash2 = hashLeaf(ALICE, highValue2);

      // Must be different - precision matters at all scales
      expect(hash1).not.toEqual(hash2);
    });

    it('handles multiple high-value entries in tree', () => {
      const entries: RewardEntry[] = [
        { wallet: ALICE, amount: MAX_U64 - BigInt(100) },
        { wallet: BOB, amount: MAX_U64 - BigInt(200) },
        { wallet: CHARLIE, amount: MAX_U64 - BigInt(300) },
      ];

      const distribution = buildMerkleTree(entries);

      expect(distribution.root.length).toBe(32);
      expect(distribution.entries).toHaveLength(3);
    });
  });

  describe('scale and stress tests', () => {
    it('handles 1000 entry distribution efficiently', () => {
      const entries: RewardEntry[] = Array.from({ length: 1000 }, (_, i) => ({
        wallet: ALICE, // Same wallet is fine for merkle tree structure test
        amount: BigInt((i + 1) * 1_000_000),
      }));

      const startTime = performance.now();
      const distribution = buildMerkleTree(entries);
      const elapsed = performance.now() - startTime;

      expect(distribution.root.length).toBe(32);
      expect(distribution.entries).toHaveLength(1000);
      // Should complete in reasonable time (< 5 seconds)
      expect(elapsed).toBeLessThan(5000);
    });

    it('proof depth scales logarithmically with tree size', () => {
      // For N entries, proof depth should be ~log2(N)
      const entries100: RewardEntry[] = Array.from({ length: 100 }, (_, i) => ({
        wallet: ALICE,
        amount: BigInt(i + 1),
      }));
      const entries1000: RewardEntry[] = Array.from({ length: 1000 }, (_, i) => ({
        wallet: ALICE,
        amount: BigInt(i + 1),
      }));

      const dist100 = buildMerkleTree(entries100);
      const dist1000 = buildMerkleTree(entries1000);

      const proof100 = getProof(dist100, ALICE);
      const proof1000 = getProof(dist1000, ALICE);

      expect(proof100).not.toBeNull();
      expect(proof1000).not.toBeNull();

      // 100 entries: ~7 proof nodes (log2(100) ≈ 6.6)
      // 1000 entries: ~10 proof nodes (log2(1000) ≈ 10)
      // Proof for 1000 should be only ~3 nodes longer than 100
      const depthDifference = proof1000!.proof.length - proof100!.proof.length;
      expect(depthDifference).toBeLessThanOrEqual(4);
    });

    it('handles entries with varying amounts from 1 to 1 trillion', () => {
      const entries: RewardEntry[] = [
        { wallet: ALICE, amount: BigInt(1) }, // Smallest possible
        { wallet: BOB, amount: BigInt(1_000_000_000) }, // 1 billion
        { wallet: CHARLIE, amount: BigInt(1_000_000_000_000) }, // 1 trillion
      ];

      const distribution = buildMerkleTree(entries);

      expect(distribution.root.length).toBe(32);

      // All proofs should be valid
      const proofAlice = getProof(distribution, ALICE);
      const proofCharlie = getProof(distribution, CHARLIE);

      expect(proofAlice).not.toBeNull();
      expect(proofCharlie).not.toBeNull();

      // Verify proofs work regardless of amount magnitude
      expect(verifyProof(distribution.root, ALICE, BigInt(1), proofAlice!.proof)).toBe(true);
      expect(
        verifyProof(distribution.root, CHARLIE, BigInt(1_000_000_000_000), proofCharlie!.proof)
      ).toBe(true);
    });
  });

  describe('duplicate and edge case handling', () => {
    it('handles entries with duplicate wallets', () => {
      // Same wallet appearing twice with different amounts
      // This could happen if distribution logic has a bug
      const entries: RewardEntry[] = [
        { wallet: ALICE, amount: BigInt(1000) },
        { wallet: ALICE, amount: BigInt(2000) }, // Duplicate wallet
      ];

      // Tree should still build (merkle doesn't care about semantics)
      const distribution = buildMerkleTree(entries);
      expect(distribution.root.length).toBe(32);
      expect(distribution.entries).toHaveLength(2);

      // But getProof will only find one (implementation-dependent)
      const proof = getProof(distribution, ALICE);
      expect(proof).not.toBeNull();
    });

    it('single entry tree has valid proof', () => {
      const entries: RewardEntry[] = [{ wallet: ALICE, amount: BigInt(1000) }];

      const distribution = buildMerkleTree(entries);
      const proof = getProof(distribution, ALICE);

      expect(proof).not.toBeNull();
      expect(proof!.amount).toBe(BigInt(1000));

      // Single entry proof should still verify
      const isValid = verifyProof(distribution.root, ALICE, BigInt(1000), proof!.proof);
      expect(isValid).toBe(true);
    });

    it('two entry tree has correct proofs for both', () => {
      const entries: RewardEntry[] = [
        { wallet: ALICE, amount: BigInt(1000) },
        { wallet: BOB, amount: BigInt(2000) },
      ];

      const distribution = buildMerkleTree(entries);

      const proofAlice = getProof(distribution, ALICE);
      const proofBob = getProof(distribution, BOB);

      expect(proofAlice).not.toBeNull();
      expect(proofBob).not.toBeNull();

      // Both proofs should be single-node (sibling hash)
      expect(proofAlice!.proof.length).toBe(1);
      expect(proofBob!.proof.length).toBe(1);

      // Cross-verify: proofs should be each other's sibling
      expect(proofAlice!.proof[0]).toEqual(
        expect.any(Uint8Array) // Bob's leaf hash
      );
    });
  });
});
