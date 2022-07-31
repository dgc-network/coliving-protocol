#![cfg(feature = "test-bpf")]

use core::time;
use std::thread;

use coliving_eth_registry::*;
use borsh::BorshDeserialize;
use libsecp256k1::{PublicKey, SecretKey};
use rand::rngs::ThreadRng;
use rand::{thread_rng, Rng};
use sha3::Digest;
use solana_program::secp256k1_program;
use solana_program::{hash::Hash, instruction::Instruction, pubkey::Pubkey, system_instruction};

use solana_program_test::*;
use solana_sdk::secp256k1_instruction::{
    new_secp256k1_instruction, SecpSignatureOffsets, DATA_START, SIGNATURE_SERIALIZED_SIZE,
};
use solana_sdk::{
    account::Account,
    secp256k1_instruction,
    signature::{Keypair, Signer},
    transaction::Transaction,
    transport::TransportError,
    feature_set::FeatureSet
};
use {std::sync::Arc};

use chrono::Utc;

pub fn program_test() -> ProgramTest {
    println!("coliving_eth_registry id = {:?}", id());
    ProgramTest::new(
        "coliving_eth_registry",
        id(),
        processor!(processor::Processor::process),
    )
}

async fn setup() -> (BanksClient, Keypair, Hash, Keypair, Keypair) {
    let (mut banks_client, payer, recent_blockhash) = program_test().start().await;

    let signer_group = Keypair::new();
    let group_owner = Keypair::new();

    create_account(
        &mut banks_client,
        &payer,
        &recent_blockhash,
        &signer_group,
        state::SignerGroup::LEN,
    )
    .await
    .unwrap();

    (
        banks_client,
        payer,
        recent_blockhash,
        signer_group,
        group_owner,
    )
}

pub fn new_secp256k1_instruction_2_0(
    priv_key: &libsecp256k1::SecretKey,
    message_arr: &[u8],
    instruction_index: u8,
) -> Instruction {
    let secp_pubkey = libsecp256k1::PublicKey::from_secret_key(priv_key);
    let eth_pubkey = construct_eth_address(&secp_pubkey);
    let mut hasher = sha3::Keccak256::new();
    hasher.update(&message_arr);
    let message_hash = hasher.finalize();
    let mut message_hash_arr = [0u8; 32];
    message_hash_arr.copy_from_slice(&message_hash.as_slice());
    let message = libsecp256k1::Message::parse(&message_hash_arr);
    let (signature, recovery_id) = libsecp256k1::sign(&message, priv_key);
    let signature_arr = signature.serialize();
    assert_eq!(signature_arr.len(), SIGNATURE_SERIALIZED_SIZE);

    let mut instruction_data = vec![];
    instruction_data.resize(
        DATA_START
            .saturating_add(eth_pubkey.len())
            .saturating_add(signature_arr.len())
            .saturating_add(message_arr.len())
            .saturating_add(1),
        0,
    );
    let eth_address_offset = DATA_START;
    instruction_data[eth_address_offset..eth_address_offset.saturating_add(eth_pubkey.len())]
        .copy_from_slice(&eth_pubkey);

    let signature_offset = DATA_START.saturating_add(eth_pubkey.len());
    instruction_data[signature_offset..signature_offset.saturating_add(signature_arr.len())]
        .copy_from_slice(&signature_arr);

    instruction_data[signature_offset.saturating_add(signature_arr.len())] =
        recovery_id.serialize();

    let message_data_offset = signature_offset
        .saturating_add(signature_arr.len())
        .saturating_add(1);
    instruction_data[message_data_offset..].copy_from_slice(message_arr);

    let num_signatures = 1;
    instruction_data[0] = num_signatures;
    let offsets = SecpSignatureOffsets {
        signature_offset: signature_offset as u16,
        signature_instruction_index: instruction_index,
        eth_address_offset: eth_address_offset as u16,
        eth_address_instruction_index: instruction_index,
        message_data_offset: message_data_offset as u16,
        message_data_size: message_arr.len() as u16,
        message_instruction_index: instruction_index,
    };
    let writer = std::io::Cursor::new(&mut instruction_data[1..DATA_START]);
    bincode::serialize_into(writer, &offsets).unwrap();

    Instruction {
        program_id: solana_sdk::secp256k1_program::id(),
        accounts: vec![],
        data: instruction_data,
    }
}

