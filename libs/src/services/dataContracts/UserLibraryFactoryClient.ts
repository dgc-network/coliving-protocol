import { ContractClient } from '../contracts/contractClient'
import * as signatureSchemas from '../../../data-contracts/signatureSchemas'
import type { Web3Manager } from '../web3Manager'

export class UserLibraryFactoryClient extends ContractClient {
  override web3Manager!: Web3Manager
  /* ------- SETTERS ------- */

  async addDigitalContentSave(userId: number, digitalContentId: number) {
    const nonce = signatureSchemas.getNonce()
    const chainId = await this.getEthNetId()
    const contractAddress = await this.getAddress()
    const signatureData = signatureSchemas.generators.getDigitalContentSaveRequestData(
      chainId,
      contractAddress,
      userId,
      digitalContentId,
      nonce
    )
    const sig = await this.web3Manager.signTypedData(signatureData)
    const contractMethod = await this.getMethod(
      'addDigitalContentSave',
      userId,
      digitalContentId,
      nonce,
      sig
    )
    return await this.web3Manager.sendTransaction(
      contractMethod,
      this.contractRegistryKey,
      contractAddress
    )
  }

  async deleteDigitalContentSave(userId: number, digitalContentId: number) {
    const nonce = signatureSchemas.getNonce()
    const chainId = await this.getEthNetId()
    const contractAddress = await this.getAddress()
    const signatureData =
      signatureSchemas.generators.getDeleteDigitalContentSaveRequestData(
        chainId,
        contractAddress,
        userId,
        digitalContentId,
        nonce
      )
    const sig = await this.web3Manager.signTypedData(signatureData)
    const contractMethod = await this.getMethod(
      'deleteDigitalContentSave',
      userId,
      digitalContentId,
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
