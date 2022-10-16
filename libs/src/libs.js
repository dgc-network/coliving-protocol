const packageJSON = require('../package.json')

const { EthWeb3Manager } = require('./services/ethWeb3Manager')
//const { SolanaColivingData } = require('./services/solanaColivingData/index')
const { Web3Manager } = require('./services/web3Manager')
const { EthContracts } = require('./services/ethContracts')
//const {
//  SolanaWeb3Manager,
//  SolanaUtils,
//  RewardsAttester
//} = require('./services/solana')
const { ColivingContracts } = require('./services/dataContracts')
const { IdentityService } = require('./services/identity')
const { Comstock } = require('./services/comstock')
const { Hedgehog } = require('./services/hedgehog')
const { ContentNode } = require('./services/contentNode')
const { DiscoveryNode } = require('./services/discoveryNode')
const { Wormhole } = require('./services/wormhole')
const { ColivingABIDecoder } = require('./services/ABIDecoder')
const { SchemaValidator } = require('./services/schemaValidator')
const { UserStateManager } = require('./userStateManager')
const SanityChecks = require('./sanityChecks')
const { Utils, Captcha } = require('./utils')
const { ServiceProvider } = require('./api/ServiceProvider')

const { Account } = require('./api/Account')
const { Users } = require('./api/Users')
const { DigitalContent } = require('./api/DigitalContent')
const { ContentLists } = require('./api/ContentList')
const { File } = require('./api/File')
const { Rewards } = require('./api/Rewards')
const { Reactions } = require('./api/Reactions')
const Web3 = require('./web3')

const { Keypair } = require('@solana/web3.js')
const { PublicKey } = require('@solana/web3.js')
const { getPlatformLocalStorage } = require('./utils/localStorage')

class ColivingLibs {
  /**
   * Configures an identity service wrapper
   * @param {string} url
   * @param {boolean?} useHedgehogLocalStorage whether or not to read hedgehog entropy in local storage
   */
  static configIdentityService (url, useHedgehogLocalStorage = true) {
    return { url, useHedgehogLocalStorage }
  }

  /**
   * Configures an identity service wrapper
   * @param {string} url
   */
  static configComstock (url) {
    return { url }
  }

  /**
   * Configures a content node wrapper
   * @param {string} fallbackUrl content node endpoint to fall back to on requests
   * @param {boolean} lazyConnect whether to delay connection to the node until the first
   * request that requires a connection is made.
   * @param {Set<string>?} passList whether or not to include only specified nodes (default null)
   * @param {Set<string>?} blockList whether or not to exclude any nodes (default null)
   * @param {object?} monitoringCallbacks callbacks to be invoked with metrics from requests sent to a service
   * @param {function} monitoringCallbacks.request
   * @param {function} monitoringCallbacks.healthCheck
   * @param {boolean} writeQuorumEnabled whether or not to enforce waiting for replication to 2/3 nodes when writing data
   */
  static configContentNode (
    fallbackUrl,
    lazyConnect = false,
    passList = null,
    blockList = null,
    monitoringCallbacks = {},
    writeQuorumEnabled = false
  ) {
    return {
      fallbackUrl,
      lazyConnect,
      passList,
      blockList,
      monitoringCallbacks,
      writeQuorumEnabled
    }
  }

  /**
   * Configures an external web3 to use with Coliving Libs (e.g. MetaMask)
   * @param {string} registryAddress
   * @param {Object} web3Provider equal to web.currentProvider
   * @param {?number} networkId network chain id
   * @param {?string} walletOverride wallet address to force use instead of the first wallet on the provided web3
   * @param {?number} walletIndex if using a wallet returned from web3, pick the wallet at this index
   */
  static async configExternalWeb3 (
    registryAddress,
    web3Provider,
    networkId,
    walletOverride = null
  ) {
    const web3Instance = await Utils.configureWeb3(web3Provider, networkId)
    if (!web3Instance) {
      throw new Error('External web3 incorrectly configured')
    }
    const wallets = await web3Instance.eth.getAccounts()
    return {
      registryAddress,
      useExternalWeb3: true,
      externalWeb3Config: {
        web3: web3Instance,
        ownerWallet: walletOverride || wallets[0]
      }
    }
  }