async fn create_account(
    banks_client: &mut BanksClient,
    payer: &Keypair,
    recent_blockhash: &Hash,
    account: &Keypair,
    struct_size: usize,
) -> Result<(), TransportError> {
    let rent = banks_client.get_rent().await.unwrap();
    let account_rent = rent.minimum_balance(struct_size);

    let mut transaction = Transaction::new_with_payer(
        &[system_instruction::create_account(
            &payer.pubkey(),
            &account.pubkey(),
            account_rent,
            struct_size as u64,
            &id(),
        )],
        Some(&payer.pubkey()),
    );
    transaction.sign(&[payer, account], *recent_blockhash);
    banks_client.process_transaction(transaction).await?;
    Ok(())
}

async fn get_account(banks_client: &mut BanksClient, pubkey: &Pubkey) -> Account {
    banks_client
        .get_account(*pubkey)
        .await
        .expect("account not found")
        .expect("account empty")
}

async fn process_tx_init_signer_group(
    signer_group: &Pubkey,
    group_owner: &Pubkey,
    payer: &Keypair,
    recent_blockhash: Hash,
    banks_client: &mut BanksClient,
) -> Result<(), TransportError> {
    let mut transaction = Transaction::new_with_payer(
        &[instruction::init_signer_group(&id(), signer_group, group_owner).unwrap()],
        Some(&payer.pubkey()),
    );
    transaction.sign(&[payer], recent_blockhash);
    banks_client.process_transaction(transaction).await?;
    Ok(())
}

async fn process_tx_init_disable_signer_group_owner(
    signer_group: &Pubkey,
    group_owner: &Keypair,
    payer: &Keypair,
    recent_blockhash: Hash,
    banks_client: &mut BanksClient,
) -> Result<(), TransportError> {
    let mut transaction = Transaction::new_with_payer(
        &[
            instruction::disable_signer_group_owner(&id(), signer_group, &group_owner.pubkey())
                .unwrap(),
        ],
        Some(&payer.pubkey()),
    );
    transaction.sign(&[payer, group_owner], recent_blockhash);
    banks_client.process_transaction(transaction).await?;
    Ok(())
}

async fn process_tx_init_valid_signer(
    valid_signer: &Pubkey,
    signer_group: &Pubkey,
    group_owner: &Keypair,
    payer: &Keypair,
    recent_blockhash: Hash,
    banks_client: &mut BanksClient,
    eth_address: [u8; state::SecpSignatureOffsets::ETH_ADDRESS_SIZE],
) -> Result<(), TransportError> {
    let mut transaction = Transaction::new_with_payer(
        &[instruction::init_valid_signer(
            &id(),
            valid_signer,
            signer_group,
            &group_owner.pubkey(),
            eth_address,
        )
        .unwrap()],
        Some(&payer.pubkey()),
    );
    transaction.sign(&[payer, group_owner], recent_blockhash);
    banks_client.process_transaction(transaction).await?;
    Ok(())
}

fn construct_eth_address(
    pubkey: &PublicKey,
) -> [u8; state::SecpSignatureOffsets::ETH_ADDRESS_SIZE] {
    let mut addr = [0u8; state::SecpSignatureOffsets::ETH_ADDRESS_SIZE];
    addr.copy_from_slice(&sha3::Keccak256::digest(&pubkey.serialize()[1..])[12..]);
    assert_eq!(addr.len(), state::SecpSignatureOffsets::ETH_ADDRESS_SIZE);
    addr
}

fn construct_signature_data(
    priv_key_raw: &[u8; 32],
    message: &[u8],
    index: u8,
) -> (instruction::SignatureData, Instruction) {
    let priv_key = SecretKey::parse(priv_key_raw).unwrap();
    let secp256_program_instruction = new_secp256k1_instruction_2_0(&priv_key, message, index);

    let start = 1;
    let end = start + state::SecpSignatureOffsets::SIGNATURE_OFFSETS_SERIALIZED_SIZE;
    let offsets =
        state::SecpSignatureOffsets::try_from_slice(&secp256_program_instruction.data[start..end])
            .unwrap();

    let sig_start = offsets.signature_offset as usize;
    let sig_end = sig_start + state::SecpSignatureOffsets::SECP_SIGNATURE_SIZE;
    let recovery_id = secp256_program_instruction.data[sig_end];

    let signature_data = instruction::SignatureData {
        recovery_id,
        message: message.to_vec(),
    };

    return (signature_data, secp256_program_instruction);
}

