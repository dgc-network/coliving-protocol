const { libs: ColivingLibs } = require('@coliving/sdk')
const { setDefaultWasm } = require('@certusone/wormhole-sdk/lib/cjs/solana/wasm')

const config = require('./config')
const registryAddress = config.get('registryAddress')
const web3ProviderUrl = config.get('web3Provider')

// Fixed address of the SPL token program
const SOLANA_TOKEN_ADDRESS = 'TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA'

class ColivingLibsWrapper {
  constructor () {
    this.colivingLibsInstance = null
    setDefaultWasm('node')
  }

  async init () {
    const dataWeb3 = await ColivingLibs.Utils.configureWeb3(web3ProviderUrl, null, false)
    if (!dataWeb3) throw new Error('Web3 incorrectly configured')

    const discoveryNodeWhitelist = config.get('discoveryNodeWhitelist')
      ? new Set(config.get('discoveryNodeWhitelist').split(','))
      : null

    const feePayerSecretKeys = config.get('solanaFeePayerWallets')
      ? config.get('solanaFeePayerWallets')
        .map(item => item.privateKey)
        .map(key => Uint8Array.from(key))
      : null

    const solanaWeb3Config = ColivingLibs.configSolanaWeb3({
      solanaClusterEndpoint: config.get('solanaEndpoint'),
      mintAddress: config.get('solanaMintAddress'),
      solanaTokenAddress: SOLANA_TOKEN_ADDRESS,
      claimableTokenProgramAddress: config.get('solanaClaimableTokenProgramAddress'),
      rewardsManagerProgramId: config.get('solanaRewardsManagerProgramId'),
      rewardsManagerProgramPDA: config.get('solanaRewardsManagerProgramPDA'),
      rewardsManagerTokenPDA: config.get('solanaRewardsManagerTokenPDA'),
      // Never use the relay path in identity
      useRelay: false,
      feePayerSecretKeys,
      confirmationTimeout: config.get('solanaConfirmationTimeout')
    })

    const wormholeConfig = ColivingLibs.configWormhole({
      rpcHosts: config.get('wormholeRPCHosts'),
      solBridgeAddress: config.get('solBridgeAddress'),
      solTokenBridgeAddress: config.get('solTokenBridgeAddress'),
      ethBridgeAddress: config.get('ethBridgeAddress'),
      ethTokenBridgeAddress: config.get('ethTokenBridgeAddress')
    })

    let colivingInstance = new ColivingLibs({
      discoveryNodeConfig: {
        whitelist: discoveryNodeWhitelist
      },
      ethWeb3Config: ColivingLibs.configEthWeb3(
        config.get('ethTokenAddress'),
        config.get('ethRegistryAddress'),
        config.get('ethProviderUrl'),
        config.get('ethOwnerWallet')
      ),
      web3Config: {
        registryAddress,
        useExternalWeb3: true,
        externalWeb3Config: {
          web3: dataWeb3,
          // this is a stopgap since libs external web3 init requires an ownerWallet
          // this is never actually used in the service's libs calls
          ownerWallet: config.get('relayerPublicKey')
        }
      },
      isServer: true,
      captchaConfig: { serviceKey: config.get('recaptchaServiceKey') },
      solanaWeb3Config,
      wormholeConfig
    })

    await colivingInstance.init()
    this.colivingLibsInstance = colivingInstance
  }

  getColivingLibs () {
    return this.colivingLibsInstance
  }

  /**
   * Async getter for libs. Resolves when libs is initialized.
   */
  async getColivingLibsAsync () {
    if (this.colivingLibsInstance) {
      return this.colivingLibsInstance
    }
    return new Promise(resolve => {
      const i = setInterval(() => {
        if (this.colivingLibsInstance) {
          clearInterval(i)
          resolve(this.colivingLibsInstance)
        }
      }, 1000)
    })
  }
}

const colivingLibsWrapper = new ColivingLibsWrapper()

module.exports = colivingLibsWrapper
