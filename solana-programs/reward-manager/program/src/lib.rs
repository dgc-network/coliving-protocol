#![deny(missing_docs)]

//! Coliving Reward Manager program

pub mod error;
pub mod instruction;
pub mod processor;
pub mod state;
pub mod utils;

/// Current program version
pub const PROGRAM_VERSION: u8 = 1;

#[cfg(not(feature = "no-entrypoint"))]
pub mod entrypoint;

// Export current sdk types for downstream users building with a different sdk version
pub use solana_program;

solana_program::declare_id!("BhNALTyahpbQBQ9fMAeLPeH85eCog3sidaTjDtdA4WuW");