async fn create_valid_signer(
    rng: &mut ThreadRng,
    banks_client: &mut BanksClient,
    payer: &Keypair,
    recent_blockhash: Hash,
    signer_group: &Pubkey,
    group_owner: &Keypair,
) -> ([u8; 32], SecretKey, PublicKey, [u8; 20], Keypair) {
    let key: [u8; 32] = rng.gen();
    let priv_key = SecretKey::parse(&key).unwrap();
    let secp_pubkey = PublicKey::from_secret_key(&priv_key);
    let eth_address = construct_eth_address(&secp_pubkey);

    let valid_signer = Keypair::new();

    create_account(
        banks_client,
        &payer,
        &recent_blockhash,
        &valid_signer,
        state::ValidSigner::LEN,
    )
    .await
    .unwrap();

    process_tx_init_valid_signer(
        &valid_signer.pubkey(),
        signer_group,
        group_owner,
        payer,
        recent_blockhash,
        banks_client,
        eth_address,
    )
    .await
    .unwrap();

    (key, priv_key, secp_pubkey, eth_address, valid_signer)
}

#[tokio::test]
async fn init_signer_group() {
    let (mut banks_client, payer, recent_blockhash, signer_group, group_owner) = setup().await;

    process_tx_init_signer_group(
        &signer_group.pubkey(),
        &group_owner.pubkey(),
        &payer,
        recent_blockhash,
        &mut banks_client,
    )
    .await
    .unwrap();

    let signer_group_account = get_account(&mut banks_client, &signer_group.pubkey()).await;

    assert_eq!(signer_group_account.data.len(), state::SignerGroup::LEN);
    assert_eq!(signer_group_account.owner, id());

    let signer_group_data =
        state::SignerGroup::try_from_slice(&signer_group_account.data.as_slice()).unwrap();

    assert!(signer_group_data.is_initialized());
    assert_eq!(signer_group_data.owner, group_owner.pubkey());
}

#[tokio::test]
async fn disable_signer_group_wrong_owner() {
    let (mut banks_client, payer, recent_blockhash, signer_group, group_owner) = setup().await;

    let wrong_owner = Keypair::new();

    process_tx_init_signer_group(
        &signer_group.pubkey(),
        &group_owner.pubkey(),
        &payer,
        recent_blockhash,
        &mut banks_client,
    )
    .await
    .unwrap();

    let signer_group_account = get_account(&mut banks_client, &signer_group.pubkey()).await;

    assert_eq!(signer_group_account.data.len(), state::SignerGroup::LEN);
    assert_eq!(signer_group_account.owner, id());

    let signer_group_data =
        state::SignerGroup::try_from_slice(&signer_group_account.data.as_slice()).unwrap();

    assert!(signer_group_data.is_initialized());
    assert!(signer_group_data.owner_enabled);
    assert_eq!(signer_group_data.owner, group_owner.pubkey());

    let res = process_tx_init_disable_signer_group_owner(
        &signer_group.pubkey(),
        &wrong_owner,
        &payer,
        recent_blockhash,
        &mut banks_client,
    )
    .await;

    // Confirm owner cannot be updated from wrong address
    assert!(res.is_err());
}

