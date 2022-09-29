import { ContractClient } from '../contracts/contractClient'
import * as signatureSchemas from '../../../data-contracts/signatureSchemas'
import type { Web3Manager } from '../web3Manager'

export class UserLibraryFactoryClient extends ContractClient {
  override web3Manager!: Web3Manager
  /* ------- SETTERS ------- */

  async addAgreementSave(userId: number, agreementId: number) {
    const nonce = signatureSchemas.getNonce()
    const chainId = await this.getEthNetId()
    const contractAddress = await this.getAddress()
    const signatureData = signatureSchemas.generators.getAgreementSaveRequestData(
      chainId,
      contractAddress,
      userId,
      agreementId,
      nonce
    )
    const sig = await this.web3Manager.signTypedData(signatureData)
    const contractMethod = await this.getMethod(
      'addAgreementSave',
      userId,
      agreementId,
      nonce,
      sig
    )
    return await this.web3Manager.sendTransaction(
      contractMethod,
      this.contractRegistryKey,
      contractAddress
    )
  }

  async deleteAgreementSave(userId: number, agreementId: number) {
    const nonce = signatureSchemas.getNonce()
    const chainId = await this.getEthNetId()
    const contractAddress = await this.getAddress()
    const signatureData =
      signatureSchemas.generators.getDeleteAgreementSaveRequestData(
        chainId,
        contractAddress,
        userId,
        agreementId,
        nonce
      )
    const sig = await this.web3Manager.signTypedData(signatureData)
    const contractMethod = await this.getMethod(
      'deleteAgreementSave',
      userId,
      agreementId,
      nonce,
      sig
    )
    return await this.web3Manager.sendTransaction(
      contractMethod,
      this.contractRegistryKey,
      contractAddress
    )
  }

  async addContentListSave(userId: number, contentListId: number) {
    const nonce = signatureSchemas.getNonce()
    const chainId = await this.getEthNetId()
    const contractAddress = await this.getAddress()
    const signatureData =
      signatureSchemas.generators.getContentListSaveRequestData(
        chainId,
        contractAddress,
        userId,
        contentListId,
        nonce
      )
    const sig = await this.web3Manager.signTypedData(signatureData)
    const contractMethod = await this.getMethod(
      'addContentListSave',
      userId,
      contentListId,
      nonce,
      sig
    )
    return await this.web3Manager.sendTransaction(
      contractMethod,
      this.contractRegistryKey,
      contractAddress
    )
  }

  async deleteContentListSave(userId: number, contentListId: number) {
    const nonce = signatureSchemas.getNonce()
    const chainId = await this.getEthNetId()
    const contractAddress = await this.getAddress()
    const signatureData =
      signatureSchemas.generators.getDeleteContentListSaveRequestData(
        chainId,
        contractAddress,
        userId,
        contentListId,
        nonce
      )
    const sig = await this.web3Manager.signTypedData(signatureData)
    const contractMethod = await this.getMethod(
      'deleteContentListSave',
      userId,
      contentListId,
      nonce,
      sig
    )
    return await this.web3Manager.sendTransaction(
      contractMethod,
      this.contractRegistryKey,
      contractAddress
    )
  }
}
