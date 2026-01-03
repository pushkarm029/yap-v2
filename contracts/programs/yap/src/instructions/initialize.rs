use borsh::BorshSerialize;
use solana_program::{
    account_info::{next_account_info, AccountInfo},
    entrypoint::ProgramResult,
    instruction::{AccountMeta, Instruction},
    msg,
    program::{invoke, invoke_signed},
    program_pack::Pack,
    pubkey::Pubkey,
    rent::Rent,
    sysvar::SysvarSerialize,
};
use solana_system_interface::instruction as system_instruction;
use spl_token::state::{Account as TokenAccount, Mint};

use solana_program::clock::Clock;
use solana_program::sysvar::Sysvar;

use crate::{
    error::YapError,
    state::{
        Config, CONFIG_DISCRIMINATOR, DECIMALS, INITIAL_SUPPLY, MINT_SEED,
        PENDING_CLAIMS_SEED, VAULT_SEED,
        METADATA_PROGRAM_ID, METADATA_SEED, TOKEN_NAME, TOKEN_SYMBOL, TOKEN_URI,
    },
};

/// Initialize the YAP program
///
/// Accounts:
/// 0. `[signer, writable]` Admin/deployer (pays for accounts)
/// 1. `[writable]` Config PDA
/// 2. `[writable]` Mint PDA
/// 3. `[writable]` Vault PDA (token account for undistributed tokens)
/// 4. `[writable]` Pending Claims PDA (token account for distributed-but-unclaimed tokens)
/// 5. `[writable]` Metadata PDA (Metaplex token metadata account)
/// 6. `[]` System program
/// 7. `[]` Token program
/// 8. `[]` Metaplex Token Metadata program
/// 9. `[]` Rent sysvar
pub fn process(
    program_id: &Pubkey,
    accounts: &[AccountInfo],
    merkle_updater: Pubkey,
    inflation_rate_bps: u16,
) -> ProgramResult {
    let account_info_iter = &mut accounts.iter();

    let admin = next_account_info(account_info_iter)?;
    let config_info = next_account_info(account_info_iter)?;
    let mint_info = next_account_info(account_info_iter)?;
    let vault_info = next_account_info(account_info_iter)?;
    let pending_claims_info = next_account_info(account_info_iter)?;
    let metadata_info = next_account_info(account_info_iter)?;
    let system_program = next_account_info(account_info_iter)?;
    let token_program = next_account_info(account_info_iter)?;
    let metadata_program = next_account_info(account_info_iter)?;
    let rent_info = next_account_info(account_info_iter)?;

    if !admin.is_signer {
        return Err(YapError::Unauthorized.into());
    }

    if *system_program.key != solana_system_interface::program::id() {
        return Err(YapError::InvalidOwner.into());
    }

    // Note: token program validated by spl_token instructions via check_program_account()

    if *rent_info.key != solana_program::sysvar::rent::ID {
        return Err(YapError::InvalidOwner.into());
    }

    // Validate inflation rate range (0-10000 bps = 0-100%)
    if inflation_rate_bps > Config::MAX_INFLATION_BPS {
        return Err(YapError::InvalidInstruction.into());
    }

    msg!("Initialize: admin={}", admin.key);
    msg!("Initialize: merkle_updater={}", merkle_updater);

    let (config_pda, config_bump) = Pubkey::find_program_address(&[Config::SEED], program_id);
    let (mint_pda, mint_bump) = Pubkey::find_program_address(&[MINT_SEED], program_id);
    let (vault_pda, vault_bump) = Pubkey::find_program_address(&[VAULT_SEED], program_id);
    let (pending_claims_pda, pending_claims_bump) = Pubkey::find_program_address(&[PENDING_CLAIMS_SEED], program_id);

    if config_info.key != &config_pda {
        msg!("Invalid Config PDA: expected {}, got {}", config_pda, config_info.key);
        return Err(YapError::InvalidPda.into());
    }
    if mint_info.key != &mint_pda {
        msg!("Invalid Mint PDA: expected {}, got {}", mint_pda, mint_info.key);
        return Err(YapError::InvalidPda.into());
    }
    if vault_info.key != &vault_pda {
        msg!("Invalid Vault PDA: expected {}, got {}", vault_pda, vault_info.key);
        return Err(YapError::InvalidPda.into());
    }
    if pending_claims_info.key != &pending_claims_pda {
        msg!("Invalid Pending Claims PDA: expected {}, got {}", pending_claims_pda, pending_claims_info.key);
        return Err(YapError::InvalidPda.into());
    }

    // Validate metadata PDA (derived from Metaplex program)
    let (metadata_pda, _metadata_bump) = Pubkey::find_program_address(
        &[METADATA_SEED, METADATA_PROGRAM_ID.as_ref(), mint_pda.as_ref()],
        &METADATA_PROGRAM_ID,
    );
    if metadata_info.key != &metadata_pda {
        msg!("Invalid Metadata PDA: expected {}, got {}", metadata_pda, metadata_info.key);
        return Err(YapError::InvalidPda.into());
    }

    // Validate Metaplex Token Metadata program
    if metadata_program.key != &METADATA_PROGRAM_ID {
        return Err(YapError::InvalidOwner.into());
    }

    if !config_info.data_is_empty() {
        return Err(YapError::AlreadyInitialized.into());
    }

    let rent = Rent::from_account_info(rent_info)?;

    // 1. Create config account
    msg!("Creating config account...");
    let config_space = Config::LEN;
    let config_lamports = rent.minimum_balance(config_space);

    invoke_signed(
        &system_instruction::create_account(
            admin.key,
            config_info.key,
            config_lamports,
            config_space as u64,
            program_id,
        ),
        &[admin.clone(), config_info.clone(), system_program.clone()],
        &[&[Config::SEED, &[config_bump]]],
    )?;

    // 2. Create mint account
    msg!("Creating mint account...");
    let mint_space = Mint::LEN;
    let mint_lamports = rent.minimum_balance(mint_space);

    invoke_signed(
        &system_instruction::create_account(
            admin.key,
            mint_info.key,
            mint_lamports,
            mint_space as u64,
            &spl_token::id(),
        ),
        &[admin.clone(), mint_info.clone(), system_program.clone()],
        &[&[MINT_SEED, &[mint_bump]]],
    )?;

    // 3. Initialize mint (authority = config PDA for trustless minting)
    msg!("Initializing mint...");
    invoke(
        &spl_token::instruction::initialize_mint2(
            &spl_token::id(),
            mint_info.key,
            &config_pda, // mint authority = config PDA
            None,        // no freeze authority
            DECIMALS,
        )?,
        &[mint_info.clone(), rent_info.clone(), token_program.clone()],
    )?;

    // 4. Create vault token account
    msg!("Creating vault account...");
    let vault_space = TokenAccount::LEN;
    let vault_lamports = rent.minimum_balance(vault_space);

    invoke_signed(
        &system_instruction::create_account(
            admin.key,
            vault_info.key,
            vault_lamports,
            vault_space as u64,
            &spl_token::id(),
        ),
        &[admin.clone(), vault_info.clone(), system_program.clone()],
        &[&[VAULT_SEED, &[vault_bump]]],
    )?;

    // 5. Initialize vault (owner = config PDA for trustless transfers)
    msg!("Initializing vault...");
    invoke(
        &spl_token::instruction::initialize_account3(
            &spl_token::id(),
            vault_info.key,
            mint_info.key,
            &config_pda, // owner = config PDA
        )?,
        &[vault_info.clone(), mint_info.clone(), token_program.clone()],
    )?;

    // 6. Create pending_claims token account
    msg!("Creating pending_claims account...");
    let pending_claims_space = TokenAccount::LEN;
    let pending_claims_lamports = rent.minimum_balance(pending_claims_space);

    invoke_signed(
        &system_instruction::create_account(
            admin.key,
            pending_claims_info.key,
            pending_claims_lamports,
            pending_claims_space as u64,
            &spl_token::id(),
        ),
        &[admin.clone(), pending_claims_info.clone(), system_program.clone()],
        &[&[PENDING_CLAIMS_SEED, &[pending_claims_bump]]],
    )?;

    // 7. Initialize pending_claims (owner = config PDA for trustless transfers)
    msg!("Initializing pending_claims...");
    invoke(
        &spl_token::instruction::initialize_account3(
            &spl_token::id(),
            pending_claims_info.key,
            mint_info.key,
            &config_pda, // owner = config PDA
        )?,
        &[pending_claims_info.clone(), mint_info.clone(), token_program.clone()],
    )?;

    // 8. Mint initial supply to vault (mint_to_checked validates decimals)
    msg!("Minting {} tokens to vault...", INITIAL_SUPPLY);
    invoke_signed(
        &spl_token::instruction::mint_to_checked(
            &spl_token::id(),
            mint_info.key,
            vault_info.key,
            &config_pda, // mint authority
            &[],
            INITIAL_SUPPLY,
            DECIMALS,
        )?,
        &[
            mint_info.clone(),
            vault_info.clone(),
            config_info.clone(),
            token_program.clone(),
        ],
        &[&[Config::SEED, &[config_bump]]],
    )?;

    // 9. Create token metadata via CPI to Metaplex
    // Using raw invoke_signed to avoid SDK version conflicts
    msg!("Creating token metadata via Metaplex CPI...");
    msg!("  Metadata account: {}", metadata_info.key);
    msg!("  Mint authority: {}", config_pda);
    msg!("  Update authority: {}", admin.key);

    let create_metadata_ix = build_create_metadata_v3_instruction(
        metadata_info.key,
        mint_info.key,
        &config_pda,        // mint authority (Config PDA)
        admin.key,          // payer
        admin.key,          // update authority
    );

    invoke_signed(
        &create_metadata_ix,
        &[
            metadata_info.clone(),
            mint_info.clone(),
            config_info.clone(),
            admin.clone(),
            system_program.clone(),
            rent_info.clone(),
        ],
        &[&[Config::SEED, &[config_bump]]],
    ).map_err(|e| {
        msg!("Metaplex CPI failed: {:?}", e);
        msg!("This may indicate insufficient rent or invalid authorities");
        e
    })?;

    msg!("Token metadata created successfully");

    // 10. Write config data
    msg!("Writing config data...");

    let clock = Clock::get()?;
    let now = clock.unix_timestamp;

    let config = Config {
        discriminator: CONFIG_DISCRIMINATOR,
        mint: *mint_info.key,
        vault: *vault_info.key,
        pending_claims: *pending_claims_info.key,
        merkle_root: [0u8; 32], // empty initially
        merkle_updater,
        current_supply: INITIAL_SUPPLY,
        last_inflation_ts: now,      // inflation accrues from now
        last_distribution_ts: now,   // distribution accrues from now
        admin: *admin.key,
        inflation_rate_bps,
        bump: config_bump,
    };

    config.serialize(&mut &mut config_info.data.borrow_mut()[..])?;

    msg!("Initialize complete!");
    msg!("  Config: {}", config_info.key);
    msg!("  Mint: {}", mint_info.key);
    msg!("  Metadata: {}", metadata_info.key);
    msg!("  Vault: {}", vault_info.key);
    msg!("  Pending Claims: {}", pending_claims_info.key);
    msg!("  Supply: {}", INITIAL_SUPPLY);
    msg!("  Token Name: {}", TOKEN_NAME);
    msg!("  Token Symbol: {}", TOKEN_SYMBOL);

    Ok(())
}

