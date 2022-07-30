const Web3 = require('../src/web3')

const { libs: AudiusLibs } = require('../dist/index')
const dataContractsConfig = require('../data-contracts/config.json')
const ethContractsConfig = require('../eth-contracts/config.json')

const creatorNodeEndpoint = 'http://localhost:4000'
const identityServiceEndpoint = 'http://localhost:7000'
const dataWeb3ProviderEndpoints = [
  'http://localhost:8545',
  'http://localhost:8545'
]
const ethWeb3ProviderEndpoint = 'http://localhost:8546'
const isServer = true
const isDebug = true

async function initAudiusLibs(
  useExternalWeb3,
  ownerWalletOverride = null,
  ethOwnerWalletOverride = null,
  ownerWalletPrivateKey = null
) {
  let colivingLibsConfig
  const ethWallet =
    ethOwnerWalletOverride === null
      ? ethContractsConfig.ownerWallet
      : ethOwnerWalletOverride
  if (useExternalWeb3) {
    const dataWeb3 = new Web3(
      new Web3.providers.HttpProvider(dataWeb3ProviderEndpoints[0])
    )
    colivingLibsConfig = {
      // Network id does not need to be checked in the test environment.
      web3Config: AudiusLibs.configExternalWeb3(
        dataContractsConfig.registryAddress,
        dataWeb3,
        /* networkId */ null,
        ownerWalletOverride
      ),
      ethWeb3Config: AudiusLibs.configEthWeb3(
        ethContractsConfig.colivingTokenAddress,
        ethContractsConfig.registryAddress,
        ethWeb3ProviderEndpoint,
        ethWallet
      ),
      discoveryProviderConfig: {
        whitelist: new Set(['http://docker.for.mac.localhost:5000'])
      },
      isServer,
      isDebug
    }
  } else {
    colivingLibsConfig = {
      web3Config: AudiusLibs.configInternalWeb3(
        dataContractsConfig.registryAddress,
        dataWeb3ProviderEndpoints,
        ownerWalletPrivateKey
      ),
      ethWeb3Config: AudiusLibs.configEthWeb3(
        ethContractsConfig.colivingTokenAddress,
        ethContractsConfig.registryAddress,
        ethWeb3ProviderEndpoint,
        ethContractsConfig.ownerWallet
      ),
      creatorNodeConfig: AudiusLibs.configCreatorNode(creatorNodeEndpoint),
      discoveryProviderConfig: {},
      identityServiceConfig: AudiusLibs.configIdentityService(
        identityServiceEndpoint
      ),
      isServer,
      isDebug
    }
  }
  const colivingLibs = new AudiusLibs(colivingLibsConfig)

  // we need this try/catch because sometimes we call init before a discprov has been brought up
  // in that case, handle that error and continue so we're unblocking scripts that depend on this libs instance for other functionality
  try {
    await colivingLibs.init()
  } catch (e) {
    console.error("Couldn't init libs", e)
  }
  return colivingLibs
}

module.exports = initAudiusLibs
