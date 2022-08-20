import { ContractClient } from '../contracts/ContractClient'
import * as signatureSchemas from '../../../data-contracts/signatureSchemas'
import type { Web3Manager } from '../web3Manager'

const MAX_CONTENT_LIST_LENGTH = 199

export class ContentListFactoryClient extends ContractClient {
  override web3Manager!: Web3Manager
  /* ------- SETTERS ------- */

  async createContentList(
    userId: number,
    content listName: string,
    isPrivate: boolean,
    isAlbum: boolean,
    agreementIds: number[]
  ) {
    if (!Array.isArray(agreementIds) || agreementIds.length > MAX_CONTENT_LIST_LENGTH) {
      throw new Error(
        `Cannot create content list - agreementIds must be array with length <= ${MAX_CONTENT_LIST_LENGTH}`
      )
    }

    const nonce = signatureSchemas.getNonce()
    const chainId = await this.getEthNetId()
    const contractAddress = await this.getAddress()
    const agreementIdsHash = this.web3Manager
      .getWeb3()
      .utils.soliditySha3(
        this.web3Manager.getWeb3().eth.abi.encodeParameter('uint[]', agreementIds)
      )
    const signatureData =
      signatureSchemas.generators.getCreateContentListRequestData(
        chainId,
        contractAddress,
        userId,
        content listName,
        isPrivate,
        isAlbum,
        agreementIdsHash,
        nonce
      )
    const sig = await this.web3Manager.signTypedData(signatureData)

    const method = await this.getMethod(
      'createContentList',
      userId,
      content listName,
      isPrivate,
      isAlbum,
      agreementIds,
      nonce,
      sig
    )

    const tx = await this.web3Manager.sendTransaction(
      method,
      this.contractRegistryKey,
      contractAddress
    )
    return {
      content listId: parseInt(
        tx.events?.['ContentListCreated']?.returnValues._content listId,
        10
      ),
      txReceipt: tx
    }
  }

  async deleteContentList(content listId: number) {
    const nonce = signatureSchemas.getNonce()
    const chainId = await this.getEthNetId()
    const contractAddress = await this.getAddress()
    const signatureData =
      signatureSchemas.generators.getDeleteContentListRequestData(
        chainId,
        contractAddress,
        content listId,
        nonce
      )

    const sig = await this.web3Manager.signTypedData(signatureData)
    const method = await this.getMethod(
      'deleteContentList',
      content listId,
      nonce,
      sig
    )

    const tx = await this.web3Manager.sendTransaction(
      method,
      this.contractRegistryKey,
      contractAddress
    )
    return {
      content listId: parseInt(
        tx.events?.['ContentListDeleted']?.returnValues._content listId,
        10
      ),
      txReceipt: tx
    }
  }

  async addContentListAgreement(content listId: number, addedAgreementId: number) {
    const nonce = signatureSchemas.getNonce()
    const chainId = await this.getEthNetId()
    const contractAddress = await this.getAddress()
    const signatureData =
      signatureSchemas.generators.getAddContentListAgreementRequestData(
        chainId,
        contractAddress,
        content listId,
        addedAgreementId,
        nonce
      )
    const sig = await this.web3Manager.signTypedData(signatureData)

    const method = await this.getMethod(
      'addContentListAgreement',
      content listId,
      addedAgreementId,
      nonce,
      sig
    )

    return await this.web3Manager.sendTransaction(
      method,
      this.contractRegistryKey,
      contractAddress
    )
  }

  async deleteContentListAgreement(
    content listId: number,
    deletedAgreementId: number,
    deletedContentListTimestamp: number,
    retries?: number
  ) {
    const nonce = signatureSchemas.getNonce()
    const chainId = await this.getEthNetId()
    const contractAddress = await this.getAddress()
    const signatureData =
      signatureSchemas.generators.getDeleteContentListAgreementRequestData(
        chainId,
        contractAddress,
        content listId,
        deletedAgreementId,
        deletedContentListTimestamp,
        nonce
      )

    const sig = await this.web3Manager.signTypedData(signatureData)
    const method = await this.getMethod(
      'deleteContentListAgreement',
      content listId,
      deletedAgreementId,
      deletedContentListTimestamp,
      nonce,
      sig
    )

    return await this.web3Manager.sendTransaction(
      method,
      this.contractRegistryKey,
      contractAddress,
      retries
    )
  }

