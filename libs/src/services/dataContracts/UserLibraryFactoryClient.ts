import { ContractClient } from '../contracts/ContractClient'
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

  async addPlaylistSave(userId: number, playlistId: number) {
    const nonce = signatureSchemas.getNonce()
    const chainId = await this.getEthNetId()
    const contractAddress = await this.getAddress()
    const signatureData =
      signatureSchemas.generators.getPlaylistSaveRequestData(
        chainId,
        contractAddress,
        userId,
        playlistId,
        nonce
      )
    const sig = await this.web3Manager.signTypedData(signatureData)
    const contractMethod = await this.getMethod(
      'addPlaylistSave',
      userId,
      playlistId,
      nonce,
      sig
    )
    return await this.web3Manager.sendTransaction(
      contractMethod,
      this.contractRegistryKey,
      contractAddress
    )
  }

  async deletePlaylistSave(userId: number, playlistId: number) {
    const nonce = signatureSchemas.getNonce()
    const chainId = await this.getEthNetId()
    const contractAddress = await this.getAddress()
    const signatureData =
      signatureSchemas.generators.getDeletePlaylistSaveRequestData(
        chainId,
        contractAddress,
        userId,
        playlistId,
        nonce
      )
    const sig = await this.web3Manager.signTypedData(signatureData)
    const contractMethod = await this.getMethod(
      'deletePlaylistSave',
      userId,
      playlistId,
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
