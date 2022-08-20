import * as anchor from "@project-serum/anchor";
import { Program } from "@project-serum/anchor";
import Web3 from "web3";
import { Account } from "web3-core";
import { expect } from "chai";
import {
  findDerivedPair,
  getTransaction,
  randomCID,
  getTransactionWithData,
  getContentNode,
  randomId,
  convertBNToSpIdSeed,
  convertBNToUserIdSeed,
} from "../lib/utils";
import {
  createContentNode,
  createUser,
  createAgreement,
  createContentList,
  initUser,
  initUserSolPubkey,
  deleteAgreement,
  updateAgreement,
  EntityTypesEnumValues,
  ManagementActions,
  deleteContentList,
  updateContentList,
  updateAdmin,
  initAuthorityDelegationStatus,
  addUserAuthorityDelegate,
} from "../lib/lib";
import { ColivingData } from "../target/types/coliving_data";

const { PublicKey, SystemProgram } = anchor.web3;

export const EthWeb3 = new Web3();
const DefaultPubkey = new PublicKey("11111111111111111111111111111111");

type InitTestConsts = {
  ethAccount: Account;
  metadata: string;
  userId: anchor.BN;
};

export const initTestConstants = (): InitTestConsts => {
  const ethAccount = EthWeb3.eth.accounts.create();
  const metadata = randomCID();
  const userId = randomId();

  return {
    ethAccount,
    userId,
    metadata,
  };
};

export const testInitUser = async ({
  provider,
  program,
  baseAuthorityAccount,
  ethAddress,
  userId,
  bumpSeed,
  metadata,
  userAccount,
  adminAccountKeypair,
  adminKeypair,
  replicaSet,
  replicaSetBumps,
  cn1,
  cn2,
  cn3,
}) => {
  const tx = initUser({
    payer: provider.wallet.publicKey,
    program,
    ethAddress,
    replicaSet,
    replicaSetBumps,
    userId,
    bumpSeed,
    metadata,
    userAccount,
    baseAuthorityAccount,
    adminAccount: adminAccountKeypair.publicKey,
    adminAuthorityPublicKey: adminKeypair.publicKey,
    cn1,
    cn2,
    cn3,
  });
  const txSignature = await provider.sendAndConfirm(tx, [adminKeypair]);

  const account = await program.account.user.fetch(userAccount);

  const chainEthAddress = EthWeb3.utils.bytesToHex(account.ethAddress);
  expect(chainEthAddress, "eth address").to.equal(ethAddress.toLowerCase());
  const chainAuthority = account.authority.toString();
  const expectedAuthority = DefaultPubkey.toString();
  expect(chainAuthority, "authority").to.equal(expectedAuthority);

  const { decodedInstruction, decodedData } = await getTransactionWithData(
    program,
    provider,
    txSignature,
    0
  );

  expect(decodedInstruction.name).to.equal("initUser");
  expect(decodedData.metadata).to.equal(metadata);
};

export const testInitUserSolPubkey = async ({
  provider,
  program,
  message,
  ethPrivateKey,
  newUserPublicKey,
  userAccount,
}) => {
  const tx = initUserSolPubkey({
    program,
    ethPrivateKey,
    message,
    userAuthorityPublicKey: newUserPublicKey,
    userAccount,
  });

  const txSignature = await provider.sendAndConfirm(tx);

  const { decodedInstruction, decodedData } = await getTransactionWithData(
    program,
    provider,
    txSignature,
    1
  );

  expect(decodedInstruction.name).to.equal("initUserSol");
  expect(decodedData.userAuthority.toString()).to.equal(
    newUserPublicKey.toString()
  );

  const account = await program.account.user.fetch(userAccount);

  const chainAuthority = account.authority.toString();
  const expectedAuthority = newUserPublicKey.toString();
  expect(chainAuthority, "authority").to.equal(expectedAuthority);
};

