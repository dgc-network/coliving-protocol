const fs = require('fs')
const untildify = require('untildify')
const Web3 = require('web3')
const axios = require('axios')
const { libs: ColivingLibs } = require('@coliving/sdk')
//const { ContentNode, Utils } = ColivingLibs
const { ContentNode, Utils } = require('@coliving/sdk')
const config = require('../config/config')

const DISCOVERY_NODE_ENDPOINT = 'http://dn1_web-server_1:5000'
const MAX_INDEXING_TIMEOUT = 10000

/**
 * Picks up envvars written by contracts init and loads them into convict
 */
const loadLibsVars = () => {
  const configDir = untildify(config.get('coliving_config_dir'))
  const dataConfig = `${configDir}/data-contract-config.json`
  const ethConfig = `${configDir}/eth-contract-config.json`
  try {
    console.log(`Config dir: ${configDir}`)
    console.log(dataConfig)
    console.log(ethConfig)
    const dataConfigJson = require(dataConfig)
    const ethConfigJson = require(ethConfig)

    const convictConfig = {
      registry_address: dataConfigJson.registryAddress,
      owner_wallet: dataConfigJson.ownerWallet,
      eth_token_address: ethConfigJson.colivingTokenAddress,
      eth_owner_wallet: ethConfigJson.ownerWallet,
      eth_registry_address: ethConfigJson.registryAddress,
      data_wallets: dataConfigJson.allWallets
    }

    config.load(convictConfig)
  } catch (e) {
    console.log(`Failed to initialize libs, ${e}`)
  }
}

loadLibsVars()

// Public

/**
 * Constructor for a new LibsWrapper.
 *
 * Every instance of a LibsWrapper is tied to a single wallet, and thus a single user. Multiple instances of LibsWrappers can exist.
 * Each method may throw.
 * @param {int} walletIndex Ganache can be setup with multiple pre-created wallets. WalletIndex lets you pick which wallet to use for libs.
 */
