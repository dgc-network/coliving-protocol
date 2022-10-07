import { ContractClient } from '../contracts/contractClient'
//import * as signatureSchemas from '../../../data-contracts/signatureSchemas'
import * as signatureSchemas from '../../../../data-contracts/signatureSchemas'
import type { Web3Manager } from '../web3Manager'

export class AgreementFactoryClient extends ContractClient {
  override web3Manager!: Web3Manager
  /* -------  GETTERS ------- */

  async getAgreement(agreementId: string) {
    const method = await this.getMethod('getAgreement', agreementId)
    return method.call()
  }

  /* -------  SETTERS ------- */

  /** uint _userId, bytes32 _multihashDigest, uint8 _multihashHashFn, uint8 _multihashSize */
  async addAgreement(
    userId: number,
    multihashDigest: string,
    multihashHashFn: number,
    multihashSize: number
  ) {
    const nonce = signatureSchemas.getNonce()
    const chainId = await this.getEthNetId()
    const contractAddress = await this.getAddress()
    const signatureData = signatureSchemas.generators.getAddAgreementRequestData(
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
      'addAgreement',
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
      agreementId: parseInt(tx.events?.['NewAgreement']?.returnValues._id, 10),
      txReceipt: tx
    }
  }

  /** uint _agreementId, uint _agreementOwnerId, bytes32 _multihashDigest, uint8 _multihashHashFn, uint8 _multihashSize */
  async updateAgreement(
    agreementId: number,
    agreementOwnerId: number,
    multihashDigest: string,
    multihashHashFn: number,
    multihashSize: number
  ) {
    const nonce = signatureSchemas.getNonce()
    const chainId = await this.getEthNetId()
    const contractAddress = await this.getAddress()
    const signatureData = signatureSchemas.generators.getUpdateAgreementRequestData(
      chainId,
      contractAddress,
      agreementId,
      agreementOwnerId,
      multihashDigest,
      multihashHashFn,
      multihashSize,
      nonce
    )

    const sig = await this.web3Manager.signTypedData(signatureData)
    const method = await this.getMethod(
      'updateAgreement',
      agreementId,
      agreementOwnerId,
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
      agreementId: parseInt(tx.events?.['UpdateAgreement']?.returnValues._agreementId, 10),
      txReceipt: tx
    }
  }

  /**
   * @return deleted agreementId from on-chain event log
   */
  async deleteAgreement(agreementId: number) {
    const nonce = signatureSchemas.getNonce()
    const chainId = await this.getEthNetId()
    const contractAddress = await this.getAddress()
    const signatureData = signatureSchemas.generators.getDeleteAgreementRequestData(
      chainId,
      contractAddress,
      agreementId,
      nonce
    )

    const sig = await this.web3Manager.signTypedData(signatureData)
    const method = await this.getMethod('deleteAgreement', agreementId, nonce, sig)

    const tx = await this.web3Manager.sendTransaction(
      method,
      this.contractRegistryKey,
      contractAddress
    )
    return {
      agreementId: parseInt(tx.events?.['AgreementDeleted']?.returnValues._agreementId, 10),
      txReceipt: tx
    }
  }
}
