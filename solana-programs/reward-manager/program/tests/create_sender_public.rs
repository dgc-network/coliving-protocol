#![cfg(feature = "test-bpf")]
mod utils;
use coliving_reward_manager::{
    instruction,
    processor::SENDER_SEED_PREFIX,
    state::{SenderAccount, ADD_SENDER_MESSAGE_PREFIX},
    utils::{find_derived_pair, EthereumAddress},
};
use libsecp256k1::SecretKey;
use rand::Rng;
use solana_program::instruction::InstructionError;
use solana_program::{instruction::Instruction, pubkey::Pubkey};
use solana_program_test::*;
use solana_sdk::{
    secp256k1_instruction::construct_eth_pubkey,
    signature::Keypair,
    signer::Signer,
    transaction::{Transaction, TransactionError},
    transport::TransportError,
};
use std::mem::MaybeUninit;
use utils::*;

#[tokio::test]
/// Test successfully creating a sender (decentralized)
async fn success_create_sender_public() {
    let TestConstants {
        reward_manager,
        mut context,
        manager_account,
        mut rng,
        ..
    } = setup_test_environment().await;

    // Address that will be added through create_sender_public
    let eth_address: EthereumAddress = rng.gen();
    let operator: EthereumAddress = rng.gen();

    let operators: [EthereumAddress; 3] = rng.gen();
    let keys: [[u8; 32]; 3] = rng.gen();
    let mut signers: [Pubkey; 3] = unsafe { MaybeUninit::zeroed().assume_init() };

    // Bootstrap senders through manager
    for (i, key) in keys.iter().enumerate() {
        let derived_address = create_sender_from(
            &reward_manager,
            &manager_account,
            &mut context,
            key,
            operators[i],
        )
        .await;
        signers[i] = derived_address;
    }

    let (_, derived_address, _) = find_derived_pair(
        &coliving_reward_manager::id(),
        &reward_manager.pubkey(),
        [SENDER_SEED_PREFIX.as_ref(), eth_address.as_ref()]
            .concat()
            .as_ref(),
    );

    let mut instructions = Vec::<Instruction>::new();

    // Insert signed instructions
    let message = [
        ADD_SENDER_MESSAGE_PREFIX.as_ref(),
        reward_manager.pubkey().as_ref(),
        eth_address.as_ref(),
    ]
    .concat();
    for item in keys.iter().enumerate() {
        let priv_key = SecretKey::parse(item.1).unwrap();
        let inst = new_secp256k1_instruction_2_0(&priv_key, message.as_ref(), item.0 as _);
        instructions.push(inst);
    }

    instructions.push(
        instruction::create_sender_public(
            &coliving_reward_manager::id(),
            &reward_manager.pubkey(),
            &context.payer.pubkey(),
            eth_address,
            operator,
            &signers,
        )
        .unwrap(),
    );

    let tx = Transaction::new_signed_with_payer(
        &instructions,
        Some(&context.payer.pubkey()),
        &[&context.payer],
        context.last_blockhash,
    );
    context.banks_client.process_transaction(tx).await.unwrap();

    assert_eq!(
        SenderAccount::new(reward_manager.pubkey(), eth_address, operator),
        context
            .banks_client
            .get_account_data_with_borsh(derived_address)
            .await
            .unwrap()
    );
}

