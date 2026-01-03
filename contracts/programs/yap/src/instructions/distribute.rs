use borsh::{BorshDeserialize, BorshSerialize};
use solana_program::{
    account_info::{next_account_info, AccountInfo},
    clock::Clock,
    entrypoint::ProgramResult,
    msg,
    program::invoke_signed,
    program_pack::Pack,
    pubkey::Pubkey,
    sysvar::Sysvar,
};
use spl_token::state::Account as TokenAccount;

use crate::{
    error::YapError,
    state::{Config, DECIMALS, SECONDS_PER_YEAR},
};

/// Distribute tokens with time-based rate limiting
///
/// Rate limit formula: available = (elapsed_seconds / SECONDS_PER_YEAR) * vault_balance
///
/// This instruction:
/// 1. Calculates available allocation based on time elapsed
/// 2. Verifies amount <= available
/// 3. Transfers amount from vault to pending_claims
/// 4. Updates merkle_root and last_distribution_ts
///
/// Accounts:
/// 0. `[signer]` Merkle updater
/// 1. `[writable]` Config PDA
/// 2. `[writable]` Vault token account
/// 3. `[writable]` Pending claims token account
/// 4. `[]` Mint
/// 5. `[]` Token program
pub fn process(
    program_id: &Pubkey,
    accounts: &[AccountInfo],
    amount: u64,
    merkle_root: [u8; 32],
) -> ProgramResult {
    let account_info_iter = &mut accounts.iter();

    let updater = next_account_info(account_info_iter)?;
    let config_info = next_account_info(account_info_iter)?;
    let vault_info = next_account_info(account_info_iter)?;
    let pending_claims_info = next_account_info(account_info_iter)?;
    let mint_info = next_account_info(account_info_iter)?;
    let token_program = next_account_info(account_info_iter)?;

    // Verify updater is signer
    if !updater.is_signer {
        return Err(YapError::Unauthorized.into());
    }

    // Verify config PDA
    let (config_pda, _) = Pubkey::find_program_address(&[Config::SEED], program_id);
    if config_info.key != &config_pda {
        return Err(YapError::InvalidPda.into());
    }

    if config_info.owner != program_id {
        return Err(YapError::InvalidOwner.into());
    }

    let mut config = Config::try_from_slice(&config_info.data.borrow())?;

    if !config.is_valid() {
        return Err(YapError::InvalidDiscriminator.into());
    }

    // Verify caller is authorized merkle updater
    if updater.key != &config.merkle_updater {
        return Err(YapError::Unauthorized.into());
    }

    // Verify vault
    if vault_info.key != &config.vault {
        return Err(YapError::InvalidPda.into());
    }

    // Verify pending_claims
    if pending_claims_info.key != &config.pending_claims {
        return Err(YapError::InvalidPda.into());
    }

    // Verify mint
    if mint_info.key != &config.mint {
        return Err(YapError::InvalidMint.into());
    }

    // Get current time
    let clock = Clock::get()?;
    let now = clock.unix_timestamp;

    // Calculate time elapsed since last distribution
    let elapsed = now.saturating_sub(config.last_distribution_ts);

    // Get vault balance
    let vault_account = TokenAccount::unpack(&vault_info.data.borrow())?;
    let vault_balance = vault_account.amount;

    // Calculate available allocation: (elapsed / SECONDS_PER_YEAR) * vault_balance
    // Using u128 to prevent overflow
    let available = (elapsed as u128)
        .checked_mul(vault_balance as u128)
        .unwrap_or(0)
        .checked_div(SECONDS_PER_YEAR as u128)
        .unwrap_or(0) as u64;

    msg!(
        "Distribute: elapsed={}s, vault={}, available={}, requested={}",
        elapsed,
        vault_balance,
        available,
        amount
    );

    // Verify amount doesn't exceed available allocation
    if amount > available {
        msg!(
            "Distribute: Amount {} exceeds available {}",
            amount,
            available
        );
        return Err(YapError::ExceedsDailyAllocation.into());
    }

    // Skip transfer if amount is 0 (no activity)
    if amount > 0 {
        msg!(
            "Distribute: Transferring {} from vault to pending_claims",
            amount
        );

        // Transfer from vault to pending_claims
        invoke_signed(
            &spl_token::instruction::transfer_checked(
                &spl_token::id(),
                vault_info.key,
                mint_info.key,
                pending_claims_info.key,
                &config_pda,
                &[],
                amount,
                DECIMALS,
            )?,
            &[
                vault_info.clone(),
                mint_info.clone(),
                pending_claims_info.clone(),
                config_info.clone(),
                token_program.clone(),
            ],
            &[&[Config::SEED, &[config.bump]]],
        )?;
    }

    // Update config
    msg!(
        "Distribute: {:?}... -> {:?}...",
        &config.merkle_root[..4],
        &merkle_root[..4]
    );

    config.merkle_root = merkle_root;
    config.last_distribution_ts = now;
    config.serialize(&mut &mut config_info.data.borrow_mut()[..])?;

    msg!("Distribute: Success! Distributed {} tokens", amount);

    Ok(())
}