export const testCreateUser = async ({
  provider,
  program,
  message,
  baseAuthorityAccount,
  ethAccount,
  bumpSeed,
  metadata,
  newUserKeypair,
  userAccount,
  adminAccount,
  replicaSet,
  replicaSetBumps,
  cn1,
  cn2,
  cn3,
  userId,
}) => {
  const tx = createUser({
    payer: provider.wallet.publicKey,
    program,
    ethAccount,
    message,
    bumpSeed,
    replicaSet,
    replicaSetBumps,
    metadata,
    userAuthorityPublicKey: newUserKeypair.publicKey,
    userAccount,
    adminAccount,
    baseAuthorityAccount,
    cn1,
    cn2,
    cn3,
    userId,
  });
  const txSignature = await provider.sendAndConfirm(tx);

  const { decodedInstruction, decodedData, accountPubKeys } =
    await getTransactionWithData(program, provider, txSignature, 1);

  expect(decodedInstruction.name).to.equal("createUser");
  expect(decodedData.base.toString()).to.equal(baseAuthorityAccount.toString());
  expect(decodedData.ethAddress).to.deep.equal([
    ...anchor.utils.bytes.hex.decode(ethAccount.address),
  ]);
  expect(decodedData.userId).to.deep.equal(userId.toNumber());
  expect(decodedData.userBump).to.equal(bumpSeed);
  expect(decodedData.metadata).to.equal(metadata);
  expect(accountPubKeys[0]).to.equal(userAccount.toString());
  expect(accountPubKeys[5]).to.equal(adminAccount.toString());

  const account = await program.account.user.fetch(userAccount);

  const chainEthAddress = EthWeb3.utils.bytesToHex(account.ethAddress);
  expect(chainEthAddress, "eth address").to.equal(
    ethAccount.address.toLowerCase()
  );

  const chainAuthority = account.authority.toString();
  const expectedAuthority = newUserKeypair.publicKey.toString();
  expect(chainAuthority, "authority").to.equal(expectedAuthority);
};

export const testCreateAgreement = async ({
  provider,
  program,
  id,
  baseAuthorityAccount,
  userId,
  bumpSeed,
  adminAccount,
  agreementMetadata,
  userAuthorityKeypair,
  agreementOwnerAccount,
  userAuthorityDelegateAccount,
  authorityDelegationStatusAccount,
}) => {
  const tx = await createAgreement({
    id,
    program,
    userAuthorityPublicKey: userAuthorityKeypair.publicKey,
    userAccount: agreementOwnerAccount,
    userAuthorityDelegateAccount,
    authorityDelegationStatusAccount,
    metadata: agreementMetadata,
    baseAuthorityAccount,
    userId,
    adminAccount,
    bumpSeed,
  });
  const txSignature = await provider.sendAndConfirm(tx, [userAuthorityKeypair]);

  const { decodedInstruction, decodedData, accountPubKeys } =
    await getTransactionWithData(program, provider, txSignature, 0);
  // Validate instruction data
  expect(decodedInstruction.name).to.equal("manageEntity");
  expect(decodedData.id.toString()).to.deep.equal(id.toString());
  expect(decodedData.metadata).to.equal(agreementMetadata);
  expect(decodedData.entityType).to.deep.equal(EntityTypesEnumValues.agreement);
  expect(decodedData.managementAction).to.deep.equal(ManagementActions.create);
  // Assert on instruction struct
  // 1st index = agreement owner user storage account
  // 2nd index = user authority keypair
  // Indexing code must check that the agreement owner PDA is known before processing
  expect(accountPubKeys[1]).to.equal(agreementOwnerAccount.toString());
  expect(accountPubKeys[2]).to.equal(userAuthorityKeypair.publicKey.toString());
};

export const testDeleteAgreement = async ({
  provider,
  program,
  id,
  agreementOwnerAccount,
  userAuthorityDelegateAccount,
  authorityDelegationStatusAccount,
  userAuthorityKeypair,
  baseAuthorityAccount,
  userId,
  bumpSeed,
  adminAccount,
}) => {
  const tx = deleteAgreement({
    id,
    program,
    userAccount: agreementOwnerAccount,
    userAuthorityDelegateAccount,
    authorityDelegationStatusAccount,
    userAuthorityPublicKey: userAuthorityKeypair.publicKey,
    baseAuthorityAccount,
    userId,
    bumpSeed,
    adminAccount,
  });
  const txSignature = await provider.sendAndConfirm(tx, [userAuthorityKeypair]);

  const { decodedInstruction, decodedData, accountPubKeys } =
    await getTransactionWithData(program, provider, txSignature, 0);
  expect(decodedInstruction.name).to.equal("manageEntity");
  expect(decodedData.id.toString()).to.equal(id.toString());
  expect(decodedData.entityType).to.deep.equal(EntityTypesEnumValues.agreement);
  expect(decodedData.managementAction).to.deep.equal(ManagementActions.delete);
  // Assert on instruction struct
  // 0th index = agreement owner user storage account
  // 1st index = user authority keypair
  // Indexing code must check that the agreement owner PDA is known before processing
  expect(accountPubKeys[1]).to.equal(agreementOwnerAccount.toString());
  expect(accountPubKeys[2]).to.equal(userAuthorityKeypair.publicKey.toString());
};