  /**
   * Configures an internal web3 to use (via Hedgehog)
   * @param {string} registryAddress
   * @param {string | Web3 | Array<string>} providers web3 provider endpoint(s)
   */
  static configInternalWeb3 (registryAddress, providers, privateKey) {
    let providerList
    if (typeof providers === 'string') {
      providerList = providers.split(',')
    } else if (providers instanceof Web3) {
      providerList = [providers]
    } else if (Array.isArray(providers)) {
      providerList = providers
    } else {
      throw new Error(
        'Providers must be of type string, Array, or Web3 instance'
      )
    }

    return {
      registryAddress,
      useExternalWeb3: false,
      internalWeb3Config: {
        web3ProviderEndpoints: providerList,
        privateKey
      }
    }
  }

  /**
   * Configures an eth web3
   * @param {string} tokenAddress
   * @param {string} registryAddress
   * @param {string | Web3 | Array<string>} providers web3 provider endpoint(s)
   * @param {string?} ownerWallet optional owner wallet to establish who we are sending transactions on behalf of
   * @param {string?} claimDistributionContractAddress
   * @param {string?} wormholeContractAddress
   */
  static configEthWeb3 (
    tokenAddress,
    registryAddress,
    providers,
    ownerWallet,
    claimDistributionContractAddress,
    wormholeContractAddress
  ) {
    let providerList
    if (typeof providers === 'string') {
      providerList = providers.split(',')
    } else if (providers instanceof Web3) {
      providerList = [providers]
    } else if (Array.isArray(providers)) {
      providerList = providers
    } else {
      throw new Error(
        'Providers must be of type string, Array, or Web3 instance'
      )
    }

    return {
      tokenAddress,
      registryAddress,
      providers: providerList,
      ownerWallet,
      claimDistributionContractAddress,
      wormholeContractAddress
    }
  }

  /**
   * Configures wormhole
   * @param {Object} config
   * @param {string | Array<string>} config.rpcHosts
   * @param {string} config.solBridgeAddress
   * @param {string} config.solTokenBridgeAddress
   * @param {string} config.ethBridgeAddress
   * @param {string} config.ethTokenBridgeAddress
   */
  static configWormhole ({
    rpcHosts,
    solBridgeAddress,
    solTokenBridgeAddress,
    ethBridgeAddress,
    ethTokenBridgeAddress
  }) {
    let rpcHostList
    if (typeof rpcHosts === 'string') {
      rpcHostList = rpcHosts.split(',')
    } else if (Array.isArray(rpcHosts)) {
      rpcHostList = rpcHosts
    } else {
      throw new Error('rpcHosts must be of type string or Array')
    }
    return {
      rpcHosts: rpcHostList,
      solBridgeAddress,
      solTokenBridgeAddress,
      ethBridgeAddress,
      ethTokenBridgeAddress
    }
  }