#[tokio::test]
async fn disable_signer_group_owner() {
    let (mut banks_client, payer, recent_blockhash, signer_group, group_owner) = setup().await;

    process_tx_init_signer_group(
        &signer_group.pubkey(),
        &group_owner.pubkey(),
        &payer,
        recent_blockhash,
        &mut banks_client,
    )
    .await
    .unwrap();

    let signer_group_account = get_account(&mut banks_client, &signer_group.pubkey()).await;

    assert_eq!(signer_group_account.data.len(), state::SignerGroup::LEN);
    assert_eq!(signer_group_account.owner, id());

    let signer_group_data =
        state::SignerGroup::try_from_slice(&signer_group_account.data.as_slice()).unwrap();

    assert!(signer_group_data.is_initialized());
    assert!(signer_group_data.owner_enabled);
    assert_eq!(signer_group_data.owner, group_owner.pubkey());

    process_tx_init_disable_signer_group_owner(
        &signer_group.pubkey(),
        &group_owner,
        &payer,
        recent_blockhash,
        &mut banks_client,
    )
    .await
    .unwrap();

    // Confirm owner has been disabled
    let disabled_signer_group_account =
        get_account(&mut banks_client, &signer_group.pubkey()).await;
    let disabled_signer_group_data =
        state::SignerGroup::try_from_slice(&disabled_signer_group_account.data.as_slice()).unwrap();
    assert!(disabled_signer_group_data.is_initialized());
    assert!(!disabled_signer_group_data.owner_enabled);

    // Confirm valid signer CANNOT be added by group owner
    let valid_signer = Keypair::new();

    create_account(
        &mut banks_client,
        &payer,
        &recent_blockhash,
        &valid_signer,
        state::ValidSigner::LEN,
    )
    .await
    .unwrap();

    let eth_address = [1u8; state::SecpSignatureOffsets::ETH_ADDRESS_SIZE];
    let mut transaction = Transaction::new_with_payer(
        &[instruction::init_valid_signer(
            &id(),
            &valid_signer.pubkey(),
            &signer_group.pubkey(),
            &group_owner.pubkey(),
            eth_address,
        )
        .unwrap()],
        Some(&payer.pubkey()),
    );
    let recent_blockhash_1 = banks_client.get_recent_blockhash().await.unwrap();
    transaction.sign(
        &[&payer, &group_owner],
        recent_blockhash_1,
    );
    let transaction_error = banks_client.process_transaction(transaction).await;
    assert!(transaction_error.is_err());

    // Confirm signer group cannot be re-initialized
    let mut recent_blockhash_2 = banks_client.get_recent_blockhash().await.unwrap();
    // Need to poll for new blockhash; otherwise if we accidentally reuse
    // the old one, the transaction won't be processed and a cached value returned
    while recent_blockhash_2 == recent_blockhash_1 {
        thread::sleep(time::Duration::from_millis(100));
        recent_blockhash_2 = banks_client.get_recent_blockhash().await.unwrap();
    }

    let mut transaction_2 = Transaction::new_with_payer(
        &[
            instruction::init_signer_group(&id(), &signer_group.pubkey(), &group_owner.pubkey())
                .unwrap(),
        ],
        Some(&payer.pubkey()),
    );
    transaction_2.sign(
        &[&payer],
        recent_blockhash_2
    );
    let tx_error_2 = banks_client.process_transaction(transaction_2).await;
    assert!(tx_error_2.is_err());
}

#[tokio::test]
async fn init_valid_signer() {
    let (mut banks_client, payer, recent_blockhash, signer_group, group_owner) = setup().await;

    process_tx_init_signer_group(
        &signer_group.pubkey(),
        &group_owner.pubkey(),
        &payer,
        recent_blockhash,
        &mut banks_client,
    )
    .await
    .unwrap();

    let valid_signer = Keypair::new();

    create_account(
        &mut banks_client,
        &payer,
        &recent_blockhash,
        &valid_signer,
        state::ValidSigner::LEN,
    )
    .await
    .unwrap();

    let eth_address = [1u8; state::SecpSignatureOffsets::ETH_ADDRESS_SIZE];
    process_tx_init_valid_signer(
        &valid_signer.pubkey(),
        &signer_group.pubkey(),
        &group_owner,
        &payer,
        recent_blockhash,
        &mut banks_client,
        eth_address,
    )
    .await
    .unwrap();

    let valid_signer_account = get_account(&mut banks_client, &valid_signer.pubkey()).await;

    assert_eq!(valid_signer_account.data.len(), state::ValidSigner::LEN);
    assert_eq!(valid_signer_account.owner, id());

    let valid_signer_data =
        state::ValidSigner::try_from_slice(&valid_signer_account.data.as_slice()).unwrap();

    assert!(valid_signer_data.is_initialized());
    assert_eq!(valid_signer_data.eth_address, eth_address);
    assert_eq!(valid_signer_data.signer_group, signer_group.pubkey());
}