#[tokio::test]
/// Test failure to create an existing sender
async fn failure_create_duplicate_sender() {
    let TestConstants {
        reward_manager,
        mut context,
        manager_account,
        mut rng,
        ..
    } = setup_test_environment().await;

    // Address that will be added through create_sender_public
    let eth_address: EthereumAddress = rng.gen();
    let operator: EthereumAddress = rng.gen();

    let operators: [EthereumAddress; 3] = rng.gen();
    let keys: [[u8; 32]; 3] = rng.gen();
    let mut signers: [Pubkey; 3] = unsafe { MaybeUninit::zeroed().assume_init() };

    // Bootstrap senders through manager
    for (i, key) in keys.iter().enumerate() {
        let derived_address = create_sender_from(
            &reward_manager,
            &manager_account,
            &mut context,
            key,
            operators[i],
        )
        .await;
        signers[i] = derived_address;
    }

    let (_, derived_address, _) = find_derived_pair(
        &coliving_reward_manager::id(),
        &reward_manager.pubkey(),
        [SENDER_SEED_PREFIX.as_ref(), eth_address.as_ref()]
            .concat()
            .as_ref(),
    );

    let message = [
        ADD_SENDER_MESSAGE_PREFIX.as_ref(),
        reward_manager.pubkey().as_ref(),
        eth_address.as_ref(),
    ]
    .concat();

    let mut instructions = Vec::<Instruction>::new();

    // Insert signed instructions
    for item in keys.iter().enumerate() {
        let priv_key = SecretKey::parse(item.1).unwrap();
        let inst = new_secp256k1_instruction_2_0(&priv_key, message.as_ref(), item.0 as _);
        instructions.push(inst);
    }

    instructions.push(
        instruction::create_sender_public(
            &coliving_reward_manager::id(),
            &reward_manager.pubkey(),
            &context.payer.pubkey(),
            eth_address,
            operator,
            &signers,
        )
        .unwrap(),
    );

    let tx = Transaction::new_signed_with_payer(
        &instructions,
        Some(&context.payer.pubkey()),
        &[&context.payer],
        context.last_blockhash,
    );
    context.banks_client.process_transaction(tx).await.unwrap();

    assert_eq!(
        SenderAccount::new(reward_manager.pubkey(), eth_address, operator),
        context
            .banks_client
            .get_account_data_with_borsh(derived_address)
            .await
            .unwrap()
    );

    // Attempt to add identical sender again
    let mut instructions_2 = Vec::<Instruction>::new();
    for item in keys.iter().enumerate() {
        let priv_key = SecretKey::parse(item.1).unwrap();
        let inst = new_secp256k1_instruction_2_0(&priv_key, message.as_ref(), item.0 as _);
        instructions_2.push(inst);
    }

    instructions_2.push(
        instruction::create_sender_public(
            &coliving_reward_manager::id(),
            &reward_manager.pubkey(),
            &context.payer.pubkey(),
            eth_address,
            operator,
            &signers,
        )
        .unwrap(),
    );
    let latest_blockhash = context.banks_client.get_recent_blockhash().await.unwrap();
    let failed_tx = Transaction::new_signed_with_payer(
        &instructions_2,
        Some(&context.payer.pubkey()),
        &[&context.payer],
        latest_blockhash,
    );
    let failed_tx_result = context.banks_client.process_transaction(failed_tx).await;
    // Confirm failure to create identical sender
    assert!(failed_tx_result.is_err());
}

#[tokio::test]
/// Test that creating a sender fails if the signatures
/// don't match known senders
async fn failure_create_sender_public_mismatched_signature_to_pubkey() {
    let TestConstants {
        reward_manager,
        mut context,
        manager_account,
        mut rng,
        ..
    } = setup_test_environment().await;

    let eth_address: EthereumAddress = rng.gen();

    let operators: [EthereumAddress; 3] = rng.gen();
    let operator: EthereumAddress = rng.gen();
    let keys: [[u8; 32]; 3] = rng.gen();
    let mut signers: [Pubkey; 3] = unsafe { MaybeUninit::zeroed().assume_init() };

    // use new pubkeys as signers instead of deriving them from keys
    for i in 0..keys.len() {
        signers[i] = Keypair::new().pubkey();
    }

    // Create senders
    for (i, key) in keys.iter().enumerate() {
        create_sender_from(
            &reward_manager,
            &manager_account,
            &mut context,
            key,
            operators[i],
        )
        .await;
    }

    let mut instructions = Vec::<Instruction>::new();

    // Insert signs instructions
    let message = [
        ADD_SENDER_MESSAGE_PREFIX.as_ref(),
        reward_manager.pubkey().as_ref(),
        eth_address.as_ref(),
    ]
    .concat();
    for item in keys.iter().enumerate() {
        let priv_key = SecretKey::parse(item.1).unwrap();
        let inst = new_secp256k1_instruction_2_0(&priv_key, message.as_ref(), item.0 as _);
        instructions.push(inst);
    }

    instructions.push(
        instruction::create_sender_public(
            &coliving_reward_manager::id(),
            &reward_manager.pubkey(),
            &context.payer.pubkey(),
            eth_address,
            operator,
            &signers,
        )
        .unwrap(),
    );

    let tx = Transaction::new_signed_with_payer(
        &instructions,
        Some(&context.payer.pubkey()),
        &[&context.payer],
        context.last_blockhash,
    );
    let tx_result = context.banks_client.process_transaction(tx).await;

    match tx_result {
        Err(TransportError::TransactionError(TransactionError::InstructionError(
            3,
            InstructionError::BorshIoError(_),
        ))) => assert!(true),
        _ => panic!("Returned incorrect error!"),
    }
}