  /**
   * Configures a solana web3
   * @param {Object} config
   * @param {string} config.solanaClusterEndpoint the RPC endpoint to make requests against
   * @param {string} config.mintAddress wAudio mint address
   * @param {string} solanaTokenAddress native solana token program
   * @param {string} claimableTokenPDA the generated program derived address we use so our
   *  bank program can take ownership of accounts
   * @param {string} feePayerAddress address for the fee payer for transactions
   * @param {string} claimableTokenProgramAddress address of the coliving user bank program
   * @param {string} rewardsManagerProgramId address for the Rewards Manager program
   * @param {string} rewardsManagerProgramPDA Rewards Manager PDA
   * @param {string} rewardsManagerTokenPDA The PDA of the rewards manager funds holder account
   * @param {boolean} useRelay Whether to use identity as a relay or submit transactions locally
   * @param {Uint8Array} feePayerSecretKeys fee payer secret keys, if client wants to switch between different fee payers during relay
   * @param {number} confirmationTimeout solana web3 connection confirmationTimeout in ms
   * @param {PublicKey|string} colivingDataAdminStorageKeypairPublicKey admin storage PK for coliving-data program
   * @param {PublicKey|string} colivingDataProgramId program ID for the coliving-data Anchor program
   * @param {Idl} colivingDataIdl IDL for the coliving-data Anchor program.
   */
  static configSolanaWeb3 ({
    solanaClusterEndpoint,
    mintAddress,
    solanaTokenAddress,
    claimableTokenPDA,
    feePayerAddress,
    claimableTokenProgramAddress,
    rewardsManagerProgramId,
    rewardsManagerProgramPDA,
    rewardsManagerTokenPDA,
    useRelay,
    feePayerSecretKeys,
    confirmationTimeout,
    colivingDataAdminStorageKeypairPublicKey,
    colivingDataProgramId,
    colivingDataIdl
  }) {
    if (colivingDataAdminStorageKeypairPublicKey instanceof String) {
      colivingDataAdminStorageKeypairPublicKey = new PublicKey(
        colivingDataAdminStorageKeypairPublicKey
      )
    }
    if (colivingDataProgramId instanceof String) {
      colivingDataProgramId = new PublicKey(colivingDataProgramId)
    }
    return {
      solanaClusterEndpoint,
      mintAddress,
      solanaTokenAddress,
      claimableTokenPDA,
      feePayerAddress,
      claimableTokenProgramAddress,
      rewardsManagerProgramId,
      rewardsManagerProgramPDA,
      rewardsManagerTokenPDA,
      useRelay,
      feePayerKeypairs: feePayerSecretKeys
        ? feePayerSecretKeys.map((key) => Keypair.fromSecretKey(key))
        : null,
      confirmationTimeout,
      colivingDataAdminStorageKeypairPublicKey,
      colivingDataProgramId,
      colivingDataIdl
    }
  }

  /**
   * Configures a solana coliving-data
   * @param {Object} config
   * @param {string} config.programId Program ID of the coliving data program
   * @param {string} config.adminAccount Public Key of admin account
   */
  static configSolanaColivingData ({ programId, adminAccount }) {
    return {
      programId,
      adminAccount
    }
  }

  /**
   * Constructs an Coliving Libs instance with configs.
   * Unless default-valued, all configs are optional.
   * @example
   *  const coliving = ColivingLibs({
   *    discoveryNodeConfig: {},
   *    contentNodeConfig: configContentNode('https://my-creator.node')
   *  })
   *  await coliving.init()
   */
  constructor ({
    web3Config,
    ethWeb3Config,
    solanaWeb3Config,
    solanaColivingDataConfig,
    identityServiceConfig,
    discoveryNodeConfig,
    contentNodeConfig,
    comstockConfig,
    wormholeConfig,
    captchaConfig,
    hedgehogConfig,
    isServer,
    logger = console,
    isDebug = false,
    preferHigherPatchForPrimary = true,
    preferHigherPatchForSecondaries = true,
    localStorage = getPlatformLocalStorage()
  }) {
    // set version

    this.version = packageJSON.version

    this.ethWeb3Config = ethWeb3Config
    this.web3Config = web3Config
    this.solanaWeb3Config = solanaWeb3Config
    this.solanaColivingDataConfig = solanaColivingDataConfig
    this.identityServiceConfig = identityServiceConfig
    this.contentNodeConfig = contentNodeConfig
    this.discoveryNodeConfig = discoveryNodeConfig
    this.comstockConfig = comstockConfig
    this.wormholeConfig = wormholeConfig
    this.captchaConfig = captchaConfig
    this.hedgehogConfig = hedgehogConfig
    this.isServer = isServer
    this.isDebug = isDebug
    this.logger = logger

    this.ColivingABIDecoder = ColivingABIDecoder
    this.Utils = Utils

    // Services to initialize. Initialized in .init().
    this.userStateManager = null
    this.identityService = null
    this.hedgehog = null
    this.discoveryNode = null
    this.ethWeb3Manager = null
    this.ethContracts = null
    this.web3Manager = null
    this.solanaWeb3Manager = null
    this.anchorColivingData = null
    this.contracts = null
    this.contentNode = null

    // API
    this.Account = null
    this.User = null
    this.DigitalContent = null
    this.ContentList = null
    this.File = null
    this.Rewards = null
    this.Reactions = null

    this.preferHigherPatchForPrimary = preferHigherPatchForPrimary
    this.preferHigherPatchForSecondaries = preferHigherPatchForSecondaries
    this.localStorage = localStorage

    // Schemas
    const schemaValidator = new SchemaValidator()
    schemaValidator.init()
    this.schemas = schemaValidator.getSchemas()
  }

