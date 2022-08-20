import { ContractClient } from '../contracts/ContractClient'
import * as signatureSchemas from '../../../data-contracts/signatureSchemas'
import type { Web3Manager } from '../web3Manager'

export class SocialFeatureFactoryClient extends ContractClient {
  override web3Manager!: Web3Manager

  async addAgreementRepost(userId: number, agreementId: number) {
    // generate new agreement repost request
    const nonce = signatureSchemas.getNonce()
    const chainId = await this.getEthNetId()
    const contractAddress = await this.getAddress()
    const signatureData =
      signatureSchemas.generators.getAddAgreementRepostRequestData(
        chainId,
        contractAddress,
        userId,
        agreementId,
        nonce
      )
    const sig = await this.web3Manager.signTypedData(signatureData)

    // add new agreementRepost to chain
    const method = await this.getMethod(
      'addAgreementRepost',
      userId,
      agreementId,
      nonce,
      sig
    )
    return await this.web3Manager.sendTransaction(
      method,
      this.contractRegistryKey,
      contractAddress
    )
  }

  async deleteAgreementRepost(userId: number, agreementId: number) {
    // generate new delete agreement repost request
    const nonce = signatureSchemas.getNonce()
    const chainId = await this.getEthNetId()
    const contractAddress = await this.getAddress()
    const signatureData =
      signatureSchemas.generators.getDeleteAgreementRepostRequestData(
        chainId,
        contractAddress,
        userId,
        agreementId,
        nonce
      )
    const sig = await this.web3Manager.signTypedData(signatureData)

    // delete agreementRepost from chain
    const method = await this.getMethod(
      'deleteAgreementRepost',
      userId,
      agreementId,
      nonce,
      sig
    )
    return await this.web3Manager.sendTransaction(
      method,
      this.contractRegistryKey,
      contractAddress
    )
  }

  async addContentListRepost(userId: number, content listId: number) {
    // generate new content list repost request
    const nonce = signatureSchemas.getNonce()
    const chainId = await this.getEthNetId()
    const contractAddress = await this.getAddress()
    const signatureData =
      signatureSchemas.generators.getAddContentListRepostRequestData(
        chainId,
        contractAddress,
        userId,
        content listId,
        nonce
      )
    const sig = await this.web3Manager.signTypedData(signatureData)

    // add new content listRepost to chain
    const method = await this.getMethod(
      'addContentListRepost',
      userId,
      content listId,
      nonce,
      sig
    )
    return await this.web3Manager.sendTransaction(
      method,
      this.contractRegistryKey,
      contractAddress
    )
  }

  async deleteContentListRepost(userId: number, content listId: number) {
    // generate new delete content list repost request
    const nonce = signatureSchemas.getNonce()
    const chainId = await this.getEthNetId()
    const contractAddress = await this.getAddress()
    const signatureData =
      signatureSchemas.generators.getDeleteContentListRepostRequestData(
        chainId,
        contractAddress,
        userId,
        content listId,
        nonce
      )
    const sig = await this.web3Manager.signTypedData(signatureData)

    // delete content listRepost from chain
    const method = await this.getMethod(
      'deleteContentListRepost',
      userId,
      content listId,
      nonce,
      sig
    )
    return await this.web3Manager.sendTransaction(
      method,
      this.contractRegistryKey,
      contractAddress
    )
  }

  async addUserFollow(followerUserId: number, followeeUserId: number) {
    if (followerUserId === followeeUserId) {
      throw new Error(
        `addUserFollow -  identical value provided for follower and followee ${followerUserId}`
      )
    }
    // generate new UserFollow request
    const nonce = signatureSchemas.getNonce()
    const chainId = await this.getEthNetId()
    const contractAddress = await this.getAddress()
    const signatureData = signatureSchemas.generators.getUserFollowRequestData(
      chainId,
      contractAddress,
      followerUserId,
      followeeUserId,
      nonce
    )
    const sig = await this.web3Manager.signTypedData(signatureData)

    // add new UserFollow to chain
    const method = await this.getMethod(
      'addUserFollow',
      followerUserId,
      followeeUserId,
      nonce,
      sig
    )
    return await this.web3Manager.sendTransaction(
      method,
      this.contractRegistryKey,
      contractAddress
    )
  }

  async deleteUserFollow(followerUserId: number, followeeUserId: number) {
    if (followerUserId === followeeUserId) {
      throw new Error(
        `deleteUserFollow - Invalid identical value provided for follower and followee ${followerUserId}`
      )
    }
    // generate new deleteUserFollow request
    const nonce = signatureSchemas.getNonce()
    const chainId = await this.getEthNetId()
    const contractAddress = await this.getAddress()
    const signatureData =
      signatureSchemas.generators.getDeleteUserFollowRequestData(
        chainId,
        contractAddress,
        followerUserId,
        followeeUserId,
        nonce
      )
    const sig = await this.web3Manager.signTypedData(signatureData)

    // delete UserFollow from chain
    const method = await this.getMethod(
      'deleteUserFollow',
      followerUserId,
      followeeUserId,
      nonce,
      sig
    )
    return await this.web3Manager.sendTransaction(
      method,
      this.contractRegistryKey,
      contractAddress
    )
  }
}