#[tokio::test]
/// Test adding sender fails if the senders don't match the signers
async fn failure_create_sender_public_mismatched_pubkey_to_signature() {
    let TestConstants {
        reward_manager,
        mut context,
        manager_account,
        mut rng,
        ..
    } = setup_test_environment().await;

    let eth_address: EthereumAddress = rng.gen();
    let operator: EthereumAddress = rng.gen();
    let keys: [[u8; 32]; 3] = rng.gen();
    let mut signers: [Pubkey; 3] = unsafe { MaybeUninit::zeroed().assume_init() };

    for item in keys.iter().enumerate() {
        signers[item.0] = Keypair::new().pubkey();
    }

    // Create senders
    for _ in 0..keys.len() {
        // use random keys instead of actual private keys used above
        let sender_priv_key = SecretKey::parse(&rng.gen()).unwrap();
        let secp_pubkey = libsecp256k1::PublicKey::from_secret_key(&sender_priv_key);
        let eth_address = construct_eth_pubkey(&secp_pubkey);
        let operator: EthereumAddress = rng.gen();
        create_sender(
            &mut context,
            &reward_manager.pubkey(),
            &manager_account,
            eth_address,
            operator,
        )
        .await;
    }

    let mut instructions = Vec::<Instruction>::new();

    // Insert signs instructions
    let message = [
        ADD_SENDER_MESSAGE_PREFIX.as_ref(),
        reward_manager.pubkey().as_ref(),
        eth_address.as_ref(),
    ]
    .concat();
    for item in keys.iter().enumerate() {
        let priv_key = SecretKey::parse(item.1).unwrap();
        let inst = new_secp256k1_instruction_2_0(&priv_key, message.as_ref(), item.0 as _);
        instructions.push(inst);
    }

    instructions.push(
        instruction::create_sender_public(
            &coliving_reward_manager::id(),
            &reward_manager.pubkey(),
            &context.payer.pubkey(),
            eth_address,
            operator,
            &signers,
        )
        .unwrap(),
    );

    let tx = Transaction::new_signed_with_payer(
        &instructions,
        Some(&context.payer.pubkey()),
        &[&context.payer],
        context.last_blockhash,
    );
    let tx_result = context.banks_client.process_transaction(tx).await;
    println!("{:?}", tx_result);

    match tx_result {
        Err(TransportError::TransactionError(TransactionError::InstructionError(
            3,
            InstructionError::BorshIoError(_),
        ))) => assert!(true),
        _ => panic!("Returned incorrect error!"),
    }
}

#[tokio::test]
/// Test creating sender doesn't work if insufficient number of attestations
async fn failure_create_sender_missing_attestations() {
    let TestConstants {
        reward_manager,
        mut context,
        manager_account,
        mut rng,
        ..
    } = setup_test_environment().await;

    let eth_address: EthereumAddress = rng.gen();
    let operator: EthereumAddress = rng.gen();

    let operators: [EthereumAddress; 2] = rng.gen();
    let keys: [[u8; 32]; 2] = rng.gen();
    let mut signers: [Pubkey; 2] = unsafe { MaybeUninit::zeroed().assume_init() };

    for (i, key) in keys.iter().enumerate() {
        let derived_address = create_sender_from(
            &reward_manager,
            &manager_account,
            &mut context,
            key,
            operators[i],
        )
        .await;
        signers[i] = derived_address;
    }

    let mut instructions = Vec::<Instruction>::new();

    // Insert signs instructions, but only from 2 senders
    let message = [
        ADD_SENDER_MESSAGE_PREFIX.as_ref(),
        reward_manager.pubkey().as_ref(),
        eth_address.as_ref(),
    ]
    .concat();
    for item in keys.iter().enumerate() {
        let priv_key = SecretKey::parse(item.1).unwrap();
        let inst = new_secp256k1_instruction_2_0(&priv_key, message.as_ref(), item.0 as _);
        instructions.push(inst);
    }

    instructions.push(
        instruction::create_sender_public(
            &coliving_reward_manager::id(),
            &reward_manager.pubkey(),
            &context.payer.pubkey(),
            eth_address,
            operator,
            &signers,
        )
        .unwrap(),
    );

    let tx = Transaction::new_signed_with_payer(
        &instructions,
        Some(&context.payer.pubkey()),
        &[&context.payer],
        context.last_blockhash,
    );
    let res = context.banks_client.process_transaction(tx).await;
    assert_custom_error(
        res,
        2,
        coliving_reward_manager::error::ColivingProgramError::NotEnoughSigners,
    );
}

