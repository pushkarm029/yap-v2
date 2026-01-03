use borsh::{BorshDeserialize, BorshSerialize};
use solana_program::{
    account_info::{next_account_info, AccountInfo},
    entrypoint::ProgramResult,
    keccak, msg,
    program::invoke_signed,
    pubkey::Pubkey,
    rent::Rent,
    sysvar::SysvarSerialize,
};
use solana_system_interface::instruction as system_instruction;

use crate::{
    error::YapError,
    state::{
        Config, UserClaimStatus, ASSOCIATED_TOKEN_PROGRAM_ID, DECIMALS, MAX_PROOF_DEPTH,
        USER_CLAIM_DISCRIMINATOR,
    },
};

/// Claim tokens using merkle proof
///
/// Accounts:
/// 0. `[signer, writable]` User claiming (pays for PDA if new)
/// 1. `[writable]` User's token account (ATA)
/// 2. `[writable]` UserClaimStatus PDA
/// 3. `[]` Config PDA
/// 4. `[writable]` Pending claims token account
/// 5. `[]` Mint (for transfer_checked validation)
/// 6. `[]` Token program
/// 7. `[]` System program
/// 8. `[]` Rent sysvar
pub fn process(
    program_id: &Pubkey,
    accounts: &[AccountInfo],
    amount: u64,
    proof: Vec<[u8; 32]>,
) -> ProgramResult {
    let account_info_iter = &mut accounts.iter();

    let user = next_account_info(account_info_iter)?;
    let user_token_account = next_account_info(account_info_iter)?;
    let user_claim_status_info = next_account_info(account_info_iter)?;
    let config_info = next_account_info(account_info_iter)?;
    let pending_claims_info = next_account_info(account_info_iter)?;
    let mint_info = next_account_info(account_info_iter)?;
    let token_program = next_account_info(account_info_iter)?;
    let system_program = next_account_info(account_info_iter)?;
    let rent_info = next_account_info(account_info_iter)?;

    // Verify user is signer
    if !user.is_signer {
        return Err(YapError::Unauthorized.into());
    }

    // Reject zero amount claims
    if amount == 0 {
        msg!("Claim: Amount cannot be zero");
        return Err(YapError::InvalidInstruction.into());
    }

    // Reject excessively long proofs (DoS protection)
    if proof.len() > MAX_PROOF_DEPTH {
        msg!("Claim: Proof too long ({} > {})", proof.len(), MAX_PROOF_DEPTH);
        return Err(YapError::ProofTooLong.into());
    }

    // Note: token program validated by transfer_checked via check_program_account()

    // Verify system program
    if *system_program.key != solana_system_interface::program::id() {
        return Err(YapError::InvalidOwner.into());
    }

    // Verify rent sysvar
    if *rent_info.key != solana_program::sysvar::rent::ID {
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

    let config = Config::try_from_slice(&config_info.data.borrow())?;
    if !config.is_valid() {
        return Err(YapError::InvalidDiscriminator.into());
    }

    // Verify merkle root is set (not empty)
    if config.merkle_root == [0u8; 32] {
        msg!("Claim: Merkle root not set");
        return Err(YapError::NotInitialized.into());
    }

    // Verify pending_claims
    if pending_claims_info.key != &config.pending_claims {
        return Err(YapError::InvalidPda.into());
    }

    // Verify mint matches config (for transfer_checked)
    if mint_info.key != &config.mint {
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
        msg!("Claim: Invalid user token account, expected ATA");
        return Err(YapError::InvalidPda.into());
    }

    // Verify UserClaimStatus PDA
    let (user_claim_pda, user_claim_bump) =
        Pubkey::find_program_address(&[UserClaimStatus::SEED, user.key.as_ref()], program_id);
    if user_claim_status_info.key != &user_claim_pda {
        return Err(YapError::InvalidPda.into());
    }

    // Verify merkle proof
    let leaf = compute_leaf(user.key, amount);
    if !verify_proof(&proof, &config.merkle_root, &leaf) {
        msg!("Claim: Invalid merkle proof");
        return Err(YapError::InvalidProof.into());
    }

    msg!(
        "Claim: user={}, amount={}, proof verified",
        user.key,
        amount
    );

    // Get or create UserClaimStatus
    let mut user_claim_status = if user_claim_status_info.data_is_empty() {
        // Create new UserClaimStatus PDA
        let rent = Rent::from_account_info(rent_info)?;
        let space = UserClaimStatus::LEN;
        let lamports = rent.minimum_balance(space);

        invoke_signed(
            &system_instruction::create_account(
                user.key,
                user_claim_status_info.key,
                lamports,
                space as u64,
                program_id,
            ),
            &[
                user.clone(),
                user_claim_status_info.clone(),
                system_program.clone(),
            ],
            &[&[UserClaimStatus::SEED, user.key.as_ref(), &[user_claim_bump]]],
        )?;

        UserClaimStatus {
            discriminator: USER_CLAIM_DISCRIMINATOR,
            claimed_amount: 0,
            total_burned: 0,
            bump: user_claim_bump,
        }
    } else {
        // Load existing
        if user_claim_status_info.owner != program_id {
            return Err(YapError::InvalidOwner.into());
        }
        let status = UserClaimStatus::try_from_slice(&user_claim_status_info.data.borrow())?;
        if !status.is_valid() {
            return Err(YapError::InvalidDiscriminator.into());
        }
        status
    };

    // Calculate claimable amount
    let claimable = amount
        .checked_sub(user_claim_status.claimed_amount)
        .ok_or(YapError::AlreadyClaimed)?;

    if claimable == 0 {
        msg!(
            "Claim: Nothing to claim, already claimed {}",
            user_claim_status.claimed_amount
        );
        return Err(YapError::AlreadyClaimed.into());
    }

    msg!(
        "Claim: claimable={} (total={}, already_claimed={})",
        claimable,
        amount,
        user_claim_status.claimed_amount
    );

    // Transfer tokens from pending_claims to user (transfer_checked validates mint & decimals)
    invoke_signed(
        &spl_token::instruction::transfer_checked(
            &spl_token::id(),
            pending_claims_info.key,
            &config.mint, // mint for validation
            user_token_account.key,
            &config_pda, // pending_claims owner is config PDA
            &[],
            claimable,
            DECIMALS, // decimals for validation
        )?,
        &[
            pending_claims_info.clone(),
            mint_info.clone(),
            user_token_account.clone(),
            config_info.clone(),
            token_program.clone(),
        ],
        &[&[Config::SEED, &[config.bump]]],
    )?;

    // Update claimed amount
    user_claim_status.claimed_amount = amount;
    user_claim_status.serialize(&mut &mut user_claim_status_info.data.borrow_mut()[..])?;

    msg!("Claim: Successfully claimed {} tokens", claimable);

    Ok(())
}

/// Domain separator to prevent cross-protocol replay attacks
const LEAF_DOMAIN: &[u8] = b"YAP_CLAIM_V1";

/// Compute leaf hash: keccak256(domain || wallet_pubkey || amount)
fn compute_leaf(wallet: &Pubkey, amount: u64) -> [u8; 32] {
    let mut data = Vec::with_capacity(52); // 12 + 32 + 8
    data.extend_from_slice(LEAF_DOMAIN);
    data.extend_from_slice(wallet.as_ref());
    data.extend_from_slice(&amount.to_le_bytes());
    keccak::hash(&data).to_bytes()
}

/// Verify merkle proof
fn verify_proof(proof: &[[u8; 32]], root: &[u8; 32], leaf: &[u8; 32]) -> bool {
    let mut computed_hash = *leaf;

    for proof_element in proof.iter() {
        // Sort to ensure consistent ordering (smaller hash first)
        if computed_hash <= *proof_element {
            let mut combined = Vec::with_capacity(64);
            combined.extend_from_slice(&computed_hash);
            combined.extend_from_slice(proof_element);
            computed_hash = keccak::hash(&combined).to_bytes();
        } else {
            let mut combined = Vec::with_capacity(64);
            combined.extend_from_slice(proof_element);
            combined.extend_from_slice(&computed_hash);
            computed_hash = keccak::hash(&combined).to_bytes();
        }
    }

    computed_hash == *root
}
