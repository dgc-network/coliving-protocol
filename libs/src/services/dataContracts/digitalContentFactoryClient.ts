import { ContractClient } from '../contracts/contractClient'

import * as signatureSchemas from '../../../data-contracts/signatureSchemas'

import type { Web3Manager } from '../web3Manager'

export class DigitalContentFactoryClient extends ContractClient {
  override web3Manager!: Web3Manager
  /* -------  GETTERS ------- */

  async getDigitalContent(digitalContentId: string) {
    const method = await this.getMethod('getDigitalContent', digitalContentId)
    return method.call()
  }

  /* -------  SETTERS ------- */

  /** uint _userId, bytes32 _multihashDigest, uint8 _multihashHashFn, uint8 _multihashSize */
  async addDigitalContent(
    userId: number,
    multihashDigest: string,
    multihashHashFn: number,
    multihashSize: number
  ) {
    const nonce = signatureSchemas.getNonce()
    const chainId = await this.getEthNetId()
    const contractAddress = await this.getAddress()
    const signatureData = signatureSchemas.generators.getAddDigitalContentRequestData(
      chainId,
      contractAddress,
      userId,
      multihashDigest,
      multihashHashFn,
      multihashSize,
      nonce
    )

    const sig = await this.web3Manager.signTypedData(signatureData)
    const method = await this.getMethod(
      'addDigitalContent',
      userId,
      multihashDigest,
      multihashHashFn,
      multihashSize,
      nonce,
      sig
    )

    const tx = await this.web3Manager.sendTransaction(
      method,
      this.contractRegistryKey,
      contractAddress
    )
    return {
      digitalContentId: parseInt(tx.events?.['NewDigitalContent']?.returnValues._id, 10),
      txReceipt: tx
    }
  }

  /** uint _digitalContentId, uint _digitalContentOwnerId, bytes32 _multihashDigest, uint8 _multihashHashFn, uint8 _multihashSize */
  async updateDigitalContent(
    digitalContentId: number,
    digitalContentOwnerId: number,
    multihashDigest: string,
    multihashHashFn: number,
    multihashSize: number
  ) {
    const nonce = signatureSchemas.getNonce()
    const chainId = await this.getEthNetId()
    const contractAddress = await this.getAddress()
    const signatureData = signatureSchemas.generators.getUpdateDigitalContentRequestData(
      chainId,
      contractAddress,
      digitalContentId,
      digitalContentOwnerId,
      multihashDigest,
      multihashHashFn,
      multihashSize,
      nonce
    )

    const sig = await this.web3Manager.signTypedData(signatureData)
    const method = await this.getMethod(
      'updateDigitalContent',
      digitalContentId,
      digitalContentOwnerId,
      multihashDigest,
      multihashHashFn,
      multihashSize,
      nonce,
      sig
    )

    const tx = await this.web3Manager.sendTransaction(
      method,
      this.contractRegistryKey,
      contractAddress
    )

    return {
      digitalContentId: parseInt(tx.events?.['UpdateDigitalContent']?.returnValues._digitalContentId, 10),
      txReceipt: tx
    }
  }

  /**
   * @return deleted digitalContentId from on-chain event log
   */
  async deleteDigitalContent(digitalContentId: number) {
    const nonce = signatureSchemas.getNonce()
    const chainId = await this.getEthNetId()
    const contractAddress = await this.getAddress()
    const signatureData = signatureSchemas.generators.getDeleteDigitalContentRequestData(
      chainId,
      contractAddress,
      digitalContentId,
      nonce
    )

    const sig = await this.web3Manager.signTypedData(signatureData)
    const method = await this.getMethod('deleteDigitalContent', digitalContentId, nonce, sig)

    const tx = await this.web3Manager.sendTransaction(
      method,
      this.contractRegistryKey,
      contractAddress
    )
    return {
      digitalContentId: parseInt(tx.events?.['DigitalContentDeleted']?.returnValues._digitalContentId, 10),
      txReceipt: tx
    }
  }
}