export const testUpdateAgreement = async ({
  provider,
  program,
  id,
  userAccount,
  userAuthorityDelegateAccount,
  authorityDelegationStatusAccount,
  metadata,
  userAuthorityKeypair,
  baseAuthorityAccount,
  userId,
  bumpSeed,
  adminAccount,
}) => {
  const tx = await updateAgreement({
    program,
    baseAuthorityAccount,
    userId,
    bumpSeed,
    adminAccount,
    id,
    userAccount,
    userAuthorityDelegateAccount,
    authorityDelegationStatusAccount,
    metadata,
    userAuthorityPublicKey: userAuthorityKeypair.publicKey,
  });
  const txSignature = await provider.sendAndConfirm(tx, [userAuthorityKeypair]);
  const { decodedInstruction, decodedData, accountPubKeys } =
    await getTransactionWithData(program, provider, txSignature, 0);

  // Validate instruction data
  expect(decodedInstruction.name).to.equal("manageEntity");
  expect(decodedData.id.toString()).to.equal(id.toString());
  expect(decodedData.metadata).to.equal(metadata);
  expect(decodedData.entityType).to.deep.equal(EntityTypesEnumValues.agreement);
  expect(decodedData.managementAction).to.deep.equal(ManagementActions.update);
  // Assert on instruction struct
  // 0th index = agreement owner user storage account
  // 1st index = user authority keypair
  // Indexing code must check that the agreement owner PDA is known before processing
  expect(accountPubKeys[1]).to.equal(userAccount.toString());
  expect(accountPubKeys[2]).to.equal(userAuthorityKeypair.publicKey.toString());
};

export const testCreateContentList = async ({
  provider,
  program,
  id,
  baseAuthorityAccount,
  userId,
  bumpSeed,
  adminAccount,
  contentListMetadata,
  userAuthorityKeypair,
  contentListOwner,
  userAuthorityDelegateAccount,
  authorityDelegationStatusAccount,
}) => {
  const tx = await createContentList({
    id,
    program,
    userAuthorityPublicKey: userAuthorityKeypair.publicKey,
    userAccount: contentListOwner,
    userAuthorityDelegateAccount,
    authorityDelegationStatusAccount,
    metadata: contentListMetadata,
    baseAuthorityAccount,
    userId,
    adminAccount,
    bumpSeed,
  });

  const txSignature = await provider.sendAndConfirm(tx, [userAuthorityKeypair]);

  const { decodedInstruction, decodedData, accountPubKeys } =
    await getTransactionWithData(program, provider, txSignature, 0);
  // Validate instruction data
  expect(decodedInstruction.name).to.equal("manageEntity");
  expect(decodedData.id.toString()).to.equal(id.toString());
  expect(decodedData.metadata).to.equal(contentListMetadata);
  expect(decodedData.entityType).to.deep.equal(EntityTypesEnumValues.contentList);
  expect(decodedData.managementAction).to.deep.equal(ManagementActions.create);
  // Assert on instruction struct
  // 1st index = contentList owner user storage account
  // 2nd index = user authority keypair
  // Indexing code must check that the contentList owner PDA is known before processing
  expect(accountPubKeys[1]).to.equal(contentListOwner.toString());
  expect(accountPubKeys[2]).to.equal(userAuthorityKeypair.publicKey.toString());
};

