import { ContractClient } from '../contracts/contractClient'
import * as signatureSchemas from '../../../data-contracts/signatureSchemas'
import type { Web3Manager } from '../web3Manager'

export class SocialFeatureFactoryClient extends ContractClient {
  override web3Manager!: Web3Manager

  async addDigitalContentRepost(userId: number, digitalContentId: number) {
    // generate new digital_content repost request
    const nonce = signatureSchemas.getNonce()
    const chainId = await this.getEthNetId()
    const contractAddress = await this.getAddress()
    const signatureData =
      signatureSchemas.generators.getAddDigitalContentRepostRequestData(
        chainId,
        contractAddress,
        userId,
        digitalContentId,
        nonce
      )
    const sig = await this.web3Manager.signTypedData(signatureData)

    // add new digitalContentRepost to chain
    const method = await this.getMethod(
      'addDigitalContentRepost',
      userId,
      digitalContentId,
      nonce,
      sig
    )
    return await this.web3Manager.sendTransaction(
      method,
      this.contractRegistryKey,
      contractAddress
    )
  }

  async deleteDigitalContentRepost(userId: number, digitalContentId: number) {
    // generate new delete digital content repost request
    const nonce = signatureSchemas.getNonce()
    const chainId = await this.getEthNetId()
    const contractAddress = await this.getAddress()
    const signatureData =
      signatureSchemas.generators.getDeleteDigitalContentRepostRequestData(
        chainId,
        contractAddress,
        userId,
        digitalContentId,
        nonce
      )
    const sig = await this.web3Manager.signTypedData(signatureData)

    // delete digitalContentRepost from chain
    const method = await this.getMethod(
      'deleteDigitalContentRepost',
      userId,
      digitalContentId,
      nonce,
      sig
    )
    return await this.web3Manager.sendTransaction(
      method,
      this.contractRegistryKey,
      contractAddress
    )
  }

  async addContentListRepost(userId: number, contentListId: number) {
    // generate new contentList repost request
    const nonce = signatureSchemas.getNonce()
    const chainId = await this.getEthNetId()
    const contractAddress = await this.getAddress()
    const signatureData =
      signatureSchemas.generators.getAddContentListRepostRequestData(
        chainId,
        contractAddress,
        userId,
        contentListId,
        nonce
      )
    const sig = await this.web3Manager.signTypedData(signatureData)

    // add new contentListRepost to chain
    const method = await this.getMethod(
      'addContentListRepost',
      userId,
      contentListId,
      nonce,
      sig
    )
    return await this.web3Manager.sendTransaction(
      method,
      this.contractRegistryKey,
      contractAddress
    )
  }

  async deleteContentListRepost(userId: number, contentListId: number) {
    // generate new delete contentList repost request
    const nonce = signatureSchemas.getNonce()
    const chainId = await this.getEthNetId()
    const contractAddress = await this.getAddress()
    const signatureData =
      signatureSchemas.generators.getDeleteContentListRepostRequestData(
        chainId,
        contractAddress,
        userId,
        contentListId,
        nonce
      )
    const sig = await this.web3Manager.signTypedData(signatureData)

    // delete contentListRepost from chain
    const method = await this.getMethod(
      'deleteContentListRepost',
      userId,
      contentListId,
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
