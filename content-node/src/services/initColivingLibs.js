const { libs: ColivingLibs } = require('@coliving/sdk')

const config = require('../config')
const { logger: genericLogger } = require('../logging')

/**
 * Creates, initializes, and returns an colivingLibs instance
 *
 * Configures dataWeb3 to be internal to libs, logged in with delegatePrivateKey in order to write chain TX
 */
module.exports = async (excludeDiscovery = false, logger = genericLogger) => {
  /**
   * Define all config variables
   */
  const ethProviderUrl = config.get('ethProviderUrl')
  const ethNetworkId = config.get('ethNetworkId')
  const discoveryNodeWhitelistConfig = config.get('discoveryNodeWhitelist')
  const identityService = config.get('identityService')
  const discoveryNodeUnhealthyBlockDiff = config.get('discoveryNodeUnhealthyBlockDiff')
  const ethTokenAddress = config.get('ethTokenAddress')
  const ethRegistryAddress = config.get('ethRegistryAddress')
  const ethOwnerWallet = config.get('ethOwnerWallet')
  const dataRegistryAddress = config.get('dataRegistryAddress')
  const dataProviderUrl = config.get('dataProviderUrl')
  const delegatePrivateKey = config.get('delegatePrivateKey')
  const contentNodeIsDebug = config.get('contentNodeIsDebug')

  const discoveryNodeWhitelist = discoveryNodeWhitelistConfig
    ? new Set(discoveryNodeWhitelistConfig.split(','))
    : null

  /**
   * Configure ethWeb3
   */
  const ethWeb3 = await ColivingLibs.Utils.configureWeb3(
    ethProviderUrl,
    ethNetworkId,
    /* requiresAccount */ false
  )
  if (!ethWeb3) {
    throw new Error(
      'Failed to init colivingLibs due to ethWeb3 configuration error'
    )
  }

  /**
   * Create ColivingLibs instance
   */
  const colivingLibs = new ColivingLibs({
    ethWeb3Config: ColivingLibs.configEthWeb3(
      ethTokenAddress,
      ethRegistryAddress,
      ethWeb3,
      ethOwnerWallet
    ),
    web3Config: ColivingLibs.configInternalWeb3(
      dataRegistryAddress,
      // pass as array
      [dataProviderUrl],
      // TODO - formatting this private key here is not ideal
      delegatePrivateKey.replace('0x', '')
    ),
    discoveryNodeConfig: excludeDiscovery
      ? null
      : {
          whitelist: discoveryNodeWhitelist,
          unhealthyBlockDiff: discoveryNodeUnhealthyBlockDiff
        },
    // If an identity service config is present, set up libs with the connection, otherwise do nothing
    identityServiceConfig: identityService
      ? ColivingLibs.configIdentityService(identityService)
      : undefined,
    isDebug: contentNodeIsDebug,
    isServer: true,
    preferHigherPatchForPrimary: true,
    preferHigherPatchForSecondaries: true,
    logger
  })

  await colivingLibs.init()
  return colivingLibs
}