#[tokio::test]
async fn clear_valid_signer() {
    let (mut banks_client, payer, recent_blockhash, signer_group, group_owner) = setup().await;

    process_tx_init_signer_group(
        &signer_group.pubkey(),
        &group_owner.pubkey(),
        &payer,
        recent_blockhash,
        &mut banks_client,
    )
    .await
    .unwrap();

    let valid_signer = Keypair::new();

    create_account(
        &mut banks_client,
        &payer,
        &recent_blockhash,
        &valid_signer,
        state::ValidSigner::LEN,
    )
    .await
    .unwrap();

    let eth_address = [1u8; state::SecpSignatureOffsets::ETH_ADDRESS_SIZE];
    process_tx_init_valid_signer(
        &valid_signer.pubkey(),
        &signer_group.pubkey(),
        &group_owner,
        &payer,
        recent_blockhash,
        &mut banks_client,
        eth_address,
    )
    .await
    .unwrap();

    let mut transaction = Transaction::new_with_payer(
        &[instruction::clear_valid_signer(
            &id(),
            &valid_signer.pubkey(),
            &signer_group.pubkey(),
            &group_owner.pubkey(),
        )
        .unwrap()],
        Some(&payer.pubkey()),
    );
    transaction.sign(&[&payer, &group_owner], recent_blockhash);
    banks_client.process_transaction(transaction).await.unwrap();

    let valid_signer_account = get_account(&mut banks_client, &valid_signer.pubkey()).await;

    let valid_signer_data =
        state::ValidSigner::try_from_slice(&valid_signer_account.data.as_slice()).unwrap();

    assert_eq!(valid_signer_data.is_initialized(), false);
}

#[tokio::test]
async fn validate_3_signatures_clear_valid_signer() {
    let (mut banks_client, payer, recent_blockhash, signer_group, group_owner) = setup().await;

    process_tx_init_signer_group(
        &signer_group.pubkey(),
        &group_owner.pubkey(),
        &payer,
        recent_blockhash,
        &mut banks_client,
    )
    .await
    .unwrap();

    let mut rng = thread_rng();

    let (key_1, _priv_key_1, _secp_pubkey_1, _eth_address_1, valid_signer_1) = create_valid_signer(
        &mut rng,
        &mut banks_client,
        &payer,
        recent_blockhash,
        &signer_group.pubkey(),
        &group_owner,
    )
    .await;

    let (key_2, _priv_key_2, _secp_pubkey_2, _eth_address_2, valid_signer_2) = create_valid_signer(
        &mut rng,
        &mut banks_client,
        &payer,
        recent_blockhash,
        &signer_group.pubkey(),
        &group_owner,
    )
    .await;

    let (key_3, _priv_key_3, _secp_pubkey_3, _eth_address_3, valid_signer_3) = create_valid_signer(
        &mut rng,
        &mut banks_client,
        &payer,
        recent_blockhash,
        &signer_group.pubkey(),
        &group_owner,
    )
    .await;

    // signer to remove
    let (_key, _priv_key, _secp_pubkey, _eth_address, valid_signer) = create_valid_signer(
        &mut rng,
        &mut banks_client,
        &payer,
        recent_blockhash,
        &signer_group.pubkey(),
        &group_owner,
    )
    .await;

    // Shared timestamp message
    let message_timestamp = Utc::now().timestamp();
    let message = message_timestamp.to_le_bytes();

    let (signature_data_1, secp256_program_instruction_1) =
        construct_signature_data(&key_1, &message, 0);
    let (signature_data_2, secp256_program_instruction_2) =
        construct_signature_data(&key_2, &message, 1);
    let (signature_data_3, secp256_program_instruction_3) =
        construct_signature_data(&key_3, &message, 2);

    let mut transaction = Transaction::new_with_payer(
        &[
            secp256_program_instruction_1,
            secp256_program_instruction_2,
            secp256_program_instruction_3,
            instruction::validate_multiple_signatures_clear_valid_signer(
                &id(),
                &valid_signer_1.pubkey(),
                &valid_signer_2.pubkey(),
                &valid_signer_3.pubkey(),
                &signer_group.pubkey(),
                &valid_signer.pubkey(),
                signature_data_1.clone(),
                signature_data_2.clone(),
                signature_data_3.clone(),
            )
            .unwrap(),
        ],
        Some(&payer.pubkey()),
    );
    transaction.sign(&[&payer], recent_blockhash);
    banks_client.process_transaction(transaction).await.unwrap();

    let valid_signer_account = get_account(&mut banks_client, &valid_signer.pubkey()).await;

    let valid_signer_data =
        state::ValidSigner::try_from_slice(&valid_signer_account.data.as_slice()).unwrap();

    assert_eq!(valid_signer_data.is_initialized(), false);
}

