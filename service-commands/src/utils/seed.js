const fs = require('fs')
const _ = require('lodash')
const { libs: ColivingLibs } = require('@coliving/sdk')
const {
  TEMP_IMAGE_STORAGE_PATH,
  TEMP_AGREEMENT_STORAGE_PATH,
  ETH_REGISTRY_ADDRESS,
  ETH_TOKEN_ADDRESS,
  ETH_OWNER_WALLET,
  DATA_CONTRACTS_REGISTRY_ADDRESS,
  CONTENT_NODE_ALLOWLIST,
  DATA_CONTRACTS_PROVIDER_ENDPOINTS,
  USER_METADATA_ENDPOINT,
  IDENTITY_SERVICE_ENDPOINT,
  ETH_PROVIDER_ENDPOINT,
  SOLANA_ENDPOINT,
  SOLANA_MINT_ADDRESS,
  SOLANA_TOKEN_ADDRESS,
  SOLANA_CLAIMABLE_TOKEN_PROGRAM_ADDRESS,
  SOLANA_REWARDS_MANAGER_PROGRAM_ID,
  SOLANA_REWARDS_MANAGER_PROGRAM_PDA,
  SOLANA_REWARDS_MANAGER_TOKEN_PDA,
  SOLANA_FEE_PAYER_SECRET_KEYS
} = require('./constants')

const {
  getRandomAgreementMetadata,
  getRandomAgreementFilePath,
  getRandomImageFilePath,
  r6
} = require('./random')

const getLibsConfig = overrideConfig => {
  const useHedgehogLocalStorage = false
  const lazyConnect = true
  const colivingLibsConfig = {
    ethWeb3Config: ColivingLibs.configEthWeb3(
      ETH_TOKEN_ADDRESS,
      ETH_REGISTRY_ADDRESS,
      ETH_PROVIDER_ENDPOINT,
      ETH_OWNER_WALLET
    ),
    web3Config: ColivingLibs.configInternalWeb3(
      DATA_CONTRACTS_REGISTRY_ADDRESS,
      DATA_CONTRACTS_PROVIDER_ENDPOINTS
    ),
    contentNodeConfig: ColivingLibs.configContentNode(
      USER_METADATA_ENDPOINT,
      lazyConnect,
      CONTENT_NODE_ALLOWLIST
    ),
    discoveryNodeConfig: {},
    identityServiceConfig: ColivingLibs.configIdentityService(
      IDENTITY_SERVICE_ENDPOINT,
      useHedgehogLocalStorage
    ),
    solanaWeb3Config: ColivingLibs.configSolanaWeb3({
      solanaClusterEndpoint: SOLANA_ENDPOINT,
      mintAddress: SOLANA_MINT_ADDRESS,
      solanaTokenAddress: SOLANA_TOKEN_ADDRESS,
      claimableTokenProgramAddress: SOLANA_CLAIMABLE_TOKEN_PROGRAM_ADDRESS,
      rewardsManagerProgramId: SOLANA_REWARDS_MANAGER_PROGRAM_ID,
      rewardsManagerProgramPDA: SOLANA_REWARDS_MANAGER_PROGRAM_PDA,
      rewardsManagerTokenPDA: SOLANA_REWARDS_MANAGER_TOKEN_PDA,
      useRelay: true,
      feePayerSecretKeys: SOLANA_FEE_PAYER_SECRET_KEYS
    }),
    isServer: true,
    enableUserReplicaSetManagerContract: true
  }
  return _.merge(colivingLibsConfig, overrideConfig)
}

const camelToKebabCase = str =>
  str
    .replace(/([A-Z])([A-Z])/g, '$1-$2')
    .replace(/([a-z])([A-Z])/g, '$1-$2')
    .replace(/[\s_]+/g, '-')
    .toLowerCase()

const kebabToCamelCase = str => str.replace(/-./g, x => x[1].toUpperCase())

const parseMetadataIntoObject = commaSeparatedKeyValuePairs => {
  const metadata = {}
  commaSeparatedKeyValuePairs.split(',').forEach(kvPair => {
    let [key, value] = kvPair.split('=')
    if (value === 'true') {
      value = true
    }
    metadata[key] = value
  })
  return metadata
}

const getUserProvidedOrRandomAgreementFile = async userInputPath => {
  let path
  if (userInputPath) {
    path = userInputPath
  } else {
    path = await getRandomAgreementFilePath(TEMP_AGREEMENT_STORAGE_PATH)
  }
  return fs.createReadStream(path)
}

const getUserProvidedOrRandomImageFile = async userInputPath => {
  let path
  if (userInputPath) {
    path = userInputPath
  } else {
    path = await getRandomImageFilePath(TEMP_IMAGE_STORAGE_PATH)
  }
  return null // fs.createReadStream(path) TODO figure this out - has to do with issue referenced here https://github.com/dgc-network/coliving-protocol/blob/926129262e/service-commands/src/commands/users.js#L15-L19
}

const getProgressCallback = () => {
  const progressCallback = percentComplete => {
    console.log(`${percentComplete} agreement upload completed...`)
  }
  return progressCallback
}

const getUserProvidedOrRandomAgreementMetadata = (
  userProvidedMetadata,
  seedSession
) => {
  const { userId } = seedSession.cache.getActiveUser()
  let metadataObj = getRandomAgreementMetadata(userId)
  if (userProvidedMetadata) {
    metadataObj = Object.assign(metadataObj, userProvidedMetadata)
  }
  return metadataObj
}

const parseSeedActionRepeatCount = userInput => {
  let count
  if (userInput) {
    try {
      count = Number(userInput)
    } catch (e) {
      throw new Error(
        `${userInput} cannot be converted to a number for repeating seed actions.`
      )
    }
  }
  return count
}

const passThroughUserInput = userInput => userInput

const getRandomUserIdFromCurrentSeedSessionCache = (userInput, seedSession) => {
  let userId
  if (userInput) {
    userId = userInput
  } else {
    const activeUser = seedSession.cache.getActiveUser()
    const cachedUsers = seedSession.cache.getUsers()
    const randomUsersPool = cachedUsers.filter(
      u => u.userId !== activeUser.userId
    )
    const randomUser = _.sample(randomUsersPool)
    userId = randomUser.userId
  }
  return userId
}

const getRandomAgreementIdFromCurrentSeedSessionCache = (
  userInput,
  seedSession
) => {
  let agreementId
  if (userInput) {
    agreementId = userInput
  } else {
    const cachedAgreements = seedSession.cache.getAgreements()
    agreementId = _.sample(cachedAgreements)
  }
  return agreementId
}

const addAgreementToSeedSessionCache = (response, seedSession) => {
  const { agreementId } = response
  const { userId } = seedSession.cache.getActiveUser()
  seedSession.cache.addAgreementToCachedUserDetails({ agreementId, userId })
}

const getActiveUserFromSeedSessionCache = (userInput, seedSession) => {
  const activeUser = seedSession.cache.getActiveUser()
  return activeUser.userId
}

const getRandomString = () => {
  return r6()
}

module.exports = {
  getLibsConfig,
  camelToKebabCase,
  kebabToCamelCase,
  parseMetadataIntoObject,
  getUserProvidedOrRandomAgreementFile,
  getUserProvidedOrRandomImageFile,
  getUserProvidedOrRandomAgreementMetadata,
  getProgressCallback,
  parseSeedActionRepeatCount,
  passThroughUserInput,
  getRandomUserIdFromCurrentSeedSessionCache,
  getRandomAgreementIdFromCurrentSeedSessionCache,
  addAgreementToSeedSessionCache,
  getActiveUserFromSeedSessionCache,
  getRandomString
}
