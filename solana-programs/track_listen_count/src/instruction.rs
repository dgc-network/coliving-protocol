//! Instruction types

use crate::state::AgreementData;
use borsh::{BorshDeserialize, BorshSerialize};
use solana_program::{
    instruction::{AccountMeta, Instruction},
    program_error::ProgramError,
    pubkey::Pubkey,
    sysvar,
};

/// Instruction arguments
#[repr(C)]
#[derive(BorshSerialize, BorshDeserialize, Clone)]
pub struct InstructionArgs {
    /// data of agreement
    pub agreement_data: AgreementData,
    /// signature to verify
    pub signature: [u8; coliving_eth_registry::state::SecpSignatureOffsets::SECP_SIGNATURE_SIZE],
    /// recovery ID used to verify signature
    pub recovery_id: u8,
}

/// Instruction definition
#[repr(C)]
#[derive(BorshSerialize, BorshDeserialize, Clone)]
pub enum TemplateInstruction {
    ///   AgreementListen
    ///
    ///   1. [] Valid signer account
    ///   2. [] Signer group
    ///   3. [] Coliving program account
    ///   4. [] Sysvar instruction account
    ///   5. [] Sysvar clock account
    AgreementListenInstruction(InstructionArgs),
}

/// Create `AgreementListen` instruction
pub fn init(
    program_id: &Pubkey,
    valid_signer_account: &Pubkey,
    signer_group: &Pubkey,
    agreement_data: InstructionArgs,
) -> Result<Instruction, ProgramError> {
    let init_data = TemplateInstruction::AgreementListenInstruction(agreement_data);
    let data = init_data
        .try_to_vec()
        .or(Err(ProgramError::InvalidArgument))?;
    let accounts = vec![
        AccountMeta::new_readonly(*valid_signer_account, false),
        AccountMeta::new_readonly(*signer_group, false),
        AccountMeta::new_readonly(coliving_eth_registry::id(), false),
        AccountMeta::new_readonly(sysvar::instructions::id(), false),
        AccountMeta::new_readonly(sysvar::clock::id(), false),
    ];
    Ok(Instruction {
        program_id: *program_id,
        accounts,
        data,
    })
}