/// Build CreateMetadataAccountV3 instruction manually
/// This avoids SDK version conflicts between mpl-token-metadata and solana-program
///
/// Note: Metaplex has deprecated CreateMetadataAccountV3 in favor of CreateV1 in newer SDKs,
/// but the on-chain program still supports V3 for backward compatibility.
/// See: https://github.com/metaplex-foundation/mpl-token-metadata
fn build_create_metadata_v3_instruction(
    metadata: &Pubkey,
    mint: &Pubkey,
    mint_authority: &Pubkey,
    payer: &Pubkey,
    update_authority: &Pubkey,
) -> Instruction {
    // CreateMetadataAccountV3 instruction discriminator (index 33 in Metaplex instruction enum)
    // See: mpl-token-metadata/programs/token-metadata/program/src/instruction/mod.rs
    const CREATE_METADATA_ACCOUNT_V3: u8 = 33;

    // Build instruction data
    let mut data = Vec::with_capacity(512);

    // Discriminator
    data.push(CREATE_METADATA_ACCOUNT_V3);

    // DataV2 struct
    // name (string: 4-byte length + bytes)
    let name_bytes = TOKEN_NAME.as_bytes();
    data.extend_from_slice(&(name_bytes.len() as u32).to_le_bytes());
    data.extend_from_slice(name_bytes);

    // symbol (string: 4-byte length + bytes)
    let symbol_bytes = TOKEN_SYMBOL.as_bytes();
    data.extend_from_slice(&(symbol_bytes.len() as u32).to_le_bytes());
    data.extend_from_slice(symbol_bytes);

    // uri (string: 4-byte length + bytes)
    let uri_bytes = TOKEN_URI.as_bytes();
    data.extend_from_slice(&(uri_bytes.len() as u32).to_le_bytes());
    data.extend_from_slice(uri_bytes);

    // seller_fee_basis_points (u16)
    data.extend_from_slice(&0u16.to_le_bytes());

    // creators (Option<Vec<Creator>>): None = 0
    data.push(0);

    // collection (Option<Collection>): None = 0
    data.push(0);

    // uses (Option<Uses>): None = 0
    data.push(0);

    // is_mutable (bool): true = 1
    data.push(1);

    // collection_details (Option<CollectionDetails>): None = 0
    data.push(0);

    // Build accounts
    let accounts = vec![
        AccountMeta::new(*metadata, false),           // metadata (writable)
        AccountMeta::new_readonly(*mint, false),      // mint
        AccountMeta::new_readonly(*mint_authority, true), // mint authority (signer - Config PDA)
        AccountMeta::new(*payer, true),               // payer (signer, writable)
        AccountMeta::new_readonly(*update_authority, false), // update authority
        AccountMeta::new_readonly(solana_system_interface::program::id(), false), // system program
        AccountMeta::new_readonly(solana_program::sysvar::rent::ID, false), // rent (optional but included for compatibility)
    ];

    Instruction {
        program_id: METADATA_PROGRAM_ID,
        accounts,
        data,
    }
}
