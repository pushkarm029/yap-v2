use borsh::{BorshDeserialize, BorshSerialize};
use solana_program::{
    account_info::{next_account_info, AccountInfo},
    clock::Clock,
    entrypoint::ProgramResult,
    msg,
    program::invoke_signed,
    pubkey::Pubkey,
    sysvar::Sysvar,
};

use crate::{
    error::YapError,
    state::{Config, DECIMALS, SECONDS_PER_YEAR},
};

/// Trigger inflation - mints accrued inflation to vault
/// Uses continuous rate limiting: available = elapsed * supply * rate / year
pub fn process(program_id: &Pubkey, accounts: &[AccountInfo]) -> ProgramResult {
    let account_info_iter = &mut accounts.iter();

    let admin = next_account_info(account_info_iter)?;
    let config_info = next_account_info(account_info_iter)?;
    let mint_info = next_account_info(account_info_iter)?;
    let vault_info = next_account_info(account_info_iter)?;
    let token_program = next_account_info(account_info_iter)?;

    if !admin.is_signer {
        return Err(YapError::Unauthorized.into());
    }

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

    if admin.key != &config.admin {
        return Err(YapError::Unauthorized.into());
    }

    if mint_info.key != &config.mint {
        return Err(YapError::InvalidMint.into());
    }

    if vault_info.key != &config.vault {
        return Err(YapError::InvalidPda.into());
    }

    let clock = Clock::get()?;
    let now = clock.unix_timestamp;

    // Calculate elapsed time since last inflation
    let elapsed = now.saturating_sub(config.last_inflation_ts);
    if elapsed <= 0 {
        return Err(YapError::InflationNotReady.into());
    }

    // Calculate accrued inflation: supply * rate * elapsed / (10000 * SECONDS_PER_YEAR)
    let inflation_amount = (config.current_supply as u128)
        .checked_mul(config.inflation_rate_bps as u128)
        .ok_or(YapError::Overflow)?
        .checked_mul(elapsed as u128)
        .ok_or(YapError::Overflow)?
        .checked_div(10000)
        .ok_or(YapError::Overflow)?
        .checked_div(SECONDS_PER_YEAR as u128)
        .ok_or(YapError::Overflow)? as u64;

    if inflation_amount == 0 {
        return Err(YapError::InflationNotReady.into());
    }

    msg!(
        "TriggerInflation: elapsed={}s, amount={}",
        elapsed,
        inflation_amount
    );

    // Mint inflation to vault
    invoke_signed(
        &spl_token::instruction::mint_to_checked(
            &spl_token::id(),
            mint_info.key,
            vault_info.key,
            &config_pda,
            &[],
            inflation_amount,
            DECIMALS,
        )?,
        &[
            mint_info.clone(),
            vault_info.clone(),
            config_info.clone(),
            token_program.clone(),
        ],
        &[&[Config::SEED, &[config.bump]]],
    )?;

    // Update config
    config.current_supply = config
        .current_supply
        .checked_add(inflation_amount)
        .ok_or(YapError::Overflow)?;
    config.last_inflation_ts = now;

    config.serialize(&mut &mut config_info.data.borrow_mut()[..])?;

    msg!(
        "TriggerInflation: new_supply={}",
        config.current_supply
    );

    Ok(())
}
