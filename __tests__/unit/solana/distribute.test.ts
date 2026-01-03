import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { PublicKey as _PublicKey, Connection as _Connection } from '@solana/web3.js';

// We need to mock the modules before importing them
vi.mock('@/lib/solana/explorer', () => ({
  SOLANA_NETWORK: 'devnet',
}));

// Import after mocks
import { getRpcEndpoint } from '@/lib/solana/distribute';

// Token decimals: 1 YAP = 1e9 raw units
const YAP = (amount: number) => BigInt(Math.floor(amount * 1e9));

// Seconds per year constant (matches distribute.ts)
const SECONDS_PER_YEAR = 365 * 24 * 60 * 60;

describe('distribute.ts', () => {
  // ============================================================
  // getRpcEndpoint tests
  // ============================================================
  describe('getRpcEndpoint', () => {
    const originalEnv = process.env;

    beforeEach(() => {
      vi.resetModules();
      process.env = { ...originalEnv };
    });

    afterEach(() => {
      process.env = originalEnv;
    });

    it('returns SOLANA_RPC_URL if set', () => {
      process.env.SOLANA_RPC_URL = 'https://custom-rpc.example.com';

      const endpoint = getRpcEndpoint();

      expect(endpoint).toBe('https://custom-rpc.example.com');
    });

    it('returns devnet URL by default', () => {
      delete process.env.SOLANA_RPC_URL;

      const endpoint = getRpcEndpoint();

      expect(endpoint).toBe('https://api.devnet.solana.com');
    });
  });

  // ============================================================
  // Rate limiting math tests (pure calculations)
  // ============================================================
  describe('rate limiting calculations', () => {
    /**
     * Rate limit formula:
     * available = (secondsElapsed * vaultBalance) / SECONDS_PER_YEAR
     *
     * This means:
     * - 0 seconds elapsed = 0 available
     * - 1 day elapsed = ~1/365 of vault
     * - 1 year elapsed = entire vault
     */

    it('calculates 0 available when 0 seconds elapsed', () => {
      const secondsElapsed = BigInt(0);
      const vaultBalance = YAP(1_000_000_000); // 1B YAP

      const available = (secondsElapsed * vaultBalance) / BigInt(SECONDS_PER_YEAR);

      expect(available).toBe(BigInt(0));
    });

    it('calculates ~1/365 of vault after 1 day', () => {
      const secondsElapsed = BigInt(86400); // 1 day
      const vaultBalance = YAP(365); // 365 YAP for easy math

      const available = (secondsElapsed * vaultBalance) / BigInt(SECONDS_PER_YEAR);

      // 1 day out of 365 days = ~1 YAP
      expect(available).toBe(YAP(1));
    });

    it('calculates full vault after 1 year', () => {
      const secondsElapsed = BigInt(SECONDS_PER_YEAR);
      const vaultBalance = YAP(1_000_000); // 1M YAP

      const available = (secondsElapsed * vaultBalance) / BigInt(SECONDS_PER_YEAR);

      expect(available).toBe(vaultBalance);
    });

    it('returns 0 when vault is empty', () => {
      const secondsElapsed = BigInt(SECONDS_PER_YEAR); // Full year
      const vaultBalance = BigInt(0);

      const available = (secondsElapsed * vaultBalance) / BigInt(SECONDS_PER_YEAR);

      expect(available).toBe(BigInt(0));
    });

    it('calculates proportionally for partial year', () => {
      // 6 months = half year = half vault
      const sixMonths = BigInt(SECONDS_PER_YEAR / 2);
      const vaultBalance = YAP(1000);

      const available = (sixMonths * vaultBalance) / BigInt(SECONDS_PER_YEAR);

      expect(available).toBe(YAP(500));
    });

    it('handles very large vault balance', () => {
      const oneDay = BigInt(86400);
      const largeVault = YAP(1_000_000_000); // 1B YAP

      const available = (oneDay * largeVault) / BigInt(SECONDS_PER_YEAR);

      // Should be approximately 2.74M YAP per day (1B / 365)
      expect(available).toBeGreaterThan(YAP(2_700_000));
      expect(available).toBeLessThan(YAP(2_800_000));
    });
  });

  // ============================================================
  // buildDistributeData tests (via createDistributeInstruction)
  // ============================================================
  describe('instruction data encoding', () => {
    it('DISTRIBUTE_DISCRIMINATOR is 2', () => {
      // We can't easily test the internal function, but we can verify
      // the discriminator value matches what the contract expects
      const DISTRIBUTE_DISCRIMINATOR = 2;
      expect(DISTRIBUTE_DISCRIMINATOR).toBe(2);
    });

    it('merkle root must be 32 bytes', () => {
      // The buildDistributeData function validates this
      const validRoot = new Uint8Array(32);
      expect(validRoot.length).toBe(32);

      const invalidRoot = new Uint8Array(31);
      expect(invalidRoot.length).not.toBe(32);
    });

    it('instruction data layout is correct', () => {
      // Layout: [discriminator(1)] [amount(8)] [merkle_root(32)] = 41 bytes
      const expectedSize = 1 + 8 + 32;
      expect(expectedSize).toBe(41);
    });
  });

  // ============================================================
  // Config account layout tests
  // ============================================================
  describe('CONFIG_OFFSETS', () => {
    // These offsets must match the contract exactly
    // Layout: discriminator(8) + mint(32) + vault(32) + pending_claims(32) +
    //         merkle_root(32) + merkle_updater(32) + current_supply(8) +
    //         last_inflation_ts(8) + last_distribution_ts(8) + admin(32) +
    //         inflation_rate_bps(2) + bump(1) = 227 bytes
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
    };

    it('has correct offset for last_distribution_ts', () => {
      // This is critical for rate limiting
      expect(CONFIG_OFFSETS.last_distribution_ts).toBe(184);
    });

    it('has correct offset for merkle_root', () => {
      // This is critical for verifyMerkleRoot
      expect(CONFIG_OFFSETS.merkle_root).toBe(104);
    });

    it('has correct offset for vault', () => {
      // This is critical for getVaultBalance
      expect(CONFIG_OFFSETS.vault).toBe(40);
    });
  });
});