#[tokio::test]
/// Test creating sender fails if there are duplicate attestation senders
async fn failure_create_sender_duplicate_attestation_senders() {
    let TestConstants {
        reward_manager,
        mut context,
        manager_account,
        mut rng,
        ..
    } = setup_test_environment().await;

    let eth_address: EthereumAddress = rng.gen();
    let operator: EthereumAddress = rng.gen();

    let operators: [EthereumAddress; 3] = rng.gen();
    let keys: [[u8; 32]; 3] = rng.gen();
    let mut signers: [Pubkey; 3] = unsafe { MaybeUninit::zeroed().assume_init() };

    for (i, key) in keys.iter().enumerate() {
        let derived_address = create_sender_from(
            &reward_manager,
            &manager_account,
            &mut context,
            key,
            operators[i],
        )
        .await;
        signers[i] = derived_address;
    }

    let mut instructions = Vec::<Instruction>::new();

    let message = [
        ADD_SENDER_MESSAGE_PREFIX.as_ref(),
        reward_manager.pubkey().as_ref(),
        eth_address.as_ref(),
    ]
    .concat();

    // Add the first sender twice
    let priv_key = SecretKey::parse(&keys[0]).unwrap();
    let inst = new_secp256k1_instruction_2_0(&priv_key, message.as_ref(), 0 as _);
    instructions.push(inst);

    for item in keys[..2].iter().enumerate() {
        let priv_key = SecretKey::parse(item.1).unwrap();
        let inst = new_secp256k1_instruction_2_0(&priv_key, message.as_ref(), item.0 as u8 + 1);
        instructions.push(inst);
    }

    let signers = [signers[0], signers[0], signers[1]];

    instructions.push(
        instruction::create_sender_public(
            &coliving_reward_manager::id(),
            &reward_manager.pubkey(),
            &context.payer.pubkey(),
            eth_address,
            operator,
            &signers,
        )
        .unwrap(),
    );

    let tx = Transaction::new_signed_with_payer(
        &instructions,
        Some(&context.payer.pubkey()),
        &[&context.payer],
        context.last_blockhash,
    );
    let res = context.banks_client.process_transaction(tx).await;
    assert_custom_error(
        res,
        3,
        coliving_reward_manager::error::ColivingProgramError::RepeatedSenders,
    )
}

/// Test duplicate operators fail
#[tokio::test]
async fn failure_duplicate_operators() {
    let TestConstants {
        reward_manager,
        mut context,
        manager_account,
        mut rng,
        ..
    } = setup_test_environment().await;

    let eth_address: EthereumAddress = rng.gen();

    // Reuse the same operator 3x
    let operator: EthereumAddress = rng.gen();
    let keys: [[u8; 32]; 3] = rng.gen();
    let mut signers: [Pubkey; 3] = unsafe { MaybeUninit::zeroed().assume_init() };

    for (i, key) in keys.iter().enumerate() {
        let derived_address = create_sender_from(
            &reward_manager,
            &manager_account,
            &mut context,
            key,
            operator,
        )
        .await;
        signers[i] = derived_address;
    }

    let mut instructions = Vec::<Instruction>::new();

    // Insert signs instructions
    let message = [
        ADD_SENDER_MESSAGE_PREFIX.as_ref(),
        reward_manager.pubkey().as_ref(),
        eth_address.as_ref(),
    ]
    .concat();
    for item in keys.iter().enumerate() {
        let priv_key = SecretKey::parse(item.1).unwrap();
        let inst = new_secp256k1_instruction_2_0(&priv_key, message.as_ref(), item.0 as _);
        instructions.push(inst);
    }

    instructions.push(
        instruction::create_sender_public(
            &coliving_reward_manager::id(),
            &reward_manager.pubkey(),
            &context.payer.pubkey(),
            eth_address,
            operator,
            &signers,
        )
        .unwrap(),
    );

    let tx = Transaction::new_signed_with_payer(
        &instructions,
        Some(&context.payer.pubkey()),
        &[&context.payer],
        context.last_blockhash,
    );
    let res = context.banks_client.process_transaction(tx).await;
    assert_custom_error(
        res,
        3,
        coliving_reward_manager::error::ColivingProgramError::OperatorCollision,
    );
}
