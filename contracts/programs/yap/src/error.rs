use solana_program::program_error::ProgramError;
use thiserror::Error;

#[derive(Error, Debug, Clone, Copy)]
pub enum YapError {
    #[error("Invalid instruction")]
    InvalidInstruction,

    #[error("Account already initialized")]
    AlreadyInitialized,

    #[error("Account not initialized")]
    NotInitialized,

    #[error("Invalid account discriminator")]
    InvalidDiscriminator,

    #[error("Invalid PDA derivation")]
    InvalidPda,

    #[error("Unauthorized signer")]
    Unauthorized,

    #[error("Invalid merkle proof")]
    InvalidProof,

    #[error("Nothing to claim")]
    NothingToClaim,

    #[error("Already claimed this amount")]
    AlreadyClaimed,

    #[error("Inflation not yet available")]
    InflationNotReady,

    #[error("Already distributed today")]
    AlreadyDistributedToday,

    #[error("Amount exceeds daily allocation")]
    ExceedsDailyAllocation,

    #[error("Insufficient balance")]
    InsufficientBalance,

    #[error("Arithmetic overflow")]
    Overflow,

    #[error("Invalid account owner")]
    InvalidOwner,

    #[error("Invalid mint")]
    InvalidMint,

    #[error("Insufficient staked balance")]
    InsufficientStakedBalance,

    #[error("Merkle proof too long")]
    ProofTooLong,
}

impl From<YapError> for ProgramError {
    fn from(e: YapError) -> Self {
        ProgramError::Custom(e as u32)
    }
}
