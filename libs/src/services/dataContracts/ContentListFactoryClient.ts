import { ContractClient } from '../contracts/contractClient'
import * as signatureSchemas from '../../../data-contracts/signatureSchemas'
import type { Web3Manager } from '../web3Manager'

const MAX_CONTENT_LIST_LENGTH = 199

export class ContentListFactoryClient extends ContractClient {
  override web3Manager!: Web3Manager
  /* ------- SETTERS ------- */

  async createContentList(
    userId: number,
    contentListName: string,
    isPrivate: boolean,
    isAlbum: boolean,
    agreementIds: number[]
  ) {
    if (!Array.isArray(agreementIds) || agreementIds.length > MAX_CONTENT_LIST_LENGTH) {
      throw new Error(
        `Cannot create contentList - agreementIds must be array with length <= ${MAX_CONTENT_LIST_LENGTH}`
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
        contentListName,
        isPrivate,
        isAlbum,
        agreementIdsHash,
        nonce
      )
    const sig = await this.web3Manager.signTypedData(signatureData)

    const method = await this.getMethod(
      'createContentList',
      userId,
      contentListName,
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
      contentListId: parseInt(
        tx.events?.['ContentListCreated']?.returnValues._content_listId,
        10
      ),
      txReceipt: tx
    }
  }

  async deleteContentList(contentListId: number) {
    const nonce = signatureSchemas.getNonce()
    const chainId = await this.getEthNetId()
    const contractAddress = await this.getAddress()
    const signatureData =
      signatureSchemas.generators.getDeleteContentListRequestData(
        chainId,
        contractAddress,
        contentListId,
        nonce
      )

    const sig = await this.web3Manager.signTypedData(signatureData)
    const method = await this.getMethod(
      'deleteContentList',
      contentListId,
      nonce,
      sig
    )

    const tx = await this.web3Manager.sendTransaction(
      method,
      this.contractRegistryKey,
      contractAddress
    )
    return {
      contentListId: parseInt(
        tx.events?.['ContentListDeleted']?.returnValues._content_listId,
        10
      ),
      txReceipt: tx
    }
  }

  async addContentListAgreement(contentListId: number, addedAgreementId: number) {
    const nonce = signatureSchemas.getNonce()
    const chainId = await this.getEthNetId()
    const contractAddress = await this.getAddress()
    const signatureData =
      signatureSchemas.generators.getAddContentListAgreementRequestData(
        chainId,
        contractAddress,
        contentListId,
        addedAgreementId,
        nonce
      )
    const sig = await this.web3Manager.signTypedData(signatureData)

    const method = await this.getMethod(
      'addContentListAgreement',
      contentListId,
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
    contentListId: number,
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
        contentListId,
        deletedAgreementId,
        deletedContentListTimestamp,
        nonce
      )

    const sig = await this.web3Manager.signTypedData(signatureData)
    const method = await this.getMethod(
      'deleteContentListAgreement',
      contentListId,
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
    contentListId: number,
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
        contentListId,
        agreementIdsHash,
        nonce
      )
    const sig = await this.web3Manager.signTypedData(signatureData)

    const method = await this.getMethod(
      'orderContentListAgreements',
      contentListId,
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
    contentListId: number,
    updatedContentListPrivacy: boolean
  ) {
    const nonce = signatureSchemas.getNonce()
    const chainId = await this.getEthNetId()
    const contractAddress = await this.getAddress()
    const signatureData =
      signatureSchemas.generators.getUpdateContentListPrivacyRequestData(
        chainId,
        contractAddress,
        contentListId,
        updatedContentListPrivacy,
        nonce
      )
    const sig = await this.web3Manager.signTypedData(signatureData)

    const method = await this.getMethod(
      'updateContentListPrivacy',
      contentListId,
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

  async updateContentListName(contentListId: number, updatedContentListName: string) {
    const nonce = signatureSchemas.getNonce()
    const chainId = await this.getEthNetId()
    const contractAddress = await this.getAddress()
    const signatureData =
      signatureSchemas.generators.getUpdateContentListNameRequestData(
        chainId,
        contractAddress,
        contentListId,
        updatedContentListName,
        nonce
      )
    const sig = await this.web3Manager.signTypedData(signatureData)

    const method = await this.getMethod(
      'updateContentListName',
      contentListId,
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
    contentListId: number,
    updatedContentListImageMultihashDigest: string
  ) {
    const nonce = signatureSchemas.getNonce()
    const chainId = await this.getEthNetId()
    const contractAddress = await this.getAddress()
    const signatureData =
      signatureSchemas.generators.getUpdateContentListCoverPhotoRequestData(
        chainId,
        contractAddress,
        contentListId,
        updatedContentListImageMultihashDigest,
        nonce
      )
    const sig = await this.web3Manager.signTypedData(signatureData)

    const method = await this.getMethod(
      'updateContentListCoverPhoto',
      contentListId,
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
    contentListId: number,
    updatedContentListDescription: string
  ) {
    const nonce = signatureSchemas.getNonce()
    const chainId = await this.getEthNetId()
    const contractAddress = await this.getAddress()
    const signatureData =
      signatureSchemas.generators.getUpdateContentListDescriptionRequestData(
        chainId,
        contractAddress,
        contentListId,
        updatedContentListDescription,
        nonce
      )
    const sig = await this.web3Manager.signTypedData(signatureData)
    const method = await this.getMethod(
      'updateContentListDescription',
      contentListId,
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

  async updateContentListUPC(contentListId: number, updatedContentListUPC: string) {
    const nonce = signatureSchemas.getNonce()
    const chainId = await this.getEthNetId()
    const contractAddress = await this.getAddress()
    const signatureData =
      signatureSchemas.generators.getUpdateContentListUPCRequestData(
        chainId,
        contractAddress,
        contentListId,
        this.web3Manager.getWeb3().utils.utf8ToHex(updatedContentListUPC),
        nonce
      )
    const sig = await this.web3Manager.signTypedData(signatureData)
    const method = await this.getMethod(
      'updateContentListUPC',
      contentListId,
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

  async isAgreementInContentList(contentListId: number, agreementId: number) {
    const method = await this.getMethod(
      'isAgreementInContentList',
      contentListId,
      agreementId
    )
    const result = await method.call()
    return result
  }
}