export const testDeleteContentList = async ({
  provider,
  program,
  id,
  contentListOwner,
  userAuthorityDelegateAccount,
  authorityDelegationStatusAccount,
  userAuthorityKeypair,
  baseAuthorityAccount,
  userId,
  bumpSeed,
  adminAccount,
}) => {
  const tx = await deleteContentList({
    id,
    program,
    userAccount: contentListOwner,
    userAuthorityDelegateAccount,
    authorityDelegationStatusAccount,
    userAuthorityPublicKey: userAuthorityKeypair.publicKey,
    baseAuthorityAccount,
    userId,
    bumpSeed,
    adminAccount,
  });
  const txSignature = await provider.sendAndConfirm(tx, [userAuthorityKeypair]);
  const { decodedInstruction, decodedData, accountPubKeys } =
    await getTransactionWithData(program, provider, txSignature, 0);
  expect(decodedInstruction.name).to.equal("manageEntity");
  expect(decodedData.id.toString()).to.equal(id.toString());
  expect(decodedData.entityType).to.deep.equal(EntityTypesEnumValues.contentList);
  expect(decodedData.managementAction).to.deep.equal(ManagementActions.delete);
  // Assert on instruction struct
  // 0th index = contentList owner user storage account
  // 1st index = user authority keypair
  // Indexing code must check that the contentList owner PDA is known before processing
  expect(accountPubKeys[1]).to.equal(contentListOwner.toString());
  expect(accountPubKeys[2]).to.equal(userAuthorityKeypair.publicKey.toString());
};

export const testUpdateContentList = async ({
  provider,
  program,
  id,
  userAccount,
  userAuthorityDelegateAccount,
  authorityDelegationStatusAccount,
  metadata,
  userAuthorityKeypair,
  baseAuthorityAccount,
  userId,
  bumpSeed,
  adminAccount,
}) => {
  const tx = await updateContentList({
    program,
    baseAuthorityAccount,
    userId,
    bumpSeed,
    adminAccount,
    id,
    userAccount,
    userAuthorityDelegateAccount,
    authorityDelegationStatusAccount,
    metadata,
    userAuthorityPublicKey: userAuthorityKeypair.publicKey,
  });
  const txSignature = await provider.sendAndConfirm(tx, [userAuthorityKeypair]);
  const { decodedInstruction, decodedData, accountPubKeys } =
    await getTransactionWithData(program, provider, txSignature, 0);

  // Validate instruction data
  expect(decodedInstruction.name).to.equal("manageEntity");
  expect(decodedData.id.toString()).to.equal(id.toString());
  expect(decodedData.metadata).to.equal(metadata);
  expect(decodedData.entityType).to.deep.equal(EntityTypesEnumValues.contentList);
  expect(decodedData.managementAction).to.deep.equal(ManagementActions.update);
  // Assert on instruction struct
  // 0th index = contentList owner user storage account
  // 1st index = user authority keypair
  // Indexing code must check that the contentList owner PDA is known before processing
  expect(accountPubKeys[1]).to.equal(userAccount.toString());
  expect(accountPubKeys[2]).to.equal(userAuthorityKeypair.publicKey.toString());
};

