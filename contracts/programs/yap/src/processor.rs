use borsh::BorshDeserialize;
use solana_program::{account_info::AccountInfo, entrypoint::ProgramResult, msg, pubkey::Pubkey};

use crate::{error::YapError, instruction::YapInstruction};

pub fn process(
    program_id: &Pubkey,
    accounts: &[AccountInfo],
    instruction_data: &[u8],
) -> ProgramResult {
    let instruction = YapInstruction::try_from_slice(instruction_data)
        .map_err(|_| YapError::InvalidInstruction)?;

    match instruction {
        YapInstruction::Initialize {
            merkle_updater,
            inflation_rate_bps,
        } => {
            msg!("Instruction: Initialize");
            crate::instructions::initialize::process(
                program_id,
                accounts,
                merkle_updater,
                inflation_rate_bps,
            )
        }
        YapInstruction::TriggerInflation => {
            msg!("Instruction: TriggerInflation");
            crate::instructions::trigger_inflation::process(program_id, accounts)
        }
        YapInstruction::Distribute { amount, merkle_root } => {
            msg!("Instruction: Distribute");
            crate::instructions::distribute::process(program_id, accounts, amount, merkle_root)
        }
        YapInstruction::Claim { amount, proof } => {
            msg!("Instruction: Claim");
            crate::instructions::claim::process(program_id, accounts, amount, proof)
        }
        YapInstruction::Burn { amount } => {
            msg!("Instruction: Burn");
            crate::instructions::burn::process(program_id, accounts, amount)
        }
        YapInstruction::UpdateMerkleUpdater { new_updater } => {
            msg!("Instruction: UpdateMerkleUpdater");
            crate::instructions::admin::process_update_merkle_updater(
                program_id,
                accounts,
                new_updater,
            )
        }
        YapInstruction::UpdateInflationRate { new_rate_bps } => {
            msg!("Instruction: UpdateInflationRate");
            crate::instructions::admin::process_update_inflation_rate(
                program_id,
                accounts,
                new_rate_bps,
            )
        }
    }
}
