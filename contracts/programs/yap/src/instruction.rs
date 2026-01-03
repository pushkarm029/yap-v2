use borsh::{BorshDeserialize, BorshSerialize};
use solana_program::pubkey::Pubkey;

#[derive(BorshSerialize, BorshDeserialize, Debug, Clone)]
pub enum YapInstruction {
    /// Initialize the YAP program
    ///
    /// Accounts:
    /// 0. `[signer]` Admin/deployer
    /// 1. `[writable]` Config PDA
    /// 2. `[writable]` Mint PDA
    /// 3. `[writable]` Vault PDA (token account for undistributed tokens)
    /// 4. `[writable]` Pending Claims PDA (token account for distributed tokens)
    /// 5. `[]` System program
    /// 6. `[]` Token program
    /// 7. `[]` Rent sysvar
    Initialize {
        merkle_updater: Pubkey,
        inflation_rate_bps: u16,
    },

    /// Trigger inflation (admin only, pro-rated by time)
    ///
    /// Accounts:
    /// 0. `[signer]` Admin
    /// 1. `[writable]` Config PDA
    /// 2. `[writable]` Mint PDA
    /// 3. `[writable]` Vault PDA
    /// 4. `[]` Token program
    TriggerInflation,

    /// Distribute tokens with daily rate limiting
    ///
    /// Calculates available: vault_balance / days_left
    /// Transfers amount from vault to pending_claims
    /// Sets merkle root for claims
    ///
    /// Accounts:
    /// 0. `[signer]` Merkle updater
    /// 1. `[writable]` Config PDA
    /// 2. `[writable]` Vault token account
    /// 3. `[writable]` Pending claims token account
    /// 4. `[]` Mint
    /// 5. `[]` Token program
    Distribute { amount: u64, merkle_root: [u8; 32] },

    /// Claim tokens using merkle proof
    ///
    /// Accounts:
    /// 0. `[signer]` User claiming
    /// 1. `[writable]` User's token account (ATA)
    /// 2. `[writable]` UserClaimStatus PDA
    /// 3. `[]` Config PDA
    /// 4. `[writable]` Pending claims token account
    /// 5. `[]` Mint PDA
    /// 6. `[]` Token program
    /// 7. `[]` System program
    /// 8. `[]` Rent sysvar
    Claim { amount: u64, proof: Vec<[u8; 32]> },

    /// Burn tokens (deflationary)
    ///
    /// Burns tokens from user's wallet and reduces current_supply.
    /// Phase 1: No per-user tracking (added in Phase 2 for burn rewards)
    ///
    /// Accounts:
    /// 0. `[signer]` Token holder
    /// 1. `[writable]` User's token account (ATA)
    /// 2. `[writable]` Config PDA - to update current_supply
    /// 3. `[writable]` Mint PDA - required for SPL burn
    /// 4. `[]` Token program
    Burn { amount: u64 },

    // === Admin functions (devnet only) ===
    /// Update merkle updater address
    ///
    /// Accounts:
    /// 0. `[signer]` Admin
    /// 1. `[writable]` Config PDA
    UpdateMerkleUpdater { new_updater: Pubkey },

    /// Update inflation rate (admin only)
    ///
    /// Accounts:
    /// 0. `[signer]` Admin
    /// 1. `[writable]` Config PDA
    UpdateInflationRate { new_rate_bps: u16 },
}