export const testCreateUserDelegate = async ({
  adminKeypair,
  adminAccountKeypair,
  program,
  provider,
}) => {
  // disable admin writes
  const udpateAdminTx = updateAdmin({
    program,
    isWriteEnabled: false,
    adminAccount: adminAccountKeypair.publicKey,
    adminAuthorityKeypair: adminKeypair,
  });
  await provider.sendAndConfirm(udpateAdminTx, [adminKeypair]);

  const user = await createSolanaUser(program, provider, adminAccountKeypair);

  // Init AuthorityDelegationStatus for a new authority
  const userAuthorityDelegateKeypair = anchor.web3.Keypair.generate();
  const authorityDelegationStatusSeeds = [
    Buffer.from("authority-delegation-status", "utf8"),
    userAuthorityDelegateKeypair.publicKey.toBytes().slice(0, 32),
  ];

  const authorityDelegationStatusRes = await PublicKey.findProgramAddress(
    authorityDelegationStatusSeeds,
    program.programId
  );
  const authorityDelegationStatusAccount = authorityDelegationStatusRes[0];
  const authorityDelegationStatusBump = authorityDelegationStatusRes[1];

  const initAuthorityDelegationStatusTx = initAuthorityDelegationStatus({
    program,
    authorityName: "authority_name",
    userAuthorityDelegatePublicKey: userAuthorityDelegateKeypair.publicKey,
    authorityDelegationStatusAccount,
    payer: provider.wallet.publicKey,
  });
  const initAuthorityDelegationStatusTxSig = await provider.sendAndConfirm(
    initAuthorityDelegationStatusTx,
    [userAuthorityDelegateKeypair]
  );

  const {
    decodedInstruction: authorityDelegationInstruction,
    decodedData: authorityDelegationInstructionData,
  } = await getTransactionWithData(
    program,
    provider,
    initAuthorityDelegationStatusTxSig,
    0
  );
  expect(authorityDelegationInstruction.name).to.equal(
    "initAuthorityDelegationStatus"
  );
  expect(authorityDelegationInstructionData.authorityName).to.equal(
    "authority_name"
  );

  // New sol key that will be used as user authority delegate
  const userAuthorityDelegateSeeds = [
    user.accountAddress.toBytes().slice(0, 32),
    userAuthorityDelegateKeypair.publicKey.toBytes().slice(0, 32),
  ];
  const res = await PublicKey.findProgramAddress(
    userAuthorityDelegateSeeds,
    program.programId
  );
  const userAuthorityDelegateAccountAddress = res[0];
  const userAuthorityDelegateBump = res[1];

  const addUserAuthorityDelegateTx = addUserAuthorityDelegate({
    program,
    adminAccount: adminAccountKeypair.publicKey,
    baseAuthorityAccount: user.authority,
    userId: user.userId,
    userBumpSeed: user.bumpSeed,
    user: user.accountAddress,
    currentUserAuthorityDelegate: userAuthorityDelegateAccountAddress,
    signerUserAuthorityDelegate: SystemProgram.programId,
    authorityDelegationStatusAccount: SystemProgram.programId,
    delegatePublicKey: userAuthorityDelegateKeypair.publicKey,
    authorityPublicKey: user.keypair.publicKey,
    payer: provider.wallet.publicKey,
  });
  const addUserAuthorityDelegateTxSig = await provider.sendAndConfirm(
    addUserAuthorityDelegateTx,
    [user.keypair]
  );
  const {
    decodedInstruction: addUserAuthorityDelegateInstruction,
    decodedData: addUserAuthorityDelegateData,
  } = await getTransactionWithData(
    program,
    provider,
    addUserAuthorityDelegateTxSig,
    0
  );
  expect(addUserAuthorityDelegateInstruction.name).to.equal(
    "addUserAuthorityDelegate"
  );

  expect(addUserAuthorityDelegateData.base.toString()).to.equal(
    user.authority.toString()
  );
  expect(
    addUserAuthorityDelegateData.userIdSeedBump.userId.toString()
  ).to.equal(user.userId.toString());
  expect(addUserAuthorityDelegateData.userIdSeedBump.bump).to.equal(
    user.bumpSeed
  );
  expect(addUserAuthorityDelegateData.delegatePubkey.toString()).to.equal(
    userAuthorityDelegateKeypair.publicKey.toString()
  );

  return {
    baseAuthorityAccount: user.authority,
    userId: user.userId,
    userBumpSeed: user.bumpSeed,
    userAccountAddress: user.accountAddress,
    userAuthorityDelegateAccountAddress,
    userAuthorityDelegateBump,
    authorityDelegationStatusAccount,
    authorityDelegationStatusBump,
    userKeypair: user.keypair,
    userAuthorityDelegateKeypair,
  };
};

export const pollAccountBalance = async (args: {
  provider: anchor.Provider;
  targetAccount: anchor.web3.PublicKey;
  targetBalance: number;
  maxRetries: number;
}) => {
  let currentBalance = await args.provider.connection.getBalance(
    args.targetAccount
  );
  let numRetries = 0;
  while (currentBalance > args.targetBalance && numRetries < args.maxRetries) {
    currentBalance = await args.provider.connection.getBalance(
      args.targetAccount
    );
    numRetries--;
  }
  if (currentBalance > args.targetBalance) {
    throw new Error(
      `Account ${args.targetAccount} failed to reach target balance ${args.targetBalance} in ${args.maxRetries} retries. Current balance = ${currentBalance}`
    );
  }
};

