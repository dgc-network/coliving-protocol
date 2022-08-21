//! State transition types

use solana_program::clock::UnixTimestamp;
use borsh::{BorshDeserialize, BorshSerialize};

/// Agreement data
#[derive(BorshSerialize, BorshDeserialize, Clone)]
pub struct AgreementData {
    /// user ID
    pub user_id: String,
    /// agreement ID
    pub agreement_id: String,
    /// agreement source
    pub source: String,
    /// timestamp as nonce
    pub timestamp: UnixTimestamp,
}
