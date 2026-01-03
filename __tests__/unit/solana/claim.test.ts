import { describe, it, expect } from 'vitest';
import { PublicKey } from '@solana/web3.js';
import {
  YAP_PROGRAM_ID,
  YAP_DECIMALS,
  formatTokenAmount,
  parseTokenAmount,
  buildClaimInstructionData,
  getConfigPda,
  getMintPda,
  getVaultPda,
  getUserClaimPda,
  getPendingClaimsPda,
} from '@/lib/solana/claim';

// Helper to create raw token amounts
const YAP = (amount: number) => BigInt(Math.floor(amount * 1e9));

describe('claim.ts', () => {
  // ============================================================
  // formatTokenAmount tests - CRITICAL for display
  // ============================================================
  describe('formatTokenAmount', () => {
    it('formats 0n as "0"', () => {
      expect(formatTokenAmount(BigInt(0))).toBe('0');
    });

    it('formats smallest unit correctly', () => {
      // 1 raw unit = 0.000000001 YAP
      const result = formatTokenAmount(BigInt(1));
      expect(result).toBe('0.000000001');
    });

    it('formats 1 YAP (1e9 raw) as "1"', () => {
      const oneYap = BigInt(1_000_000_000);
      expect(formatTokenAmount(oneYap)).toBe('1');
    });

    it('formats 1.5 YAP correctly', () => {
      const amount = BigInt(1_500_000_000);
      expect(formatTokenAmount(amount)).toBe('1.5');
    });

    it('removes trailing zeros', () => {
      const amount = BigInt(1_100_000_000); // 1.1 YAP
      const result = formatTokenAmount(amount);
      expect(result).toBe('1.1');
      expect(result).not.toContain('1.100000000');
    });

    it('adds locale commas to large numbers', () => {
      const largeAmount = BigInt(1_234_567_000_000_000); // 1,234,567 YAP
      const result = formatTokenAmount(largeAmount);
      expect(result).toContain('1,234,567');
    });

    it('handles max supply (1 billion YAP)', () => {
      const maxSupply = BigInt(1_000_000_000) * BigInt(1_000_000_000);
      const result = formatTokenAmount(maxSupply);
      expect(result).toBe('1,000,000,000');
    });
  });

  // ============================================================
  // parseTokenAmount tests - CRITICAL for input
  // ============================================================
  describe('parseTokenAmount', () => {
    it('parses "1" to 1e9 raw units', () => {
      const result = parseTokenAmount('1');
      expect(result).toBe(BigInt(1_000_000_000));
    });

    it('parses "0.5" to 0.5e9 raw units', () => {
      const result = parseTokenAmount('0.5');
      expect(result).toBe(BigInt(500_000_000));
    });

    it('parses "1,000.5" correctly (handles commas)', () => {
      const result = parseTokenAmount('1,000.5');
      expect(result).toBe(BigInt(1_000_500_000_000));
    });

    it('clamps decimals to 9 places', () => {
      // Input with 12 decimal places should truncate
      const result = parseTokenAmount('1.123456789012');
      expect(result).toBe(BigInt(1_123_456_789));
    });

    it('parses whole number with no decimals', () => {
      const result = parseTokenAmount('100');
      expect(result).toBe(BigInt(100_000_000_000));
    });

    it('parses "0" correctly', () => {
      const result = parseTokenAmount('0');
      expect(result).toBe(BigInt(0));
    });
  });

  // ============================================================
  // formatTokenAmount/parseTokenAmount roundtrip
  // ============================================================
  describe('formatTokenAmount/parseTokenAmount roundtrip', () => {
    const testAmounts = [
      BigInt(0),
      BigInt(1),
      BigInt(1_000_000_000), // 1 YAP
      BigInt(1_500_000_000), // 1.5 YAP
      BigInt(123_456_789),
      BigInt(1_000_000_000_000_000), // 1M YAP
    ];

    testAmounts.forEach((amount) => {
      it(`roundtrips ${amount} correctly`, () => {
        const formatted = formatTokenAmount(amount);
        const parsed = parseTokenAmount(formatted);
        expect(parsed).toBe(amount);
      });
    });
  });

  // ============================================================
  // PDA derivation tests - MUST be deterministic
  // ============================================================
  describe('PDA derivations', () => {
    describe('getConfigPda', () => {
      it('returns deterministic result', () => {
        const [pda1, bump1] = getConfigPda();
        const [pda2, bump2] = getConfigPda();

        expect(pda1.equals(pda2)).toBe(true);
        expect(bump1).toBe(bump2);
      });

      it('returns valid PublicKey', () => {
        const [pda] = getConfigPda();
        expect(pda).toBeInstanceOf(PublicKey);
      });
    });

    describe('getMintPda', () => {
      it('returns deterministic result', () => {
        const [pda1] = getMintPda();
        const [pda2] = getMintPda();

        expect(pda1.equals(pda2)).toBe(true);
      });

      it('differs from config PDA', () => {
        const [configPda] = getConfigPda();
        const [mintPda] = getMintPda();

        expect(configPda.equals(mintPda)).toBe(false);
      });
    });

    describe('getVaultPda', () => {
      it('returns deterministic result', () => {
        const [pda1] = getVaultPda();
        const [pda2] = getVaultPda();

        expect(pda1.equals(pda2)).toBe(true);
      });
    });

    describe('getUserClaimPda', () => {
      // Valid Solana public keys (well-known program addresses)
      const user1 = new PublicKey('TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA');
      const user2 = new PublicKey('ATokenGPvbdGVxr1b2hvZbsiqW5xWH25efTNsLJA8knL');

      it('returns different PDAs for different users', () => {
        const [pda1] = getUserClaimPda(user1);
        const [pda2] = getUserClaimPda(user2);

        expect(pda1.equals(pda2)).toBe(false);
      });

      it('returns same PDA for same user', () => {
        const [pda1] = getUserClaimPda(user1);
        const [pda2] = getUserClaimPda(user1);

        expect(pda1.equals(pda2)).toBe(true);
      });
    });

    describe('getPendingClaimsPda', () => {
      it('returns deterministic result', () => {
        const [pda1] = getPendingClaimsPda();
        const [pda2] = getPendingClaimsPda();

        expect(pda1.equals(pda2)).toBe(true);
      });
    });
  });

  // ============================================================
  // buildClaimInstructionData tests
  // ============================================================
  describe('buildClaimInstructionData', () => {
    it('creates correct buffer size', () => {
      const proof = [Buffer.alloc(32), Buffer.alloc(32)];
      const data = buildClaimInstructionData(YAP(100), proof);

      // 1 (discriminator) + 8 (amount) + 4 (proof_len) + 64 (2 × 32 proof elements)
      expect(data.length).toBe(1 + 8 + 4 + 64);
    });

    it('sets discriminator to 3 (Claim)', () => {
      const data = buildClaimInstructionData(YAP(100), []);

      expect(data[0]).toBe(3);
    });

    it('encodes amount as little-endian u64', () => {
      const amount = YAP(12345);
      const data = buildClaimInstructionData(amount, []);

      const encodedAmount = data.readBigUInt64LE(1);
      expect(encodedAmount).toBe(amount);
    });

    it('encodes proof length correctly', () => {
      const proof = [Buffer.alloc(32), Buffer.alloc(32), Buffer.alloc(32)];
      const data = buildClaimInstructionData(YAP(100), proof);

      // Proof length at offset 9 (1 + 8)
      const proofLen = data.readUInt32LE(9);
      expect(proofLen).toBe(3);
    });

    it('handles empty proof', () => {
      const data = buildClaimInstructionData(YAP(100), []);

      expect(data.length).toBe(1 + 8 + 4); // No proof elements
      expect(data.readUInt32LE(9)).toBe(0);
    });

    it('copies proof elements correctly', () => {
      const proofElement = Buffer.alloc(32);
      proofElement.fill(0xab);

      const data = buildClaimInstructionData(YAP(100), [proofElement]);

      // Proof element at offset 13 (1 + 8 + 4)
      const copiedProof = data.slice(13, 45);
      expect(copiedProof.equals(proofElement)).toBe(true);
    });
  });

  // ============================================================
  // Constants tests
  // ============================================================
  describe('constants', () => {
    it('YAP_DECIMALS is 9', () => {
      expect(YAP_DECIMALS).toBe(9);
    });

    it('YAP_PROGRAM_ID is valid PublicKey', () => {
      expect(YAP_PROGRAM_ID).toBeInstanceOf(PublicKey);
    });
  });
});