function LibsWrapper(walletIndex = 0) {
  this.libsInstance = null

  const assertLibsDidInit = () => {
    if (!this.libsInstance) throw new Error('Error: libs not initialized!')
  }

  /**
   * Initialize libs. Must be called before any libs operations, or getting the libs instance.
   * LibsWrapper Will throw is this invariant is violated.
   */
  this.initLibs = async () => {
    // If we've already initted, immediately return
    if (this.libsInstance) return

    const [
      // DATA Registry
      REGISTRY_ADDRESS,
      // Gateway for DATA calls.
      WEB3_PROVIDER_URLS,
      ETH_TOKEN_ADDRESS,
      ETH_REGISTRY_ADDRESS,
      ETH_PROVIDER_URL,
      ETH_OWNER_WALLET,
      USER_NODE,
      IDENTITY_SERVICE
    ] = [
        config.get('registry_address'),
        config.get('web3_provider_urls'),
        config.get('eth_token_address'),
        config.get('eth_registry_address'),
        config.get('eth_provider_url'),
        config.get('eth_owner_wallet'),
        config.get('user_node'),
        config.get('identity_service')
      ]

    const dataWeb3 = new Web3(
      new Web3.providers.HttpProvider(WEB3_PROVIDER_URLS)
    )

    const walletAddress = config.get('data_wallets')[walletIndex]
    this.walletAddress = walletAddress
    this.walletIndex = walletIndex
    this.userId = null // to be updated on init

    const web3Config = await ColivingLibs.configExternalWeb3(
      REGISTRY_ADDRESS,
      dataWeb3,
      null /* networkId */,
      walletAddress /* wallet override */
    )

    const ethWeb3Config = ColivingLibs.configEthWeb3(
      ETH_TOKEN_ADDRESS,
      ETH_REGISTRY_ADDRESS,
      ETH_PROVIDER_URL,
      ETH_OWNER_WALLET
    )
    const discoveryNodeConfig = {}

    const contentNodeConfig = ColivingLibs.configContentNode(USER_NODE, true)
    const identityServiceConfig = ColivingLibs.configIdentityService(
      IDENTITY_SERVICE
    )

    const libs = new ColivingLibs({
      web3Config,
      ethWeb3Config,
      discoveryNodeConfig,
      identityServiceConfig,
      contentNodeConfig,
      isServer: true,
      enableUserReplicaSetManagerContract: true,
      preferHigherPatchForPrimary: true,
      preferHigherPatchForSecondaries: true
    })

    try {
      await libs.init()
      this.libsInstance = libs
    } catch (e) {
      console.error(`Error initting libs: ${e}`)
    }
  }

  this.getLatestBlockOnChain = async () => {
    assertLibsDidInit()
    const {
      number: latestBlock
    } = await this.libsInstance.web3Manager.web3.eth.getBlock('latest')
    return latestBlock
  }

  /**
   * Signs up a user.
   * @param {*} args metadata describing a user.
   */
  this.signUp = async ({ metadata }) => {
    assertLibsDidInit()
    const signUpResp = await this.libsInstance.Account.signUp(
      metadata.email,
      metadata.password,
      metadata,
      metadata.profilePictureFile /* profile picture */,
      metadata.coverPhotoFile /* cover photo */,
      false /* has wallet */,
      null /* host */
    )

    // Update libs instance with associated userId
    if (!signUpResp.error) this.userId = signUpResp.userId

    return signUpResp
  }

  /**
   * Selects a primary and set of secondaries from set of valid nodes on chain.
   *
   * @param {*} args number of nodes to include in replica set, whitelist of nodes to select from, blacklist of nodes to exclude
   */
  this.autoSelectContentNodes = async ({
    numberOfNodes,
    whitelist,
    blacklist
  }) => {
    assertLibsDidInit()
    return this.libsInstance.ServiceProvider.autoSelectContentNodes({
      numberOfNodes,
      whitelist,
      blacklist
    })
  }

  this.setContentNodeEndpoint = async primary => {
    assertLibsDidInit()
    return this.libsInstance.contentNode.setEndpoint(primary)
  }

  this.updateCreator = async (userId, metadata) => {
    assertLibsDidInit()
    return this.libsInstance.User.updateCreator(userId, metadata)
  }

  /**
   * Exposes the function used by libs to clean the metadata object passed
   * when updating or creating a user since it could have extra fields.
   * - Add what user props might be missing to normalize
   * - Only keep core fields in USER_PROPS and 'user_id'.
   */
  this.cleanUserMetadata = metadata => {
    assertLibsDidInit()
    return this.libsInstance.User.cleanUserMetadata(metadata)
  }

  /**
   * Upload a digital_content.
   *
   * @param {*} args digitalContentFile and metadata
   * @returns digitalContentId
   * @throws any libs error
   */
  this.uploadDigitalContent = async ({ digitalContentFile, digitalContentMetadata }) => {
    assertLibsDidInit()

    const { digitalContentId, error } = await this.libsInstance.DigitalContent.uploadDigitalContent(
      digitalContentFile,
      null /* image */,
      digitalContentMetadata,
      () => { } /* on progress */
    )
    if (error) throw error
    return digitalContentId
  }

  /**
   * Updates an existing digital_content given metadata. This function expects that all associated files
   * such as digital_content content, cover art are already on content node.
   * @param {Object} metadata json of the digital_content metadata with all fields, missing fields will error
   */
  this.updateDigitalContentOnChainAndCnode = async metadata => {
    const {
      blockHash,
      blockNumber,
      digitalContentId
    } = await this.libsInstance.DigitalContent.updateDigitalContent(metadata)
    return { blockHash, blockNumber, digitalContentId }
  }

  this.uploadDigitalContentCoverArt = async coverArtFilePath => {
    const coverArtFile = fs.createReadStream(coverArtFilePath)
    const resp = await this.libsInstance.File.uploadImage(
      coverArtFile,
      true // square
    )
    const { dirCID } = resp
    return dirCID
  }

  /**
   * Repost a digital_content.
   *
   * @param {number} args digitalContentId
   * @returns transaction receipt
   * @throws any libs error
   */
  this.repostDigitalContent = async digitalContentId => {
    assertLibsDidInit()
    return await this.libsInstance.DigitalContent.addDigitalContentRepost(digitalContentId)
  }

  /**
   * Gets reposters for a digitalContents.
   *
   * @param {number} args digitalContentId
   * @returns digitalContentId
   * @throws any libs error
   */
  this.getRepostersForDigitalContent = async digitalContentId => {
    assertLibsDidInit()
    return await this.libsInstance.DigitalContent.getRepostersForDigitalContent(100, 0, digitalContentId)
  }

  /**
   * Fetch digital_content metadata from discprov.
   * @param {*} digitalContentId
   * @returns digital_content metadata
   */
  this.getDigitalContent = async digitalContentId => {
    assertLibsDidInit()
    const digitalContents = await this.libsInstance.discoveryNode.getDigitalContents(
      1 /* Limit */,
      0 /* Ofset */,
      [digitalContentId] /* idsArray */,
      null /* targetUserId */,
      null /* sort */,
      null /* minBlockNumber */,
      null /* filterDeleted */,
      true /* withUsers */
    )

    if (!digitalContents || !digitalContents.length) {
      throw new Error('No digitalContents returned.')
    }
    return digitalContents[0]
  }

  /**
   * Fetch user metadata from discprov
   * @param {*} userId
   * @return user metadata
   */
  this.getUser = async userId => {
    assertLibsDidInit()
    const users = await this.libsInstance.User.getUsers(
      1 /* limit */,
      0 /* offset */,
      [userId]
    )
    if (!users.length) {
      throw new Error('No users!')
    }
    return users[0]
  }

  /**
   * Fetch users metadata from discovery node given array of userIds
   * @param {number[]} userIds int array of user ids
   */
  this.getUsers = async userIds => {
    assertLibsDidInit()
    const users = await this.libsInstance.User.getUsers(
      1 /* limit */,
      0 /* offset */,
      userIds
    )
    if (!users.length || users.length !== userIds.length) {
      throw new Error('No users or not all users found')
    }
    return users
  }

  /**
   * Fetch user account from /user/account with wallet param
   * @param {string} wallet wallet address
   */
  this.getUserAccount = async wallet => {
    assertLibsDidInit()
    const userAccount = await this.libsInstance.discoveryNode.getUserAccount(
      wallet
    )

    if (!userAccount) {
      throw new Error('No user account found.')
    }

    return userAccount
  }

  /**
   * Updates userStateManager and updates the primary endpoint in libsInstance.contentNode
   * @param {Object} userAccount new metadata field
   */
  this.setCurrentUserAndUpdateLibs = async userAccount => {
    assertLibsDidInit()
    this.setCurrentUser(userAccount)
    const contentNodeEndpointField = userAccount.content_node_endpoint
    if (contentNodeEndpointField) {
      this.getPrimaryAndSetLibs(contentNodeEndpointField)
    }
  }

  /**
   * Updates userStateManager with input user metadata
   * @param {object} user user metadata
   */
  this.setCurrentUser = user => {
    assertLibsDidInit()
    this.libsInstance.userStateManager.setCurrentUser(user)
  }

  /**
   * Gets the primary off the user metadata and then sets the primary
   * on the ContentNode instance in libs
   * @param {string} contentNodeEndpointField content_node_endpoint field in user metadata
   */
  this.getPrimaryAndSetLibs = contentNodeEndpointField => {
    assertLibsDidInit()
    const primary = ContentNode.getPrimary(contentNodeEndpointField)
    this.libsInstance.contentNode.setEndpoint(primary)
  }

  /**
   * Wrapper for libsInstance.contentNode.getEndpoints()
   * @param {string} contentNodesEndpointField content_node_endpoint field from user's metadata
   */
  this.getContentNodeEndpoints = contentNodesEndpointField => {
    assertLibsDidInit()
    return ContentNode.getEndpoints(contentNodesEndpointField)
  }

  this.getPrimary = contentNodesEndpointField => {
    assertLibsDidInit()
    return ContentNode.getPrimary(contentNodesEndpointField)
  }

  this.getSecondaries = contentNodesEndpointField => {
    assertLibsDidInit()
    return ContentNode.getSecondaries(contentNodesEndpointField)
  }

  /**
   * Updates the metadata on chain and uploads new metadata instance on content node
   * @param {Object} param
   * @param {Object} param.newMetadata new metadata object to update in content nodes and on chain
   * @param {number} param.userId
   */
  this.updateAndUploadMetadata = async ({ newMetadata, userId }) => {
    assertLibsDidInit()
    return await this.libsInstance.User.updateAndUploadMetadata({
      newMetadata,
      userId
    })
  }

  /**
   * Wrapper for libsInstance.contentNode.getClockValuesFromReplicaSet()
   */
  this.getClockValuesFromReplicaSet = async () => {
    assertLibsDidInit()
    return this.libsInstance.contentNode.getClockValuesFromReplicaSet()
  }

  /**
   * Gets the user associated with the wallet set in libs
   */
  this.getLibsUserInfo = async () => {
    assertLibsDidInit()
    const users = await this.libsInstance.User.getUsers(
      1,
      0,
      null,
      this.getWalletAddress()
    )

    if (!users.length) {
      throw new Error('No users!')
    }

    if (!this.userId) this.userId = users[0].user_id

    return users[0]
  }

  /**
   * Add ipld blacklist txn with bad CID to chain
   * @param {string} digest base 58 decoded in hex
   * @param {string} blacklisterAddressPrivateKey private key associated with blacklisterAddress
   */
  this.addIPLDToBlacklist = async (digest, blacklisterAddressPrivateKey) => {
    assertLibsDidInit()
    const ipldTxReceipt = await this.libsInstance.contracts.IPLDBlacklistFactoryClient.addIPLDToBlacklist(
      digest,
      blacklisterAddressPrivateKey
    )
    return ipldTxReceipt
  }

  /**
   * Add an add digital_content txn to chain
   * @param {int} userId
   * @param {object} param2 digital_content data
   */
  this.addDigitalContentToChain = async (userId, { digest, hashFn, size }) => {
    assertLibsDidInit()
    const digitalContentTxReceipt = await this.libsInstance.contracts.DigitalContentFactoryClient.addDigitalContent(
      userId,
      digest,
      hashFn,
      size
    )
    return digitalContentTxReceipt
  }

  /**
   * Add an update digital_content txn to chain.
   * WARNING: This will break indexing if the tx contains CIDs that don't exist on any CN.
   * Make sure you call uploadDigitalContentMetadata first!
   * @param {int} digitalContentId
   * @param {int} userId
   * @param {object} param3 digital_content data
   */
  this.updateDigitalContentOnChain = async (
    digitalContentId,
    userId,
    { digest, hashFn, size }
  ) => {
    assertLibsDidInit()
    const digitalContentTxReceipt = await this.libsInstance.contracts.DigitalContentFactoryClient.updateDigitalContent(
      digitalContentId,
      userId,
      digest,
      hashFn,
      size
    )
    return digitalContentTxReceipt
  }

  /**
   * Add an update user metadata CID txn to chain
   * @param {int} userId
   * @param {string} multihashDigest
   */
  this.updateMultihash = async (userId, multihashDigest) => {
    assertLibsDidInit()
    const updateMultihashTxReceipt = await this.libsInstance.contracts.UserFactoryClient.updateMultihash(
      userId,
      multihashDigest
    )
    return updateMultihashTxReceipt
  }

  /**
   * Add an update user cover photo txn to chain
   * @param {int} userId
   * @param {string} coverPhotoMultihashDigest
   */
  this.updateCoverPhoto = async (userId, coverPhotoMultihashDigest) => {
    assertLibsDidInit()
    const updateCoverPhotoTxReceipt = await this.libsInstance.contracts.UserFactoryClient.updateCoverPhoto(
      userId,
      coverPhotoMultihashDigest
    )
    return updateCoverPhotoTxReceipt
  }

  /**
   * Add an update user profile photo txn to chain
   * @param {int} userId
   * @param {string} profilePhotoMultihashDigest
   */
  this.updateProfilePhoto = async (userId, profilePhotoMultihashDigest) => {
    assertLibsDidInit()
    const updateProfilePhotoTxReceipt = await this.libsInstance.contracts.UserFactoryClient.updateProfilePhoto(
      userId,
      profilePhotoMultihashDigest
    )
    return updateProfilePhotoTxReceipt
  }

  /**
   * Add a create contentList txn to chain
   * @param {int} userId
   * @param {string} contentListName
   * @param {boolean} isPrivate
   * @param {boolean} isAlbum
   * @param {array} digitalContentIds
   */
  this.createContentList = async (
    userId,
    contentListName,
    isPrivate,
    isAlbum,
    digitalContentIds
  ) => {
    assertLibsDidInit()
    const createContentListTxReceipt = await this.libsInstance.contracts.ContentListFactoryClient.createContentList(
      userId,
      contentListName,
      isPrivate,
      isAlbum,
      digitalContentIds
    )
    return createContentListTxReceipt
  }

  /**
   * Add a contentList digital_content addition txn to chain
   * @param {number} contentListId
   * @param {number} digitalContentId
   */
  this.addContentListDigitalContent = async (contentListId, digitalContentId) => {
    assertLibsDidInit()
    const addContentListDigitalContentTxReceipt = await this.libsInstance.contracts.ContentListFactoryClient.addContentListDigitalContent(
      contentListId,
      digitalContentId
    )
    return addContentListDigitalContentTxReceipt
  }

  this.uploadContentListCoverPhoto = async coverPhotoFile => {
    assertLibsDidInit()
    const dirCid = await this.libsInstance.ContentList.uploadContentListCoverPhoto(
      coverPhotoFile
    )
    return dirCid
  }

  /**
   * Add an update contentList txn to chain
   * @param {*} contentListId
   * @param {*} updatedContentListImageMultihashDigest
   */
  this.updateContentListCoverPhoto = async (
    contentListId,
    updatedContentListImageMultihashDigest
  ) => {
    assertLibsDidInit()
    const updateContentListCoverPhotoTxReceipt = await this.libsInstance.contracts.ContentListFactoryClient.updateContentListCoverPhoto(
      contentListId,
      updatedContentListImageMultihashDigest
    )
    return updateContentListCoverPhotoTxReceipt
  }

  // returns array of contentList objs
  this.getContentLists = async (
    limit = 100,
    offset = 0,
    idsArray = null,
    targetUserId = null,
    withUsers = false
  ) => {
    assertLibsDidInit()
    const contentLists = await this.libsInstance.ContentList.getContentLists(
      limit,
      offset,
      idsArray,
      targetUserId,
      withUsers
    )

    if (!contentLists || contentLists.length === 0) {
      throw new Error('No contentLists found!')
    }

    return contentLists
  }

  this.getWalletAddress = () => {
    return this.libsInstance.web3Manager.getWalletAddress()
  }

  this.getServices = async type => {
    return this.libsInstance.ethContracts.ServiceProviderFactoryClient.getServiceProviderList(
      type
    )
  }

  this.getServiceEndpointInfo = async (serviceType, serviceId) => {
    return this.libsInstance.ethContracts.ServiceProviderFactoryClient.getServiceEndpointInfo(
      serviceType,
      serviceId
    )
  }

  this.getUserReplicaSet = async userId => {
    return this.libsInstance.contracts.UserReplicaSetManagerClient.getUserReplicaSet(
      userId
    )
  }

  this.getContentNodeWallets = async cnodeId => {
    return this.libsInstance.contracts.UserReplicaSetManagerClient.getContentNodeWallets(
      cnodeId
    )
  }

  this.updateReplicaSet = async (userId, primary, secondaries) => {
    return this.libsInstance.contracts.UserReplicaSetManagerClient.updateReplicaSet(
      userId,
      primary,
      secondaries
    )
  }

  this.updateBio = async (userId, bioString) => {
    return this.libsInstance.contracts.UserFactoryClient.updateBio(
      userId,
      bioString
    )
  }

  this.updateName = async (userId, userName) => {
    return this.libsInstance.contracts.UserFactoryClient.updateBio(
      userId,
      userName
    )
  }

  this.getDiscoveryNodeEndpoint = () => {
    return this.libsInstance.discoveryNode.discoveryNodeEndpoint
  }

  this.getURSMContentNodes = ownerWallet => {
    return this.libsInstance.discoveryNode.getURSMContentNodes(ownerWallet)
  }

  // Record a single digital_content listen
  this.logDigitalContentListen = (
    digitalContentId,
    userId,
    listenerAddress,
    signatureData,
    solanaListen
  ) => {
    return this.libsInstance.identityService.logDigitalContentListen(
      digitalContentId,
      userId,
      listenerAddress,
      signatureData,
      solanaListen
    )
  }

  /**
   * Wait for the discovery node to catch up to the latest block on chain up to a max
   * indexing timeout of default 10000ms. Used to check regular block indexing.
   * @param {number} [maxIndexingTimeout=10000] max time indexing window
   */
  this.waitForLatestBlock = async (
    maxIndexingTimeout = MAX_INDEXING_TIMEOUT
  ) => {
    let latestBlockOnChain = -1
    let latestIndexedBlock = -1

    try {
      // Note: this is /not/ the block of which a certain txn occurred. This is just the
      // latest block on chain. (e.g. Upload digital_content occurred at block 80; latest block on chain
      // might be 83). This method is the quickest way to attempt to poll up to a reasonably
      // close block without having to change libs API.
      latestBlockOnChain = await this.getLatestBlockOnChain()

      console.log(
        `[Block Check] Waiting for #${latestBlockOnChain} to be indexed...`
      )

      const startTime = Date.now()
      while (Date.now() - startTime < maxIndexingTimeout) {
        latestIndexedBlock = await this._getLatestIndexedBlock()
        if (latestIndexedBlock >= latestBlockOnChain) {
          console.log(
            `[Block Check] Discovery Node has indexed #${latestBlockOnChain}!`
          )
          return
        }
      }
    } catch (e) {
      const errorMsg = '[Block Check] Error with checking latest indexed block'
      console.error(errorMsg, e)
      throw new Error(`${errorMsg}\n${e}`)
    }
    console.warn(
      `[Block Check] Did not index #${latestBlockOnChain} within ${maxIndexingTimeout}ms. Latest block: ${latestIndexedBlock}`
    )
  }

  /**
   * Wait for the discovery node to catch up to the latest block on chain up to a max
   * indexing timeout of default 10000ms.
   * @param {number} [maxIndexingTimeout=10000] max time indexing window
   */
  this.waitForLatestIPLDBlock = async (
    maxIndexingTimeout = MAX_INDEXING_TIMEOUT
  ) => {
    let latestBlockOnChain = -1
    let latestIndexedBlock = -1

    try {
      // Note: this is /not/ the block of which a certain txn occurred. This is just the
      // latest block on chain. (e.g. Upload digital_content occurred at block 80; latest block on chain
      // might be 83). This method is the quickest way to attempt to poll up to a reasonably
      // close block without having to change libs API.
      latestBlockOnChain = await this.getLatestBlockOnChain()

      console.log(
        `[IPLD Block Check] Waiting for #${latestBlockOnChain} to be indexed...`
      )

      const startTime = Date.now()
      while (Date.now() - startTime < maxIndexingTimeout) {
        latestIndexedBlock = await this._getLatestIndexedIpldBlock()
        if (latestIndexedBlock >= latestBlockOnChain) {
          console.log(
            `[IPLD Block Check] Discovery Node has indexed #${latestBlockOnChain}!`
          )
          return
        }
      }
    } catch (e) {
      const errorMsg =
        '[IPLD Block Check] Error with checking latest indexed block'
      console.error(errorMsg, e)
      throw new Error(`${errorMsg}\n${e}`)
    }
    console.warn(
      `[IPLD Block Check] Did not index #${latestBlockOnChain} within ${maxIndexingTimeout}ms. Latest block: ${latestIndexedBlock}`
    )
  }

  this._getLatestIndexedBlock = async (endpoint = DISCOVERY_NODE_ENDPOINT) => {
    return (
      await axios({
        method: 'get',
        baseURL: endpoint,
        url: '/health_check'
      })
    ).data.latest_indexed_block
  }

  this._getLatestIndexedIpldBlock = async (
    endpoint = DISCOVERY_NODE_ENDPOINT
  ) => {
    return (
      await axios({
        method: 'get',
        baseURL: endpoint,
        url: '/ipld_block_check'
      })
    ).data.data.db.number
  }

  this.updateUserStateManagerToChainData = async userId => {
    const users = await this.libsInstance.discoveryNode.getUsers(1, 0, [
      userId
    ])
    if (!users || !users[0])
      throw new Error(
        `[updateUserStateManagerToChainData] Cannot update user because no current record exists for user id ${userId}`
      )

    const metadata = users[0]

    this.libsInstance.userStateManager.setCurrentUser(metadata)
  }
}

module.exports = { LibsWrapper, Utils }
