const Web3 = require('../src/web3')

//const { libs: ColivingLibs } = require('../dist/index')
//const { libs: ColivingLibs } = require('../src/index')
const { libs: ColivingLibs } = require('../src/libs')
//const { libs: ColivingLibs } = require('@coliving/sdk')
const dataContractsConfig = require('../data-contracts/config.json')
const ethContractsConfig = require('../eth-contracts/config.json')

const contentNodeEndpoint = 'http://localhost:4000'
const identityServiceEndpoint = 'http://localhost:7000'
const dataWeb3ProviderEndpoints = [
  'http://localhost:8545',
  'http://localhost:8545'
]
const ethWeb3ProviderEndpoint = 'http://localhost:8546'
const isServer = true
const isDebug = true

async function initColivingLibs(
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
      web3Config: ColivingLibs.configExternalWeb3(
        dataContractsConfig.registryAddress,
        dataWeb3,
        /* networkId */ null,
        ownerWalletOverride
      ),
      ethWeb3Config: ColivingLibs.configEthWeb3(
        ethContractsConfig.colivingTokenAddress,
        ethContractsConfig.registryAddress,
        ethWeb3ProviderEndpoint,
        ethWallet
      ),
      discoveryNodeConfig: {
        whitelist: new Set(['http://docker.for.mac.localhost:5000'])
      },
      isServer,
      isDebug
    }
  } else {
    colivingLibsConfig = {
      web3Config: ColivingLibs.configInternalWeb3(
        dataContractsConfig.registryAddress,
        dataWeb3ProviderEndpoints,
        ownerWalletPrivateKey
      ),
      ethWeb3Config: ColivingLibs.configEthWeb3(
        ethContractsConfig.colivingTokenAddress,
        ethContractsConfig.registryAddress,
        ethWeb3ProviderEndpoint,
        ethContractsConfig.ownerWallet
      ),
      contentNodeConfig: ColivingLibs.configContentNode(contentNodeEndpoint),
      discoveryNodeConfig: {},
      identityServiceConfig: ColivingLibs.configIdentityService(
        identityServiceEndpoint
      ),
      isServer,
      isDebug
    }
  }
  const colivingLibs = new ColivingLibs(colivingLibsConfig)

  // we need this try/catch because sometimes we call init before a discprov has been brought up
  // in that case, handle that error and continue so we're unblocking scripts that depend on this libs instance for other functionality
  try {
    await colivingLibs.init()
  } catch (e) {
    console.error("Couldn't init libs", e)
  }
  return colivingLibs
}

module.exports = initColivingLibs
