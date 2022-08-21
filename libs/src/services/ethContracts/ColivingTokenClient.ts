import type Web3 from 'web3'
import type { EthWeb3Manager } from '../ethWeb3Manager'
import type { Contract } from 'web3-eth-contract'
import type { AbiItem } from 'web3-utils'
import type BN from 'bn.js'

export class ColivingTokenClient {
  ethWeb3Manager: EthWeb3Manager
  contractABI: AbiItem[]
  contractAddress: string
  web3: Web3
  ColivingTokenContract: Contract
  bustCacheNonce: number

  constructor(
    ethWeb3Manager: EthWeb3Manager,
    contractABI: AbiItem[],
    contractAddress: string
  ) {
    this.ethWeb3Manager = ethWeb3Manager
    this.contractABI = contractABI
    this.contractAddress = contractAddress

    this.web3 = this.ethWeb3Manager.getWeb3()
    this.ColivingTokenContract = new this.web3.eth.Contract(
      this.contractABI,
      this.contractAddress
    )

    this.bustCacheNonce = 0
  }

  /* ------- GETTERS ------- */

  async bustCache() {
    this.bustCacheNonce += 1
  }

  async balanceOf(account: string) {
    let args
    if (this.bustCacheNonce > 0) {
      args = { _colivingBustCache: this.bustCacheNonce }
    }
    const balance = await this.ColivingTokenContract.methods
      .balanceOf(account)
      .call(args)
    return this.web3.utils.toBN(balance)
  }

  // Get the name of the contract
  async name() {
    const name = await this.ColivingTokenContract.methods.name().call()
    return name
  }

  // Get the name of the contract
  async nonces(wallet: string) {
    // Pass along a unique param so the nonce value is always not cached
    const nonce = await this.ColivingTokenContract.methods.nonces(wallet).call({
      _colivingBustCache: Date.now()
    })
    const number = this.web3.utils.toBN(nonce).toNumber()
    return number
  }

  /* ------- SETTERS ------- */

  async transfer(recipient: string, amount: BN) {
    const contractMethod = this.ColivingTokenContract.methods.transfer(
      recipient,
      amount
    )
    const tx = await this.ethWeb3Manager.sendTransaction(contractMethod)
    return { txReceipt: tx }
  }

  async transferFrom(
    owner: string,
    recipient: string,
    relayer: string,
    amount: BN
  ) {
    const method = this.ColivingTokenContract.methods.transferFrom(
      owner,
      recipient,
      amount
    )
    const tx = await this.ethWeb3Manager.relayTransaction(
      method,
      this.contractAddress,
      owner,
      relayer,
      /* retries */ 0
    )
    return { txReceipt: tx }
  }

  // Permit meta transaction of balance transfer
  async permit(
    owner: string, // address
    spender: string, // address
    value: BN, // uint
    deadline: number, // uint
    v: number, // uint8
    r: Uint8Array | Buffer, // bytes32
    s: Uint8Array | Buffer // bytes32
  ) {
    const contractMethod = this.ColivingTokenContract.methods.permit(
      owner,
      spender,
      value,
      deadline,
      v,
      r,
      s
    )
    const tx = await this.ethWeb3Manager.relayTransaction(
      contractMethod,
      this.contractAddress,
      owner,
      spender,
      /* retries */ 0
    )
    return tx
  }

  // Allow spender to withdraw from calling account up to value amount
  // https://github.com/ethereum/EIPs/blob/master/EIPS/eip-20.md
  async approve(spender: string, value: BN, privateKey = null) {
    const contractMethod = this.ColivingTokenContract.methods.approve(
      spender,
      value
    )
    let tx
    if (privateKey === null) {
      tx = await this.ethWeb3Manager.sendTransaction(contractMethod)
    } else {
      tx = await this.ethWeb3Manager.sendTransaction(
        contractMethod,
        this.contractAddress,
        privateKey
      )
    }
    return { txReceipt: tx }
  }

  async approveProxyTokens(
    owner: string,
    spender: string,
    value: BN,
    relayer: string
  ) {
    const method = this.ColivingTokenContract.methods.approve(spender, value)
    const tx = await this.ethWeb3Manager.relayTransaction(
      method,
      this.contractAddress,
      owner,
      relayer,
      /* retries */ 0
    )
    return { txReceipt: tx }
  }
}