  async orderContentListAgreements(
    content listId: number,
    agreementIds: number[],
    retries?: number
  ) {
    const nonce = signatureSchemas.getNonce()
    const chainId = await this.getEthNetId()
    const contractAddress = await this.getAddress()
    const agreementIdsHash = this.web3Manager
      .getWeb3()
      .utils.soliditySha3(
        this.web3Manager.getWeb3().eth.abi.encodeParameter('uint[]', agreementIds)
      )
    const signatureData =
      signatureSchemas.generators.getOrderContentListAgreementsRequestData(
        chainId,
        contractAddress,
        content listId,
        agreementIdsHash,
        nonce
      )
    const sig = await this.web3Manager.signTypedData(signatureData)

    const method = await this.getMethod(
      'orderContentListAgreements',
      content listId,
      agreementIds,
      nonce,
      sig
    )

    return await this.web3Manager.sendTransaction(
      method, // contractMethod
      this.contractRegistryKey,
      contractAddress,
      retries
    )
  }

  async updateContentListPrivacy(
    content listId: number,
    updatedContentListPrivacy: boolean
  ) {
    const nonce = signatureSchemas.getNonce()
    const chainId = await this.getEthNetId()
    const contractAddress = await this.getAddress()
    const signatureData =
      signatureSchemas.generators.getUpdateContentListPrivacyRequestData(
        chainId,
        contractAddress,
        content listId,
        updatedContentListPrivacy,
        nonce
      )
    const sig = await this.web3Manager.signTypedData(signatureData)

    const method = await this.getMethod(
      'updateContentListPrivacy',
      content listId,
      updatedContentListPrivacy,
      nonce,
      sig
    )

    return await this.web3Manager.sendTransaction(
      method,
      this.contractRegistryKey,
      contractAddress
    )
  }

  async updateContentListName(content listId: number, updatedContentListName: string) {
    const nonce = signatureSchemas.getNonce()
    const chainId = await this.getEthNetId()
    const contractAddress = await this.getAddress()
    const signatureData =
      signatureSchemas.generators.getUpdateContentListNameRequestData(
        chainId,
        contractAddress,
        content listId,
        updatedContentListName,
        nonce
      )
    const sig = await this.web3Manager.signTypedData(signatureData)

    const method = await this.getMethod(
      'updateContentListName',
      content listId,
      updatedContentListName,
      nonce,
      sig
    )

    return await this.web3Manager.sendTransaction(
      method,
      this.contractRegistryKey,
      contractAddress
    )
  }

  async updateContentListCoverPhoto(
    content listId: number,
    updatedContentListImageMultihashDigest: string
  ) {
    const nonce = signatureSchemas.getNonce()
    const chainId = await this.getEthNetId()
    const contractAddress = await this.getAddress()
    const signatureData =
      signatureSchemas.generators.getUpdateContentListCoverPhotoRequestData(
        chainId,
        contractAddress,
        content listId,
        updatedContentListImageMultihashDigest,
        nonce
      )
    const sig = await this.web3Manager.signTypedData(signatureData)

    const method = await this.getMethod(
      'updateContentListCoverPhoto',
      content listId,
      updatedContentListImageMultihashDigest,
      nonce,
      sig
    )

    return await this.web3Manager.sendTransaction(
      method,
      this.contractRegistryKey,
      contractAddress
    )
  }

  async updateContentListDescription(
    content listId: number,
    updatedContentListDescription: string
  ) {
    const nonce = signatureSchemas.getNonce()
    const chainId = await this.getEthNetId()
    const contractAddress = await this.getAddress()
    const signatureData =
      signatureSchemas.generators.getUpdateContentListDescriptionRequestData(
        chainId,
        contractAddress,
        content listId,
        updatedContentListDescription,
        nonce
      )
    const sig = await this.web3Manager.signTypedData(signatureData)
    const method = await this.getMethod(
      'updateContentListDescription',
      content listId,
      updatedContentListDescription,
      nonce,
      sig
    )

    return await this.web3Manager.sendTransaction(
      method,
      this.contractRegistryKey,
      contractAddress
    )
  }

  async updateContentListUPC(content listId: number, updatedContentListUPC: string) {
    const nonce = signatureSchemas.getNonce()
    const chainId = await this.getEthNetId()
    const contractAddress = await this.getAddress()
    const signatureData =
      signatureSchemas.generators.getUpdateContentListUPCRequestData(
        chainId,
        contractAddress,
        content listId,
        this.web3Manager.getWeb3().utils.utf8ToHex(updatedContentListUPC),
        nonce
      )
    const sig = await this.web3Manager.signTypedData(signatureData)
    const method = await this.getMethod(
      'updateContentListUPC',
      content listId,
      this.web3Manager.getWeb3().utils.utf8ToHex(updatedContentListUPC),
      nonce,
      sig
    )

    return await this.web3Manager.sendTransaction(
      method,
      this.contractRegistryKey,
      contractAddress
    )
  }

  async isAgreementInContentList(content listId: number, agreementId: number) {
    const method = await this.getMethod(
      'isAgreementInContentList',
      content listId,
      agreementId
    )
    const result = await method.call()
    return result
  }
}
