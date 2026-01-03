use borsh::{BorshDeserialize, BorshSerialize};
use solana_program::pubkey::Pubkey;

/// Account discriminators for safety
pub const CONFIG_DISCRIMINATOR: [u8; 8] = *b"yapconfg";
pub const USER_CLAIM_DISCRIMINATOR: [u8; 8] = *b"yapclaim";

/// Global configuration account (1 per program)
/// PDA seeds: ["config"]
#[derive(BorshSerialize, BorshDeserialize, Debug, Clone)]
pub struct Config {
    /// Discriminator for account type safety
    pub discriminator: [u8; 8],
    /// YAP token mint address
    pub mint: Pubkey,
    /// Vault holding undistributed tokens
    pub vault: Pubkey,
    /// Pending claims account holding distributed-but-unclaimed tokens
    pub pending_claims: Pubkey,
    /// Current merkle root for distribution
    pub merkle_root: [u8; 32],
    /// Authorized merkle root updater
    pub merkle_updater: Pubkey,
    /// Current total supply
    pub current_supply: u64,
    /// Last inflation timestamp
    pub last_inflation_ts: i64,
    /// Last distribution timestamp
    pub last_distribution_ts: i64,
    /// Admin (devnet only, set to system program for mainnet)
    pub admin: Pubkey,
    /// Annual inflation rate in basis points (0-10000, e.g., 1000 = 10%)
    pub inflation_rate_bps: u16,
    /// PDA bump seed
    pub bump: u8,
}

impl Config {
    pub const LEN: usize = 8      // discriminator
        + 32     // mint
        + 32     // vault
        + 32     // pending_claims
        + 32     // merkle_root
        + 32     // merkle_updater
        + 8      // current_supply
        + 8      // last_inflation_ts
        + 8      // last_distribution_ts
        + 32     // admin
        + 2      // inflation_rate_bps
        + 1; // bump

    pub const MAX_INFLATION_BPS: u16 = 10000; // 100%

    pub const SEED: &'static [u8] = b"config";

    pub fn is_valid(&self) -> bool {
        self.discriminator == CONFIG_DISCRIMINATOR
    }
}

/// Per-user claim status account
/// PDA seeds: ["user_claim", user_wallet]
#[derive(BorshSerialize, BorshDeserialize, Debug, Clone)]
pub struct UserClaimStatus {
    /// Discriminator for account type safety
    pub discriminator: [u8; 8],
    /// Cumulative amount claimed
    pub claimed_amount: u64,
    /// Lifetime tokens burned
    pub total_burned: u64,
    /// PDA bump seed
    pub bump: u8,
}

impl UserClaimStatus {
    pub const LEN: usize = 8      // discriminator
        + 8      // claimed_amount
        + 8      // total_burned
        + 1; // bump

    pub const SEED: &'static [u8] = b"user_claim";

    pub fn is_valid(&self) -> bool {
        self.discriminator == USER_CLAIM_DISCRIMINATOR
    }
}

// Tokenomics constants
pub const DECIMALS: u8 = 9;
pub const INITIAL_SUPPLY: u64 = 1_000_000_000 * 10u64.pow(DECIMALS as u32); // 1B tokens
pub const SECONDS_PER_YEAR: i64 = 365 * 24 * 60 * 60; // 31,536,000 seconds
pub const MAX_PROOF_DEPTH: usize = 32; // Supports up to 2^32 = 4B users

// PDA seeds
pub const MINT_SEED: &[u8] = b"mint";
pub const VAULT_SEED: &[u8] = b"vault";
pub const PENDING_CLAIMS_SEED: &[u8] = b"pending_claims";

// Associated Token Program ID: ATokenGPvbdGVxr1b2hvZbsiqW5xWH25efTNsLJA8knL
pub const ASSOCIATED_TOKEN_PROGRAM_ID: Pubkey = Pubkey::new_from_array([
    140, 151, 37, 143, 78, 36, 137, 241, 187, 61, 16, 41, 20, 142, 13, 131, 11, 90, 19, 153, 218,
    255, 16, 132, 4, 142, 123, 216, 219, 233, 248, 89,
]);

// Metaplex Token Metadata Program ID: metaqbxxUerdq28cj1RbAWkYQm3ybzjb6a8bt518x1s
pub const METADATA_PROGRAM_ID: Pubkey = Pubkey::new_from_array([
    11, 112, 101, 177, 227, 209, 124, 69, 56, 157, 82, 127, 107, 4, 195, 205,
    88, 184, 108, 115, 26, 160, 253, 181, 73, 182, 209, 188, 3, 248, 41, 70,
]);

// Token metadata constants (Metaplex limits: name=32, symbol=10, uri=200)
pub const TOKEN_NAME: &str = "YAP Token";
pub const TOKEN_SYMBOL: &str = "YAP";
pub const TOKEN_URI: &str = "https://gist.githubusercontent.com/pushkarm029/ce82baabdda37b1aaa17b3177b3805e8/raw/yap-metadata.json";

// Compile-time assertions for Metaplex metadata field limits
const _: () = assert!(TOKEN_NAME.len() <= 32, "TOKEN_NAME exceeds Metaplex 32-byte limit");
const _: () = assert!(TOKEN_SYMBOL.len() <= 10, "TOKEN_SYMBOL exceeds Metaplex 10-byte limit");
const _: () = assert!(TOKEN_URI.len() <= 200, "TOKEN_URI exceeds Metaplex 200-byte limit");

// Metadata PDA seed (used by Metaplex)
pub const METADATA_SEED: &[u8] = b"metadata";