export const confirmLogInTransaction = async (
  provider: anchor.Provider,
  tx: string,
  log: string
) => {
  const info = await getTransaction(provider, tx);

  const logs = info.meta.logMessages;
  let stringFound = false;
  logs.forEach((v) => {
    if (v.indexOf(log) !== -1) {
      stringFound = true;
    }
  });
  if (!stringFound) {
    console.log(logs);
    throw new Error(`Failed to find ${log} in tx=${tx}`);
  }
  return info;
};

export const createSolanaUser = async (
  program: Program<ColivingData>,
  provider: anchor.Provider,
  adminAccountKeypair: anchor.web3.Keypair
) => {
  const testConsts = initTestConstants();

  const {
    baseAuthorityAccount,
    bumpSeed,
    derivedAddress: userAccountAddress,
  } = await findDerivedPair(
    program.programId,
    adminAccountKeypair.publicKey,
    convertBNToUserIdSeed(testConsts.userId)
  );

  // New sol key that will be used to permission user updates
  const newUserKeypair = anchor.web3.Keypair.generate();

  // Generate signed SECP instruction
  // Message as the incoming public key
  const message = newUserKeypair.publicKey.toBytes();

  const cn1 = await getContentNode(program, adminAccountKeypair.publicKey, "1");
  const cn2 = await getContentNode(program, adminAccountKeypair.publicKey, "2");
  const cn3 = await getContentNode(program, adminAccountKeypair.publicKey, "3");

  const tx = createUser({
    payer: provider.wallet.publicKey,
    program,
    ethAccount: testConsts.ethAccount,
    message,
    bumpSeed,
    metadata: testConsts.metadata,
    userAuthorityPublicKey: newUserKeypair.publicKey,
    userAccount: userAccountAddress,
    adminAccount: adminAccountKeypair.publicKey,
    baseAuthorityAccount,
    replicaSet: [1, 2, 3],
    replicaSetBumps: [cn1.bumpSeed, cn2.bumpSeed, cn3.bumpSeed],
    cn1: cn1.derivedAddress,
    cn2: cn2.derivedAddress,
    cn3: cn3.derivedAddress,
    userId: testConsts.userId,
  });

  await provider.sendAndConfirm(tx);

  const account = await program.account.user.fetch(userAccountAddress);

  return {
    account,
    accountAddress: userAccountAddress,
    userId: testConsts.userId,
    bumpSeed,
    keypair: newUserKeypair,
    authority: baseAuthorityAccount,
  };
};

export const createSolanaContentNode = async (props: {
  program: Program<ColivingData>;
  provider: anchor.Provider;
  adminAccountKeypair: anchor.web3.Keypair;
  adminKeypair: anchor.web3.Keypair;
  spId: anchor.BN;
}) => {
  const ownerEth = EthWeb3.eth.accounts.create();
  const authority = anchor.web3.Keypair.generate();
  const seed = convertBNToSpIdSeed(props.spId);

  const { baseAuthorityAccount, bumpSeed, derivedAddress } =
    await findDerivedPair(
      props.program.programId,
      props.adminAccountKeypair.publicKey,
      seed
    );

  const tx = createContentNode({
    payer: props.provider.wallet.publicKey,
    program: props.program,
    adminAuthorityPublicKey: props.adminKeypair.publicKey,
    baseAuthorityAccount,
    adminAccount: props.adminAccountKeypair.publicKey,
    contentNodeAuthority: authority.publicKey,
    contentNodeAccount: derivedAddress,
    spID: props.spId,
    ownerEthAddress: ownerEth.address,
  });
  const txSignature = await props.provider.sendAndConfirm(tx, [
    props.adminKeypair,
  ]);

  const contentNode = await props.program.account.contentNode.fetch(
    derivedAddress
  );

  if (!contentNode) {
    throw new Error("unable to create contentList account");
  }

  return {
    ownerEthAddress: ownerEth.address,
    spId: props.spId,
    account: contentNode,
    accountAddress: derivedAddress,
    authority,
    seedBump: { seed, bump: bumpSeed },
    tx: txSignature,
  };
};
