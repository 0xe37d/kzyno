use solana_program::program_error::ProgramError;
use thiserror::Error;

#[derive(Error, Debug, Copy, Clone)]
pub enum CasinoError {
    #[error("Invalid instruction")]
    InvalidInstruction,

    #[error("Invalid token account")]
    InvalidTokenAccount,

    #[error("Invalid vault account")]
    InvalidVaultAccount,

    #[error("Invalid reserve account")]
    InvalidReserveAccount,

    #[error("Invalid global state")]
    InvalidGlobalState,

    #[error("Insufficient funds")]
    InsufficientFunds,

    #[error("Invalid deposit amount")]
    InvalidDepositAmount,

    #[error("Invalid burn amount")]
    InvalidBurnAmount,

    #[error("Program already initialized")]
    AlreadyInitialized,

    #[error("Program not initialized")]
    NotInitialized,

    #[error("Invalid token mint")]
    InvalidTokenMint,

    #[error("Invalid admin")]
    InvalidAdmin,

    #[error("Arithmetic overflow")]
    Overflow,
}

impl From<CasinoError> for ProgramError {
    fn from(e: CasinoError) -> Self {
        ProgramError::Custom(e as u32)
    }
} 