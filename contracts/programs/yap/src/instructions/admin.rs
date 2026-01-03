use borsh::{BorshDeserialize, BorshSerialize};
use solana_program::{
    account_info::{next_account_info, AccountInfo},
    entrypoint::ProgramResult,
    msg,
    pubkey::Pubkey,
};

use crate::{error::YapError, state::Config};

/// Update merkle updater address (admin only)
///
/// Accounts:
/// 0. `[signer]` Admin
/// 1. `[writable]` Config PDA
pub fn process_update_merkle_updater(
    program_id: &Pubkey,
    accounts: &[AccountInfo],
    new_updater: Pubkey,
) -> ProgramResult {
    let account_info_iter = &mut accounts.iter();

    let admin = next_account_info(account_info_iter)?;
    let config_info = next_account_info(account_info_iter)?;

    // Verify admin is signer
    if !admin.is_signer {
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

    // Verify caller is admin
    if admin.key != &config.admin {
        return Err(YapError::Unauthorized.into());
    }

    msg!(
        "UpdateMerkleUpdater: {} -> {}",
        config.merkle_updater,
        new_updater
    );

    config.merkle_updater = new_updater;
    config.serialize(&mut &mut config_info.data.borrow_mut()[..])?;

    Ok(())
}

/// Update inflation rate (admin only)
///
/// Accounts:
/// 0. `[signer]` Admin
/// 1. `[writable]` Config PDA
pub fn process_update_inflation_rate(
    program_id: &Pubkey,
    accounts: &[AccountInfo],
    new_rate_bps: u16,
) -> ProgramResult {
    let account_info_iter = &mut accounts.iter();

    let admin = next_account_info(account_info_iter)?;
    let config_info = next_account_info(account_info_iter)?;

    // Verify admin is signer
    if !admin.is_signer {
        return Err(YapError::Unauthorized.into());
    }

    // Validate rate range (0-10000 bps = 0-100%)
    if new_rate_bps > Config::MAX_INFLATION_BPS {
        return Err(YapError::InvalidInstruction.into());
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

    // Verify caller is admin
    if admin.key != &config.admin {
        return Err(YapError::Unauthorized.into());
    }

    msg!(
        "UpdateInflationRate: {} -> {} bps",
        config.inflation_rate_bps,
        new_rate_bps
    );

    config.inflation_rate_bps = new_rate_bps;
    config.serialize(&mut &mut config_info.data.borrow_mut()[..])?;

    Ok(())
}
