// Shared Solana mocks for testing
import { vi } from 'vitest';

// ============ MOCK CONNECTION ============

/**
 * Create a mock Connection object
 * Use vi.fn() to allow test-specific return values
 */
export function createMockConnection() {
  return {
    getAccountInfo: vi.fn(),
    getMultipleAccountsInfo: vi.fn(),
    sendRawTransaction: vi.fn().mockResolvedValue('mock-tx-signature'),
    confirmTransaction: vi.fn().mockResolvedValue({ value: { err: null } }),
    getLatestBlockhash: vi.fn().mockResolvedValue({
      blockhash: 'mock-blockhash',
      lastValidBlockHeight: 1000,
    }),
    getBalance: vi.fn().mockResolvedValue(1000000000), // 1 SOL
  };
}

// ============ MOCK LIB/SOLANA MODULE ============

/**
 * Mock lib/solana module exports for vi.mock('@/lib/solana', ...)
 */
export const mockSolanaLib = {
  buildMerkleTree: vi.fn(),
  getProof: vi.fn(),
  submitMerkleRoot: vi.fn(),
  getRateLimitedAvailable: vi.fn(),
  getMintPda: vi.fn(),
  getVaultPda: vi.fn(),
  getConfigPda: vi.fn(),
  getRpcEndpoint: vi.fn(),
};

/**
 * Setup default lib/solana mock implementations
 */
export function setupSolanaLibMocks(): void {
  mockSolanaLib.buildMerkleTree.mockReturnValue({
    root: new Uint8Array(32).fill(0xaa),
    tree: [],
    entries: [],
  });

  mockSolanaLib.getProof.mockReturnValue({
    wallet: 'So11111111111111111111111111111111111111112',
    amount: BigInt('10000000000'),
    proof: [new Uint8Array(32).fill(0xbb), new Uint8Array(32).fill(0xcc)],
  });

  mockSolanaLib.submitMerkleRoot.mockResolvedValue('mock-tx-signature');
  mockSolanaLib.getRateLimitedAvailable.mockResolvedValue(BigInt('1000000000000'));

  mockSolanaLib.getMintPda.mockReturnValue([Buffer.alloc(32), 255]);
  mockSolanaLib.getVaultPda.mockReturnValue([Buffer.alloc(32), 254]);
  mockSolanaLib.getConfigPda.mockReturnValue([Buffer.alloc(32), 253]);
  mockSolanaLib.getRpcEndpoint.mockReturnValue('https://api.devnet.solana.com');
}

/**
 * Reset all lib/solana mocks
 */
export function resetSolanaLibMocks(): void {
  Object.values(mockSolanaLib).forEach((mock) => {
    if (typeof mock.mockReset === 'function') {
      mock.mockReset();
    }
  });
}

// ============ MOCK @solana/kit ============

/**
 * Mock address function from @solana/kit
 * Validates format and returns the address
 */
export const mockAddress = vi.fn((addr: string) => {
  if (!addr || addr.length < 32 || addr.length > 44) {
    throw new Error(`Invalid address format: ${addr}`);
  }
  return addr;
});

/**
 * Create mock Config account data for distribute tests
 * Layout matches CONFIG_OFFSETS in distribute.ts (without staking_vault):
 * discriminator(8) + mint(32) + vault(32) + pending_claims(32) +
 * merkle_root(32) + merkle_updater(32) + current_supply(8) +
 * last_inflation_ts(8) + last_distribution_ts(8) + admin(32) +
 * inflation_rate_bps(2) + bump(1) = 227 bytes
 */
export function createMockConfigAccount(options: {
  lastDistributionTs: bigint;
  vaultPubkey?: Buffer;
}): Buffer {
  const buffer = Buffer.alloc(227);

  // Discriminator (8 bytes)
  buffer.writeBigUInt64LE(BigInt(0), 0);

  // Mint (32 bytes at offset 8)
  // vault (32 bytes at offset 40)
  if (options.vaultPubkey) {
    options.vaultPubkey.copy(buffer, 40);
  }

  // pending_claims (32 bytes at offset 72)
  // merkle_root (32 bytes at offset 104)
  // merkle_updater (32 bytes at offset 136)
  // current_supply (8 bytes at offset 168)

  // last_inflation_ts (8 bytes at offset 176)
  buffer.writeBigInt64LE(BigInt(0), 176);

  // last_distribution_ts (8 bytes at offset 184)
  buffer.writeBigInt64LE(options.lastDistributionTs, 184);

  // admin (32 bytes at offset 192)
  // inflation_rate_bps (2 bytes at offset 224)
  // bump (1 byte at offset 226)

  return buffer;
}

/**
 * Create mock SPL token account data
 * Uses standard SPL token AccountLayout (165 bytes)
 */
export function createMockTokenAccount(amount: bigint): Buffer {
  const buffer = Buffer.alloc(165);

  // Mint (32 bytes at offset 0)
  // Owner (32 bytes at offset 32)
  // Amount (8 bytes at offset 64)
  buffer.writeBigUInt64LE(amount, 64);

  // Delegate option (4 bytes at offset 72)
  // State (1 byte at offset 108) - initialized = 1
  buffer[108] = 1;

  // Rest is zero (close authority, etc.)
  return buffer;
}

/**
 * Known test wallet addresses (valid base58 Solana addresses)
 * Using well-known program addresses for deterministic testing
 */
export const TEST_WALLETS = {
  alice: 'TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA' as const,
  bob: 'ATokenGPvbdGVxr1b2hvZbsiqW5xWH25efTNsLJA8knL' as const,
  charlie: 'SysvarRent111111111111111111111111111111111' as const,
};
