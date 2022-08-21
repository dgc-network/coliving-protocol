//! Error types

use num_derive::FromPrimitive;
use num_traits::FromPrimitive;
use solana_program::{
    decode_error::DecodeError,
    msg,
    program_error::{PrintProgramError, ProgramError},
};
use thiserror::Error;

/// Errors that may be returned by the CreateAndVerify program.
#[derive(Clone, Debug, Eq, Error, FromPrimitive, PartialEq)]
pub enum AgreementListenCountError {
    /// Instruction unpack error
    #[error("Instruction unpack error")]
    InstructionUnpackError,
    /// Invalid agreement data were passed
    #[error("Invalid agreement data were passed")]
    InvalidAgreementData,
    /// Difference between timestamp and current time is too big
    #[error("Difference between timestamp and current time is too big")]
    InvalidTimestamp,
}
impl From<AgreementListenCountError> for ProgramError {
    fn from(e: AgreementListenCountError) -> Self {
        ProgramError::Custom(e as u32)
    }
}
impl<T> DecodeError<T> for AgreementListenCountError {
    fn type_of() -> &'static str {
        "AgreementListenCountError"
    }
}

impl PrintProgramError for AgreementListenCountError {
    fn print<E>(&self)
    where
        E: 'static + std::error::Error + DecodeError<E> + PrintProgramError + FromPrimitive,
    {
        match self {
            AgreementListenCountError::InstructionUnpackError => msg!("Instruction unpack error"),
            AgreementListenCountError::InvalidAgreementData => msg!("Invalid agreement data were passed"),
            AgreementListenCountError::InvalidTimestamp => msg!("Difference between timestamp and current time is too big"),
        }
    }
}
