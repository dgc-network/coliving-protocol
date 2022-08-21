import * as anchor from "@project-serum/anchor";
import { BorshInstructionCoder, Program } from "@project-serum/anchor";
import chai, { assert, expect } from "chai";
import chaiAsPromised from "chai-as-promised";
import {
  initAdmin,
  addAgreementRepost,
  addAgreementSave,
  updateAdmin,
  deleteAgreementSave,
  EntitySocialActionEnumValues,
  EntityTypesEnumValues,
  deleteAgreementRepost,
} from "../lib/lib";
import { getTransaction, randomString } from "../lib/utils";
import { ColivingData } from "../target/types/coliving_data";
//import { ColivingData } from "../programs/coliving_data";
import {
  createSolanaContentNode,
  createSolanaUser,
  testCreateUserDelegate,
} from "./test-helpers";
const { SystemProgram } = anchor.web3;

chai.use(chaiAsPromised);

const contentNodes = {};
describe("agreement-actions", function () {
  const provider = anchor.AnchorProvider.local("http://localhost:8899", {
    preflightCommitment: "confirmed",
    commitment: "confirmed",
  });

  // Configure the client to use the local cluster.
  anchor.setProvider(anchor.AnchorProvider.env());

  const program = anchor.workspace.ColivingData as Program<ColivingData>;

  const adminKeypair = anchor.web3.Keypair.generate();
  const adminAccountKeypair = anchor.web3.Keypair.generate();
  const verifierKeypair = anchor.web3.Keypair.generate();

  it("agreement actions - Initializing admin account!", async function () {
    const tx = initAdmin({
      payer: provider.wallet.publicKey,
      program,
      adminKeypair,
      adminAccountKeypair,
      verifierKeypair,
    });

    await provider.sendAndConfirm(tx, [adminAccountKeypair]);

    const adminAccount = await program.account.colivingAdmin.fetch(
      adminAccountKeypair.publicKey
    );
    if (!adminAccount.authority.equals(adminKeypair.publicKey)) {
      console.log(
        "On chain retrieved admin info: ",
        adminAccount.authority.toString()
      );
      console.log("Provided admin info: ", adminKeypair.publicKey.toString());
      throw new Error("Invalid returned values");
    }

    // disable admin writes
    const updateAdminTx = updateAdmin({
      program,
      isWriteEnabled: false,
      adminAccount: adminAccountKeypair.publicKey,
      adminAuthorityKeypair: adminKeypair,
    });

    await provider.sendAndConfirm(updateAdminTx, [adminKeypair]);
  });

  it("Initializing Content Node accounts!", async function () {
    contentNodes["1"] = await createSolanaContentNode({
      program,
      provider,
      adminKeypair,
      adminAccountKeypair,
      spId: new anchor.BN(1),
    });
    contentNodes["2"] = await createSolanaContentNode({
      program,
      provider,
      adminKeypair,
      adminAccountKeypair,
      spId: new anchor.BN(2),
    });
    contentNodes["3"] = await createSolanaContentNode({
      program,
      provider,
      adminKeypair,
      adminAccountKeypair,
      spId: new anchor.BN(3),
    });
  });

  it("Delete save for a agreement", async function () {
    const user = await createSolanaUser(program, provider, adminAccountKeypair);

    const tx = deleteAgreementSave({
      program,
      baseAuthorityAccount: user.authority,
      adminAccount: adminAccountKeypair.publicKey,
      userAccount: user.accountAddress,
      userAuthorityDelegateAccount: SystemProgram.programId,
      authorityDelegationStatusAccount: SystemProgram.programId,
      userAuthorityPublicKey: user.keypair.publicKey,
      userId: user.userId,
      bumpSeed: user.bumpSeed,
      id: randomString(10),
    });
    const txHash = await provider.sendAndConfirm(tx, [user.keypair]);
    const info = await getTransaction(provider, txHash);
    const instructionCoder = program.coder.instruction as BorshInstructionCoder;
    const decodedInstruction = instructionCoder.decode(
      info.transaction.message.instructions[0].data,
      "base58"
    );
    const userIdSeed = user.userId;
    const instructionUserId = decodedInstruction.data.userIdSeedBump.userId;
    assert.equal(instructionUserId, userIdSeed);
    expect(decodedInstruction.data.entitySocialAction).to.deep.equal(
      EntitySocialActionEnumValues.deleteSave
    );
    expect(decodedInstruction.data.entityType).to.deep.equal(
      EntityTypesEnumValues.agreement
    );
  });

  it("Save a newly created agreement", async function () {
    const user = await createSolanaUser(program, provider, adminAccountKeypair);

    const tx = addAgreementSave({
      program,
      baseAuthorityAccount: user.authority,
      adminAccount: adminAccountKeypair.publicKey,
      userAccount: user.accountAddress,
      userAuthorityDelegateAccount: SystemProgram.programId,
      authorityDelegationStatusAccount: SystemProgram.programId,
      userAuthorityPublicKey: user.keypair.publicKey,
      userId: user.userId,
      bumpSeed: user.bumpSeed,
      id: randomString(10),
    });
    const txHash = await provider.sendAndConfirm(tx, [user.keypair]);

    const info = await getTransaction(provider, txHash);
    const instructionCoder = program.coder.instruction as BorshInstructionCoder;
    const decodedInstruction = instructionCoder.decode(
      info.transaction.message.instructions[0].data,
      "base58"
    );
    const userIdSeed = user.userId;
    const instructionUserId = decodedInstruction.data.userIdSeedBump.userId;
    assert.equal(instructionUserId, userIdSeed);
    expect(decodedInstruction.data.entitySocialAction).to.deep.equal(
      EntitySocialActionEnumValues.addSave
    );
    expect(decodedInstruction.data.entityType).to.deep.equal(
      EntityTypesEnumValues.agreement
    );
  });

  it("Repost a agreement", async function () {
    const user = await createSolanaUser(program, provider, adminAccountKeypair);

    const tx = addAgreementRepost({
      program,
      baseAuthorityAccount: user.authority,
      adminAccount: adminAccountKeypair.publicKey,
      userAccount: user.accountAddress,
      userAuthorityDelegateAccount: SystemProgram.programId,
      authorityDelegationStatusAccount: SystemProgram.programId,
      userAuthorityPublicKey: user.keypair.publicKey,
      userId: user.userId,
      bumpSeed: user.bumpSeed,
      id: randomString(10),
    });
    const txHash = await provider.sendAndConfirm(tx, [user.keypair]);

    const info = await getTransaction(provider, txHash);
    const instructionCoder = program.coder.instruction as BorshInstructionCoder;
    const decodedInstruction = instructionCoder.decode(
      info.transaction.message.instructions[0].data,
      "base58"
    );
    const userIdSeed = user.userId;
    const instructionUserId = decodedInstruction.data.userIdSeedBump.userId;
    assert.equal(instructionUserId, userIdSeed);
    expect(decodedInstruction.data.entitySocialAction).to.deep.equal(
      EntitySocialActionEnumValues.addRepost
    );
    expect(decodedInstruction.data.entityType).to.deep.equal(
      EntityTypesEnumValues.agreement
    );
  });

  it("Delegate reposts a agreement", async function () {
    const userDelegate = await testCreateUserDelegate({
      adminKeypair,
      adminAccountKeypair: adminAccountKeypair,
      program,
      provider,
    });

    const tx = addAgreementRepost({
      program,
      baseAuthorityAccount: userDelegate.baseAuthorityAccount,
      adminAccount: adminAccountKeypair.publicKey,
      userAccount: userDelegate.userAccountAddress,
      userAuthorityDelegateAccount:
        userDelegate.userAuthorityDelegateAccountAddress,
      authorityDelegationStatusAccount:
        userDelegate.authorityDelegationStatusAccount,
      userAuthorityPublicKey:
        userDelegate.userAuthorityDelegateKeypair.publicKey,
      userId: userDelegate.userId,
      bumpSeed: userDelegate.userBumpSeed,
      id: randomString(10),
    });
    const txHash = await provider.sendAndConfirm(tx, [
      userDelegate.userAuthorityDelegateKeypair,
    ]);
    const info = await getTransaction(provider, txHash);
    const instructionCoder = program.coder.instruction as BorshInstructionCoder;
    const decodedInstruction = instructionCoder.decode(
      info.transaction.message.instructions[0].data,
      "base58"
    );
    const userIdSeed = userDelegate.userId;
    const instructionUserId = decodedInstruction.data.userIdSeedBump.userId;
    assert.equal(instructionUserId, userIdSeed);
    expect(decodedInstruction.data.entitySocialAction).to.deep.equal(
      EntitySocialActionEnumValues.addRepost
    );
    expect(decodedInstruction.data.entityType).to.deep.equal(
      EntityTypesEnumValues.agreement
    );
  });

  it("Delete repost for a agreement", async function () {
    const user = await createSolanaUser(program, provider, adminAccountKeypair);

    const tx = deleteAgreementRepost({
      program,
      baseAuthorityAccount: user.authority,
      adminAccount: adminAccountKeypair.publicKey,
      userAccount: user.accountAddress,
      userAuthorityDelegateAccount: SystemProgram.programId,
      authorityDelegationStatusAccount: SystemProgram.programId,
      userAuthorityPublicKey: user.keypair.publicKey,
      userId: user.userId,
      bumpSeed: user.bumpSeed,
      id: randomString(10),
    });
    const txHash = await provider.sendAndConfirm(tx, [user.keypair]);

    const info = await getTransaction(provider, txHash);
    const instructionCoder = program.coder.instruction as BorshInstructionCoder;
    const decodedInstruction = instructionCoder.decode(
      info.transaction.message.instructions[0].data,
      "base58"
    );
    const userIdSeed = user.userId;
    const instructionUserId = decodedInstruction.data.userIdSeedBump.userId;
    assert.equal(instructionUserId, userIdSeed);
    expect(decodedInstruction.data.entitySocialAction).to.deep.equal(
      EntitySocialActionEnumValues.deleteRepost
    );
    expect(decodedInstruction.data.entityType).to.deep.equal(
      EntityTypesEnumValues.agreement
    );
  });
});