#[tokio::test]
async fn validate_signature() {
    let mut rng = thread_rng();
    let key: [u8; 32] = rng.gen();
    let priv_key = SecretKey::parse(&key).unwrap();
    let secp_pubkey = PublicKey::from_secret_key(&priv_key);
    let eth_address = construct_eth_address(&secp_pubkey);
    let message = [8u8; 30];

    let (signature_data, secp256_program_instruction) = construct_signature_data(&key, &message, 0);
    let (mut banks_client, payer, recent_blockhash, signer_group, group_owner) = setup().await;

    process_tx_init_signer_group(
        &signer_group.pubkey(),
        &group_owner.pubkey(),
        &payer,
        recent_blockhash,
        &mut banks_client,
    )
    .await
    .unwrap();

    let valid_signer = Keypair::new();

    create_account(
        &mut banks_client,
        &payer,
        &recent_blockhash,
        &valid_signer,
        state::ValidSigner::LEN,
    )
    .await
    .unwrap();

    process_tx_init_valid_signer(
        &valid_signer.pubkey(),
        &signer_group.pubkey(),
        &group_owner,
        &payer,
        recent_blockhash,
        &mut banks_client,
        eth_address,
    )
    .await
    .unwrap();

    let mut transaction = Transaction::new_with_payer(
        &[
            secp256_program_instruction,
            instruction::validate_signature(
                &id(),
                &valid_signer.pubkey(),
                &signer_group.pubkey(),
                signature_data,
            )
            .unwrap(),
        ],
        Some(&payer.pubkey()),
    );
    transaction.sign(&[&payer], recent_blockhash);
    banks_client.process_transaction(transaction).await.unwrap();
}

// This test validates that an incorrectly configured SecpSignatureOffsets struct
// cannot be used to bypass signature recovery
// The exploit is to provide 2 SECP instructions, with the 2nd having all 'index' fields
// point to the first dummy instructions, which results in validation of the SECP program passing
// incorrectly if the program's logic does not handle this, there
#[tokio::test]
async fn validate_signature_index_exploit() {
    let mut rng = thread_rng();
    let key: [u8; 32] = rng.gen();
    let priv_key = SecretKey::parse(&key).unwrap();
    let secp_pubkey = PublicKey::from_secret_key(&priv_key);
    let eth_address = construct_eth_address(&secp_pubkey);
    let message = [8u8; 30];

    let (mut banks_client, payer, recent_blockhash, signer_group, group_owner) = setup().await;

    process_tx_init_signer_group(
        &signer_group.pubkey(),
        &group_owner.pubkey(),
        &payer,
        recent_blockhash,
        &mut banks_client,
    )
    .await
    .unwrap();

    let valid_signer = Keypair::new();

    create_account(
        &mut banks_client,
        &payer,
        &recent_blockhash,
        &valid_signer,
        state::ValidSigner::LEN,
    )
    .await
    .unwrap();

    process_tx_init_valid_signer(
        &valid_signer.pubkey(),
        &signer_group.pubkey(),
        &group_owner,
        &payer,
        recent_blockhash,
        &mut banks_client,
        eth_address,
    )
    .await
    .unwrap();

    let fake_sk = libsecp256k1::SecretKey::random(&mut rand_073::thread_rng());
    let eth_addr_offset = 12;
    let eth_sig_offset = 32;
    let msg_offset = 97;

    // Create signature offsets struct pointing to the wrong index (0)
    let dummy_instr_data_ind = 0;
    let secp_offsets_struct = SecpSignatureOffsets {
        eth_address_instruction_index: dummy_instr_data_ind,
        message_instruction_index: dummy_instr_data_ind,
        signature_instruction_index: dummy_instr_data_ind,
        eth_address_offset: eth_addr_offset as u16,
        message_data_offset: msg_offset as u16,
        message_data_size: message.len() as u16,
        signature_offset: eth_sig_offset as u16,
    };

    let mut secp_instr_data = vec![];
    secp_instr_data.push(1u8); // count
    secp_instr_data.append(&mut bincode::serialize(&secp_offsets_struct).unwrap());
    // Here's where we put the real pubkey, which our processor tries to validate
    secp_instr_data.extend_from_slice(&eth_address);
    // Append dummy signature data
    let mut dummy_sig = (0..65).collect();
    secp_instr_data.append(&mut dummy_sig);
    // Append the real message
    secp_instr_data.append(&mut message.to_vec());

    // Sign the real message expected by the program with the fake secret key
    // Ensures recovery step passes
    let dummy2 = new_secp256k1_instruction(&fake_sk, &message);
    let fake_secp_instruction = Instruction {
        program_id: secp256k1_program::id(),
        accounts: vec![],
        data: secp_instr_data.clone(),
    };

    let start = 1;
    let end = start + state::SecpSignatureOffsets::SIGNATURE_OFFSETS_SERIALIZED_SIZE;
    let offsets = state::SecpSignatureOffsets::try_from_slice(&dummy2.data[start..end]).unwrap();

    let sig_start = offsets.signature_offset as usize;
    let sig_end = sig_start + state::SecpSignatureOffsets::SECP_SIGNATURE_SIZE;
    let recovery_id = dummy2.data[sig_end];

    let signature_data = instruction::SignatureData {
        recovery_id,
        message: message.to_vec(),
    };

    let mut transaction = Transaction::new_with_payer(
        &[
            dummy2,
            fake_secp_instruction,
            instruction::validate_signature(
                &id(),
                &valid_signer.pubkey(),
                &signer_group.pubkey(),
                signature_data,
            )
            .unwrap(),
        ],
        Some(&payer.pubkey()),
    );
    transaction.sign(&[&payer], recent_blockhash);
    let feature_set = Arc::new(FeatureSet::all_enabled());
    assert!(transaction.verify_precompiles(&feature_set).is_ok());
    // This fails because when verifying the instructions, we verify the length of provided instructions
    // aginst the length of the provided signature data array
    let transaction_error = banks_client.process_transaction(transaction).await;
    assert!(transaction_error.is_err());
}

