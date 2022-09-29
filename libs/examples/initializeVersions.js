const Web3 = require('../src/web3')
const ColivingLibs = require('../src/index')
const serviceTypeList = ['discovery-node', 'content-node']
const dataWeb3ProviderEndpoint = 'https://sokol.data.network:443'
const ethWeb3ProviderEndpoint =
  'https://ropsten.infura.io/v3/c569c6faf4f14d15a49d0044e7ddd668'
const dataRegistryAddress = '0x09033761774Fe45F40A47191DdF873F18B62DE05'
const ethRegistryAddress = '0xB631ABAA63a26311366411b2025F0cAca00DE27F'
const ethTokenAddress = '0xF8e679Aa54361467B12c7394BFF57Eb890f6d934'
let latestVersionStr = '0.1.0'

const isServer = true

const getEnv = (env) => {
  const value = process.env[env]
  if (typeof value === 'undefined') {
    console.log(`${env} has not been set.`)
    return null
  }
  return value
}

/*
 *
 * export COLIVING_PRIVATE_KEY=
   export COLIVING_OWNER_WALLET=
 * */

async function initializeVersionServiceProviderContracts() {
  let colivingLibsConfig
  let privateKey = getEnv('COLIVING_PRIVATE_KEY')
  let ownerWallet = getEnv('COLIVING_OWNER_WALLET')
  if (!privateKey || !ownerWallet) {
    throw new Error('Missing private key or owner wallet')
  }
  console.log('Querying environment variables:')
  console.log(privateKey)
  console.log(ownerWallet)

  const dataWeb3 = new Web3(
    new Web3.providers.HttpProvider(dataWeb3ProviderEndpoint)
  )
  let web3DataContractConfig = {
    registryAddress: dataRegistryAddress,
    useExternalWeb3: true,
    externalWeb3Config: {
      web3: dataWeb3,
      ownerWallet: ownerWallet
    }
  }

  const ethWeb3 = new Web3(
    new Web3.providers.HttpProvider(ethWeb3ProviderEndpoint)
  )
  colivingLibsConfig = {
    web3Config: web3DataContractConfig,
    ethWeb3Config: ColivingLibs.configEthWeb3(
      ethTokenAddress, // Token Address
      ethRegistryAddress,
      ethWeb3,
      ownerWallet
    ),
    discoveryNodeConfig: {},
    isServer: isServer
  }
  let colivingLibs = new ColivingLibs(colivingLibsConfig)
  console.log('Initializing...')
  await colivingLibs.init()

  console.log('----version init---')
  let testTx = null

  /*
  for (const serviceType of serviceTypeList) {
    console.log(`\nregistering ${serviceType}`)
    try {
      testTx = await colivingLibs.ethContracts.ServiceTypeManagerClient.setServiceVersion(
        serviceType,
        latestVersionStr,
        privateKey)
      console.log(testTx)
    } catch (e) {
      if (!e.toString().includes('Already registered')) {
        console.log(e)
      } else {
        console.log('Already registered')
      }
    }
  }
  */
  for (const serviceType of serviceTypeList) {
    let versionTx =
      await colivingLibs.ethContracts.ServiceTypeManagerClient.getCurrentVersion(
        serviceType
      )
    let numVersionsTx =
      await colivingLibs.ethContracts.ServiceTypeManagerClient.getNumberOfVersions(
        serviceType
      )
    console.log(
      `${serviceType} | current version: ${versionTx} | number of versions : ${numVersionsTx}`
    )
  }

  console.log('/----version init---')
}

initializeVersionServiceProviderContracts()
