use borsh::{BorshDeserialize, BorshSerialize};
use solana_program::{
    account_info::{next_account_info, AccountInfo},
    entrypoint::ProgramResult,
    msg,
    program::invoke,
    pubkey::Pubkey,
};

use crate::{
    error::YapError,
    state::{Config, ASSOCIATED_TOKEN_PROGRAM_ID},
};

/// Burn tokens (deflationary)
///
/// Phase 1: Simple burn - just burns tokens and updates current_supply.
/// Phase 2: Will add per-user tracking for burn rewards.
///
/// Accounts:
/// 0. `[signer]` Token holder
/// 1. `[writable]` User's token account (ATA)
/// 2. `[writable]` Config PDA - to update current_supply
/// 3. `[writable]` Mint PDA - required for SPL burn
/// 4. `[]` Token program
pub fn process(program_id: &Pubkey, accounts: &[AccountInfo], amount: u64) -> ProgramResult {
    let account_info_iter = &mut accounts.iter();

    let user = next_account_info(account_info_iter)?;
    let user_token_account = next_account_info(account_info_iter)?;
    let config_info = next_account_info(account_info_iter)?;
    let mint_info = next_account_info(account_info_iter)?;
    let token_program = next_account_info(account_info_iter)?;

    // Verify user is signer
    if !user.is_signer {
        return Err(YapError::Unauthorized.into());
    }

    // Reject zero amount
    if amount == 0 {
        msg!("Burn: Amount cannot be zero");
        return Err(YapError::InvalidInstruction.into());
    }

    // Verify token program
    if *token_program.key != spl_token::id() {
        msg!("Burn: Invalid token program");
        return Err(YapError::InvalidOwner.into());
    }

    // Verify config PDA and owner
    let (config_pda, _) = Pubkey::find_program_address(&[Config::SEED], program_id);
    if config_info.key != &config_pda {
        return Err(YapError::InvalidPda.into());
    }
    if config_info.owner != program_id {
        return Err(YapError::InvalidOwner.into());
    }

    // Load config
    let mut config = Config::try_from_slice(&config_info.data.borrow())?;
    if !config.is_valid() {
        return Err(YapError::InvalidDiscriminator.into());
    }

    // Verify mint matches config
    if mint_info.key != &config.mint {
        msg!("Burn: Mint does not match config");
        return Err(YapError::InvalidMint.into());
    }

    // Verify user_token_account is ATA for user and correct mint
    let expected_ata = Pubkey::find_program_address(
        &[
            user.key.as_ref(),
            spl_token::id().as_ref(),
            config.mint.as_ref(),
        ],
        &ASSOCIATED_TOKEN_PROGRAM_ID,
    )
    .0;
    if user_token_account.key != &expected_ata {
        msg!("Burn: Invalid user token account, expected ATA");
        return Err(YapError::InvalidPda.into());
    }

    msg!(
        "Burn: user={}, amount={}, current_supply={}",
        user.key,
        amount,
        config.current_supply
    );

    // SPL Token burn instruction
    // User is the authority over their own token account
    invoke(
        &spl_token::instruction::burn(
            &spl_token::id(),
            user_token_account.key,
            mint_info.key,
            user.key,
            &[],
            amount,
        )?,
        &[
            user_token_account.clone(),
            mint_info.clone(),
            user.clone(),
            token_program.clone(),
        ],
    )?;

    // Update current_supply
    config.current_supply = config
        .current_supply
        .checked_sub(amount)
        .ok_or(YapError::Overflow)?;

    // Save updated config
    config.serialize(&mut &mut config_info.data.borrow_mut()[..])?;

    msg!(
        "Burn: Successfully burned {} tokens, new_supply={}",
        amount,
        config.current_supply
    );

    Ok(())
}