#[tokio::test]
async fn validate_signature_with_wrong_signer() {
    let mut rng = thread_rng();
    let key: [u8; 32] = rng.gen();
    let priv_key = SecretKey::parse(&key).unwrap();
    let secp_pubkey = PublicKey::from_secret_key(&priv_key);
    let eth_address = construct_eth_address(&secp_pubkey);
    let message = [1u8; 29];

    // Sign with an incorrect private key not matching the public eth address for this ValidSigner
    let priv_key_2 = SecretKey::parse(&rng.gen()).unwrap();
    let secp256_program_instruction =
        secp256k1_instruction::new_secp256k1_instruction(&priv_key_2, &message);

    let start = 1;
    let end = start + state::SecpSignatureOffsets::SIGNATURE_OFFSETS_SERIALIZED_SIZE;
    let offsets =
        state::SecpSignatureOffsets::try_from_slice(&secp256_program_instruction.data[start..end])
            .unwrap();

    let sig_start = offsets.signature_offset as usize;
    let sig_end = sig_start + state::SecpSignatureOffsets::SECP_SIGNATURE_SIZE;
    let recovery_id = secp256_program_instruction.data[sig_end];

    let signature_data = instruction::SignatureData {
        recovery_id,
        message: message.to_vec(),
    };

    let (mut banks_client, payer, recent_blockhash, signer_group, group_owner) = setup().await;

    process_tx_init_signer_group(
        &signer_group.pubkey(),
        &group_owner.pubkey(),
        &payer,
        recent_blockhash,
        &mut banks_client,
    )
    .await
    .unwrap();

    let valid_signer = Keypair::new();

    create_account(
        &mut banks_client,
        &payer,
        &recent_blockhash,
        &valid_signer,
        state::ValidSigner::LEN,
    )
    .await
    .unwrap();

    process_tx_init_valid_signer(
        &valid_signer.pubkey(),
        &signer_group.pubkey(),
        &group_owner,
        &payer,
        recent_blockhash,
        &mut banks_client,
        eth_address,
    )
    .await
    .unwrap();

    let mut transaction = Transaction::new_with_payer(
        &[
            secp256_program_instruction,
            instruction::validate_signature(
                &id(),
                &valid_signer.pubkey(),
                &signer_group.pubkey(),
                signature_data,
            )
            .unwrap(),
        ],
        Some(&payer.pubkey()),
    );
    transaction.sign(&[&payer], recent_blockhash);
    let transaction_error = banks_client.process_transaction(transaction).await;

    assert!(transaction_error.is_err());
}