  /** Init services based on presence of a relevant config. */
  async init () {
    this.userStateManager = new UserStateManager({
      localStorage: this.localStorage
    })
    // Config external web3 is an async function, so await it here in case it needs to be
    this.web3Config = await this.web3Config

    /** Captcha */
    if (this.captchaConfig) {
      this.captcha = new Captcha(this.captchaConfig)
    }

    /** Identity Service */
    if (this.identityServiceConfig) {
      this.identityService = new IdentityService({
        identityServiceEndpoint: this.identityServiceConfig.url,
        captcha: this.captcha
      })
      const hedgehogService = new Hedgehog({
        identityService: this.identityService,
        useLocalStorage: this.identityServiceConfig.useHedgehogLocalStorage,
        localStorage: this.localStorage,
        ...this.hedgehogConfig
      })
      this.hedgehog = hedgehogService.instance
      await this.hedgehog.waitUntilReady()
    } else if (this.web3Config && !this.web3Config.useExternalWeb3) {
      throw new Error('Identity Service required for internal Web3')
    }

    /** Web3 Managers */
    if (this.ethWeb3Config) {
      this.ethWeb3Manager = new EthWeb3Manager({
        web3Config: this.ethWeb3Config,
        identityService: this.identityService,
        hedgehog: this.hedgehog
      })
    }
    if (this.web3Config) {
      this.web3Manager = new Web3Manager({
        web3Config: this.web3Config,
        identityService: this.identityService,
        hedgehog: this.hedgehog,
        isServer: this.isServer
      })
      await this.web3Manager.init()
      if (this.identityService) {
        this.identityService.setWeb3Manager(this.web3Manager)
      }
    }
    if (this.solanaWeb3Config) {
      this.solanaWeb3Manager = new SolanaWeb3Manager(
        this.solanaWeb3Config,
        this.identityService,
        this.web3Manager
      )
      await this.solanaWeb3Manager.init()
    }
    if (this.solanaWeb3Manager && this.solanaColivingDataConfig) {
      this.solanaColivingData = new SolanaColivingData(
        this.solanaColivingDataConfig,
        this.solanaWeb3Manager,
        this.web3Manager
      )
      await this.solanaColivingData.init()
    }

    /** Contracts - Eth and Data Contracts */
    const contractsToInit = []
    if (this.ethWeb3Manager) {
      this.ethContracts = new EthContracts({
        ethWeb3Manager: this.ethWeb3Manager,
        tokenContractAddress: this.ethWeb3Config
          ? this.ethWeb3Config.tokenAddress
          : null,
        registryAddress: this.ethWeb3Config
          ? this.ethWeb3Config.registryAddress
          : null,
        claimDistributionContractAddress:
          (this.ethWeb3Config &&
            this.ethWeb3Config.claimDistributionContractAddress) ||
          null,
        wormholeContractAddress:
          (this.ethWeb3Config && this.ethWeb3Config.wormholeContractAddress) ||
          null,
        isServer: this.isServer,
        logger: this.logger,
        isDebug: this.isDebug
      })
      contractsToInit.push(this.ethContracts.init())
    }
    if (this.web3Manager) {
      this.contracts = new ColivingContracts(
        this.web3Manager,
        this.web3Config ? this.web3Config.registryAddress : null,
        this.isServer,
        this.logger
      )
      contractsToInit.push(this.contracts.init())
    }
    await Promise.all(contractsToInit)
    if (
      this.wormholeConfig &&
      this.ethWeb3Manager &&
      this.ethContracts &&
      this.solanaWeb3Manager
    ) {
      this.wormholeClient = new Wormhole(
        this.hedgehog,
        this.ethWeb3Manager,
        this.ethContracts,
        this.identityService,
        this.solanaWeb3Manager,
        this.wormholeConfig.rpcHosts,
        this.wormholeConfig.solBridgeAddress,
        this.wormholeConfig.solTokenBridgeAddress,
        this.wormholeConfig.ethBridgeAddress,
        this.wormholeConfig.ethTokenBridgeAddress,
        this.isServer
      )
    }

    /** Discovery Node */
    if (this.discoveryNodeConfig) {
      this.discoveryNode = new DiscoveryNode({
        userStateManager: this.userStateManager,
        ethContracts: this.ethContracts,
        web3Manager: this.web3Manager,
        localStorage: this.localStorage,
        ...this.discoveryNodeConfig
      })
      await this.discoveryNode.init()
    }

    /** Creator Node */
    if (this.contentNodeConfig) {
      const currentUser = this.userStateManager.getCurrentUser()
      const contentNodeEndpoint = currentUser
        ? ContentNode.getPrimary(currentUser.content_node_endpoint) ||
          this.contentNodeConfig.fallbackUrl
        : this.contentNodeConfig.fallbackUrl

      this.contentNode = new ContentNode(
        this.web3Manager,
        contentNodeEndpoint,
        this.isServer,
        this.userStateManager,
        this.contentNodeConfig.lazyConnect,
        this.schemas,
        this.contentNodeConfig.passList,
        this.contentNodeConfig.blockList,
        this.contentNodeConfig.monitoringCallbacks,
        this.contentNodeConfig.writeQuorumEnabled
      )
      await this.contentNode.init()
    }

    /** Comstock */
    if (this.comstockConfig) {
      this.comstock = new Comstock(this.comstockConfig.url)
    }

    // Initialize apis
    const services = [
      this.userStateManager,
      this.identityService,
      this.hedgehog,
      this.discoveryNode,
      this.web3Manager,
      this.contracts,
      this.ethWeb3Manager,
      this.ethContracts,
      this.solanaWeb3Manager,
      this.anchorColivingData,
      this.wormholeClient,
      this.contentNode,
      this.comstock,
      this.captcha,
      this.isServer,
      this.logger
    ]
    this.ServiceProvider = new ServiceProvider(...services)
    this.User = new Users(
      this.ServiceProvider,
      this.preferHigherPatchForPrimary,
      this.preferHigherPatchForSecondaries,
      ...services
    )
    this.Account = new Account(this.User, ...services)
    this.DigitalContent = new DigitalContent(...services)
    this.ContentList = new ContentLists(...services)
    this.File = new File(this.User, ...services)
    this.Rewards = new Rewards(this.ServiceProvider, ...services)
    this.Reactions = new Reactions(...services)
  }
}

// This is needed to ensure default and named exports are handled correctly by rollup
// https://github.com/rollup/plugins/tree/master/packages/commonjs#defaultismoduleexports
// exports.__esModule = true

module.exports = ColivingLibs

module.exports.ColivingABIDecoder = ColivingABIDecoder
module.exports.Utils = Utils
//module.exports.SolanaUtils = SolanaUtils
module.exports.SanityChecks = SanityChecks
//module.exports.RewardsAttester = RewardsAttester
module.exports.ContentNode = ContentNode
