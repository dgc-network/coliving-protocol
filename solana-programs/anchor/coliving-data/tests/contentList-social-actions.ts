import * as anchor from "@project-serum/anchor";
import { BorshInstructionCoder, Program } from "@project-serum/anchor";
import chai, { assert, expect } from "chai";
import chaiAsPromised from "chai-as-promised";
import {
  initAdmin,
  addContentListRepost,
  addContentListSave,
  updateAdmin,
  deleteContentListSave,
  EntitySocialActionEnumValues,
  EntityTypesEnumValues,
  deleteContentListRepost,
} from "../lib/lib";
import { getTransaction, randomString } from "../lib/utils";
import { ColivingData } from "../target/types/coliving_data";
import { createSolanaUser, createSolanaContentNode } from "./test-helpers";

const { SystemProgram } = anchor.web3;

chai.use(chaiAsPromised);

describe("content-list-actions", function () {
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
  const contentNodes = {};

  it("contentList actions - Initializing admin account!", async function () {
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
    const cn1 = await createSolanaContentNode({
      program,
      provider,
      adminKeypair,
      adminAccountKeypair,
      spId: new anchor.BN(1),
    });
    const cn2 = await createSolanaContentNode({
      program,
      provider,
      adminKeypair,
      adminAccountKeypair,
      spId: new anchor.BN(2),
    });
    const cn3 = await createSolanaContentNode({
      program,
      provider,
      adminKeypair,
      adminAccountKeypair,
      spId: new anchor.BN(3),
    });
    contentNodes["1"] = cn1;
    contentNodes["2"] = cn2;
    contentNodes["3"] = cn3;
  });

  it("Delete save for a content list", async function () {
    const user = await createSolanaUser(program, provider, adminAccountKeypair);

    const tx = deleteContentListSave({
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

    const txSignature = await provider.sendAndConfirm(tx, [user.keypair]);

    const info = await getTransaction(provider, txSignature);
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
      EntityTypesEnumValues.contentList
    );
  });

  it("Save a newly created content list", async function () {
    const user = await createSolanaUser(program, provider, adminAccountKeypair);

    const tx = addContentListSave({
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
    const txSignature = await provider.sendAndConfirm(tx, [user.keypair]);

    const info = await getTransaction(provider, txSignature);
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
      EntityTypesEnumValues.contentList
    );
  });

  it("Repost a content list", async function () {
    const user = await createSolanaUser(program, provider, adminAccountKeypair);

    const tx = addContentListRepost({
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
    const txSignature = await provider.sendAndConfirm(tx, [user.keypair]);

    const info = await getTransaction(provider, txSignature);
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
      EntityTypesEnumValues.contentList
    );
  });

  it("Delete repost for a content list", async function () {
    const user = await createSolanaUser(program, provider, adminAccountKeypair);

    const tx = deleteContentListRepost({
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
    const txSignature = await provider.sendAndConfirm(tx, [user.keypair]);
    const info = await getTransaction(provider, txSignature);
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
      EntityTypesEnumValues.contentList
    );
  });
});