#[tokio::test]
async fn validate_3_signatures_add_new_valid_signer() {
    let (mut banks_client, payer, recent_blockhash, signer_group, group_owner) = setup().await;

    process_tx_init_signer_group(
        &signer_group.pubkey(),
        &group_owner.pubkey(),
        &payer,
        recent_blockhash,
        &mut banks_client,
    )
    .await
    .unwrap();

    let mut rng = thread_rng();

    let (key_1, _priv_key_1, _secp_pubkey_1, _eth_address_1, valid_signer_1) = create_valid_signer(
        &mut rng,
        &mut banks_client,
        &payer,
        recent_blockhash,
        &signer_group.pubkey(),
        &group_owner,
    )
    .await;

    let (key_2, _priv_key_2, _secp_pubkey_2, _eth_address_2, valid_signer_2) = create_valid_signer(
        &mut rng,
        &mut banks_client,
        &payer,
        recent_blockhash,
        &signer_group.pubkey(),
        &group_owner,
    )
    .await;

    let (key_3, _priv_key_3, _secp_pubkey_3, _eth_address_3, valid_signer_3) = create_valid_signer(
        &mut rng,
        &mut banks_client,
        &payer,
        recent_blockhash,
        &signer_group.pubkey(),
        &group_owner,
    )
    .await;

    // Shared message
    let message_timestamp = Utc::now().timestamp();
    // let message_timestamp = (Utc.ymd(2014, 7, 8).and_hms(9, 10, 11)).timestamp(); // `2014-07-08T09:10:11Z`

    let message = message_timestamp.to_le_bytes();
    // Old timestamp for testing
    let (signature_data_1, secp256_program_instruction_1) =
        construct_signature_data(&key_1, &message, 0);
    let (signature_data_2, secp256_program_instruction_2) =
        construct_signature_data(&key_2, &message, 1);
    let (signature_data_3, secp256_program_instruction_3) =
        construct_signature_data(&key_3, &message, 2);

    // Initialize incoming valid signer data
    let new_valid_signer = Keypair::new();
    create_account(
        &mut banks_client,
        &payer,
        &recent_blockhash,
        &new_valid_signer,
        state::ValidSigner::LEN,
    )
    .await
    .unwrap();

    // Disable SignerGroup owner
    process_tx_init_disable_signer_group_owner(
        &signer_group.pubkey(),
        &group_owner,
        &payer,
        recent_blockhash,
        &mut banks_client,
    )
    .await
    .unwrap();

    // Confirm owner has been disabled
    let disabled_signer_group_account =
        get_account(&mut banks_client, &signer_group.pubkey()).await;
    let disabled_signer_group_data =
        state::SignerGroup::try_from_slice(&disabled_signer_group_account.data.as_slice()).unwrap();
    assert!(disabled_signer_group_data.is_initialized());
    assert!(!disabled_signer_group_data.owner_enabled);

    // Initialize ValidSigner ethereum address information
    let new_key: [u8; 32] = rng.gen();
    let new_priv_key = SecretKey::parse(&new_key).unwrap();
    let new_secp_pubkey = PublicKey::from_secret_key(&new_priv_key);
    let new_eth_address = construct_eth_address(&new_secp_pubkey);

    // Execute multiple transactions
    let mut transaction = Transaction::new_with_payer(
        &[
            secp256_program_instruction_1,
            secp256_program_instruction_2,
            secp256_program_instruction_3,
            instruction::validate_multiple_signatures_add_signer(
                &id(),
                &valid_signer_1.pubkey(),
                &valid_signer_2.pubkey(),
                &valid_signer_3.pubkey(),
                &signer_group.pubkey(),
                &new_valid_signer.pubkey(),
                signature_data_1.clone(),
                signature_data_2.clone(),
                signature_data_3.clone(),
                new_eth_address,
            )
            .unwrap(),
        ],
        Some(&payer.pubkey()),
    );
    transaction.sign(&[&payer], recent_blockhash);
    banks_client.process_transaction(transaction).await.unwrap();

    let new_valid_signer_acct = get_account(&mut banks_client, &new_valid_signer.pubkey()).await;
    let new_valid_signer_data =
        state::ValidSigner::try_from_slice(&new_valid_signer_acct.data.as_slice()).unwrap();
    assert!(new_valid_signer_data.is_initialized());
    assert_eq!(new_valid_signer_data.eth_address, new_eth_address);
    assert_eq!(new_valid_signer_data.signer_group, signer_group.pubkey());
}
