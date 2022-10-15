const fs = require('fs')
const readline = require('readline')

const initColivingLibs = require('../examples/initColivingLibs')
//const initColivingLibs = require('../src/index')
const dataContractsConfig = require('../data-contracts/config.json')
const { distributeTokens } = require('./helpers/distributeTokens')
const { setServiceVersion, addServiceType } = require('./helpers/version')
const {
  registerLocalService,
  queryLocalServices,
  getStakingParameters,
  updateServiceDelegateOwnerWallet
} = require('./helpers/spRegistration')
const { deregisterLocalService } = require('./helpers/spRegistration')
const { getClaimInfo, fundNewClaim } = require('./helpers/claim')
const { getEthContractAccounts } = require('./helpers/utils')

// Directories within the -protocol repository used for development
const serviceDirectoryList = ['discovery-node', 'content-node']
const discProvEndpoint1 = 'http://dn1_web-server_1:5000'
const discProvEndpoint2 = 'http://dn2_web-server_1:5001'
const contentNodeEndpoint1 = 'http://cn1_content-node_1:4000'
const contentNodeEndpoint2 = 'http://cn2_content-node_1:4001'
const contentNodeEndpoint3 = 'http://cn3_content-node_1:4002'
const contentNodeEndpoint4 = 'http://cn4_content-node_1:4003'
const amountOfAuds = 2000000

const contentNodeType = 'content-node'
const contentNodeTypeMin = 200000
const contentNodeTypeMax = 10000000

const discoveryNodeType = 'discovery-node'
const discoveryNodeTypeMin = 200000
const discoveryNodeTypeMax = 7000000

const DISCOVERY_WALLET_OFFSET = 8

// try to dynamically get versions from .version.json
const serviceVersions = {}
const serviceTypesList = []
try {
  serviceDirectoryList.forEach((type) => {
    const typeInfo = require(`../../${type}/.version.json`)
    const version = typeInfo.version
    const serviceType = typeInfo.service
    serviceVersions[serviceType] = version
    serviceTypesList.push(serviceType)
  })
} catch (e) {
  throw new Error("Couldn't get the service versions")
}

const throwArgError = () => {
  throw new Error(`missing argument - format: node local.js [
    distribute,
    fundclaim,
    getclaim,
    stakeinfo,
    setversion,
    register-sps,
    deregister-sps,
    query-sps,
    init-all
  ]`)
}

const args = process.argv
if (args.length < 3) {
  throwArgError()
}

const getEnvConfigPathsForContentNode = async ({ workspace, serviceCount }) => {
  const { envPath, writePath, templatePath } = getEnvConfigPathsForService({ workspace, serviceCount })
  fs.writeFileSync(writePath, '')

  return { envPath, templatePath, writePath }
}

const getEnvConfigPathsForDiscoveryNode = async ({ workspace, serviceCount }) => {
  const { envPath, writePath, templatePath } = getEnvConfigPathsForService({ workspace, serviceCount })
  fs.copyFileSync(envPath, writePath)

  return { templatePath, writePath }
}

const getEnvConfigPathsForService = ({ workspace, serviceCount }) => {
  const tmpDir = `${workspace}/tmp`
  const writePath = `${tmpDir}/shellEnv${serviceCount}.sh`
  const dirExists = fs.existsSync(tmpDir)
  if (!dirExists) {
    fs.mkdirSync(tmpDir)
  } else {
    const cleanupNeeded = fs.existsSync(writePath)
    if (cleanupNeeded) {
      fs.rmSync(writePath, { force: true })
    }
  }
  const templatePath = `${workspace}/commonEnv.sh`
  const envPath = `${workspace}/shellEnv${serviceCount}.sh`
  return { envPath, writePath, templatePath }
}

const run = async () => {
  try {
    const colivingLibs = await initColivingLibs(true)
    // A separate libs instance
    let userReplicaBootstrapAddressLibs
    const ethWeb3 = colivingLibs.ethWeb3Manager.getWeb3()
    const ethAccounts = await ethWeb3.eth.getAccounts()

    switch (args[2]) {
      case 'init':
        console.log('initialized libs')
        break
      case 'distribute':
        await distributeTokens(colivingLibs, amountOfAuds)
        break

      case 'fundclaim':
        await fundNewClaim(colivingLibs, amountOfAuds)
        break

      case 'getclaim':
        await getClaimInfo(colivingLibs)
        break

      case 'stakeinfo':
        await getStakingParameters(colivingLibs)
        break

      case 'setversion':
        await _initAllVersions(colivingLibs)
        break

      case 'configure-discprov-wallet': {
        const serviceCount = args[3]
        if (serviceCount === undefined) throw new Error('configure-discprov-wallet requires a service # as the second arg')
        const workspace = '../discovery-node/compose/env'
        const { templatePath, writePath } = await getEnvConfigPathsForDiscoveryNode({ workspace, serviceCount })
        await _configureDiscProv(ethAccounts, parseInt(serviceCount), templatePath, writePath)
        break
      }

      case 'register-discovery-node':
        const serviceCount = args[3]
        if (serviceCount === undefined) throw new Error('register-discovery-node requires a service # as the second arg')
        await _registerDiscProv(ethAccounts, parseInt(serviceCount))
        break

      case 'register-cnode': {
        const serviceCount = args[3]
        if (serviceCount === undefined) throw new Error('register-cnode requires a service # as the second arg')
        await _registerCnode(ethAccounts, parseInt(serviceCount))
        break
      }
      case 'deregister-cnode': {
        const serviceCount = args[3]
        if (serviceCount === undefined) throw new Error('deregister-cnode requires a service # as the second arg')
        await _deregisterCnode(ethAccounts, parseInt(serviceCount))
        break
      }

      case 'print-accounts': {
        const numAccounts = args[3] || 20
        await _printEthContractAccounts(ethAccounts, numAccounts)
        break
      }

      case 'update-cnode-delegate-wallet': {
        const serviceCount = args[3]
        if (serviceCount === undefined) throw new Error('register-cnode requires a service # as the second arg')
        await _updateCNodeDelegateOwnerWallet(ethAccounts, parseInt(serviceCount))
        break
      }

      case 'deregister-sps':
        await _deregisterAllSPs(colivingLibs, ethAccounts)
        break

      case 'query-sps':
        await queryLocalServices(colivingLibs, serviceTypesList)
        break

      case 'query-sps-ursm':
        await queryLocalServices(colivingLibs, serviceTypesList, true)
        break

      case 'update-cnode-config': {
        // Update arbitrary cnode
        const serviceCount = args[3]
        if (serviceCount === undefined) throw new Error('update-delegate-wallet requires a service # as the second arg')
        const workspace = '../content-node/compose/env'
        const { envPath, templatePath, writePath } = await getEnvConfigPathsForContentNode({ workspace, serviceCount })
        // Local dev, delegate and owner wallet are equal
        const ownerWallet = ethAccounts[parseInt(serviceCount)]
        const delegateWallet = ownerWallet
        const endpoint = makeContentNodeEndpoint(serviceCount)

        await _updateContentNodeConfig({ ownerWallet, templatePath, writePath, endpoint, isShell: true, delegateWallet, envPath })
        break
      }

      case 'init-all':
        await _initializeLocalEnvironment(colivingLibs, ethAccounts)
        break

      case 'update-userreplicasetmanager-init-config':
        await _updateUserReplicaSetManagerBootstrapConfig(ethAccounts)
        break

      case 'update-user-replica-set':
        console.log('Usage: node local.js update-user-replica-set userId=1 primary=2 secondaries=3,1')
        const userIdStr = args[3]
        const primaryReplicaIdStr = args[4]
        const secondaryReplicaIdStr = args[5]
        const userId = parseInt(userIdStr.split('=')[1])
        const primaryReplicaId = parseInt(primaryReplicaIdStr.split('=')[1])
        let secondaryReplicaIds = (secondaryReplicaIdStr.split('=')[1])
        secondaryReplicaIds = secondaryReplicaIds.split(',').map(x => parseInt(x))
        console.log(`Received userId: ${userId}`)
        console.log(`Received primaryReplicaId: ${primaryReplicaId}`)
        console.log(`Received secondaryReplicaIds: ${secondaryReplicaIds}`)
        await updateUserReplicaSet(colivingLibs, userId, primaryReplicaId, secondaryReplicaIds)
        break

      case 'query-user-replica-set':
        console.log('Usage: node local.js query-user-replica-set userId=1')
        userReplicaBootstrapAddressLibs = await getUrsmLibs(colivingLibs, 9)
        const userReplicaSet = await userReplicaBootstrapAddressLibs.contracts.UserReplicaSetManagerClient.getUserReplicaSet(
          parseInt(
            args[3].split('=')[1]
          )
        )
        console.log(userReplicaSet)
        break

      case 'query-ursm-content-node-wallet':
        console.log('Usage: node local.js query-ursm-content-node-wallet spId=1')
        userReplicaBootstrapAddressLibs = await getUrsmLibs(colivingLibs, 9)
        const contentNodeWallet = await userReplicaBootstrapAddressLibs.contracts.UserReplicaSetManagerClient.getContentNodeWallets(
          parseInt(
            args[3].split('=')[1]
          )
        )
        console.log(contentNodeWallet)
        break

      case 'add-l2-content-node':
        console.log('Usage: node local.js add-l2-content-node spId=4 delegateWallet=0x95b6A2Be3423dF7D5774...')
        const spIdStr = args[3]
        const spID = parseInt(spIdStr.split('=')[1])
        const delegateWalletStr = args[4]
        const delegateWallet = delegateWalletStr.split('=')[1]
        const ownerWallet = delegateWallet
        console.log(`Configuring L2 ${spID} with wallet: ${delegateWallet}`)
        // Initialize from a different acct than proxy admin
        const queryLibs = await getUrsmLibs(colivingLibs, 9)
        await addL2ContentNode(
          queryLibs,
          ethAccounts,
          spID,
          delegateWallet,
          ownerWallet)
        break

      case 'register-trusted-notifier':
        // hardcoded in trusted-notifier .env.dev
        const wallet = '0xe82a5a2948d2b5e71232f640777346869817fbae'
        const endpoint = 'http://trusted_notifier_service:8000'
        const email = 'email@trusted_notifier_service:8000'
        await colivingLibs.ethContracts.TrustedNotifierManagerClient.registerNotifier(
          wallet,
          endpoint,
          email
        )
        break

      case 'query-trusted-notifier':
        const id = args[3]
        if (!id) throw new Error('Please pass in a valid ID')
        const resp = await colivingLibs.ethContracts.TrustedNotifierManagerClient.getNotifierForID(id)
        console.log(resp)
        break

      default:
        throwArgError()
    }

    process.exit(0)
  } catch (e) {
    throw e
  }
}

run()

/*
  Helper function to bootstrap additional local content nodes onto the L2 local network
  Assumes 3 content nodes are already up prior to execution
*/
const addL2ContentNode = async (
  colivingLibs,
  ethAccounts,
  newCnodeId,
  newCnodeDelegateWallet,
  newCnodeOwnerWallet
) => {
  const incomingWallets = [newCnodeDelegateWallet, newCnodeOwnerWallet]
  const existingWalletInfo = await colivingLibs.contracts.UserReplicaSetManagerClient.getContentNodeWallets(newCnodeId)
  const existingWalletToCnodeIdL2 = existingWalletInfo.delegateOwnerWallet
  const spIdToWalletPresent = (existingWalletToCnodeIdL2 === newCnodeDelegateWallet)
  if (spIdToWalletPresent) {
    console.log(`No update required! Found ${existingWalletToCnodeIdL2} for spId=${newCnodeId}, expected ${newCnodeDelegateWallet}`)
    // return
  }
  console.log(`addL2ContentNode: ${newCnodeId}, ${newCnodeDelegateWallet}`)
  const ganacheEthAccounts = await getEthContractAccounts()
  // cn1, cn2, cn3 are all initialized to the 1,2,3 indexes into local ethAccounts array
  // NOTE: Proposer Accounts must match the deployed bootstrap addresses on UserReplicaSetManager
  //  Changing any of the below indices will affect the wallets performing this update and operations will fail
  const proposer1WalletIndex = 1
  const proposer2WalletIndex = 2
  const proposer3WalletIndex = 3
  // Local service provider IDs assigned by eth-contracts
  // These values just HAPPEN to coincide with the indices above but are set explicitly to avoid confusion
  const proposer1SpId = 1
  const proposer2SpId = 2
  const proposer3SpId = 3
  // Retrieve the wallet associated with each index
  const proposer1Wallet = ethAccounts[parseInt(proposer1WalletIndex)]
  const proposer1PKey = ganacheEthAccounts.private_keys[proposer1Wallet.toLowerCase()]
  const proposer2Wallet = ethAccounts[parseInt(proposer2WalletIndex)]
  const proposer2PKey = ganacheEthAccounts.private_keys[proposer2Wallet.toLowerCase()]
  const proposer3Wallet = ethAccounts[parseInt(proposer3WalletIndex)]
  const proposer3PKey = ganacheEthAccounts.private_keys[proposer3Wallet.toLowerCase()]

  console.log(`proposer1Wallet: ${proposer1Wallet}`)
  console.log(`proposer1WalletPkey: ${proposer1PKey}`)
  console.log(`proposer2Wallet: ${proposer2Wallet}`)
  console.log(`proposer2WalletPkey: ${proposer2PKey}`)
  console.log(`proposer3Wallet: ${proposer3Wallet}`)
  console.log(`proposer3WalletPkey: ${proposer3PKey}`)

  // console.dir(ganacheEthAccounts)

  // Initialize libs with each incoming proposer
  const proposer1Libs = await initColivingLibs(
    false,
    proposer1Wallet,
    proposer1Wallet,
    proposer1PKey
  )
  const proposer1EthAddress = proposer1Libs.ethWeb3Manager.getWalletAddress()
  console.log(`Initialized proposer1 libs, proposer1EthAddress: ${proposer1EthAddress}`)
  const proposer1SignatureInfo = await proposer1Libs.contracts.UserReplicaSetManagerClient.getProposeAddOrUpdateContentNodeRequestData(
    newCnodeId,
    newCnodeDelegateWallet,
    newCnodeOwnerWallet,
    proposer1SpId
  )
  console.dir(proposer1SignatureInfo, { depth: 5 })
  const proposer2Libs = await initColivingLibs(
    false,
    proposer2Wallet,
    proposer2Wallet,
    proposer2PKey
  )
  const proposer2EthAddress = proposer2Libs.ethWeb3Manager.getWalletAddress()
  console.log(`Initialized proposer2 libs, proposer2EthAddress: ${proposer2EthAddress}`)
  const proposer2SignatureInfo = await proposer2Libs.contracts.UserReplicaSetManagerClient.getProposeAddOrUpdateContentNodeRequestData(
    newCnodeId,
    newCnodeDelegateWallet,
    newCnodeOwnerWallet,
    proposer2SpId
  )
  console.dir(proposer2SignatureInfo, { depth: 5 })
  const proposer3Libs = await initColivingLibs(
    false,
    proposer3Wallet,
    proposer3Wallet,
    proposer3PKey
  )
  const proposer3EthAddress = proposer3Libs.ethWeb3Manager.getWalletAddress()
  console.log(`Initialized proposer3 libs, proposer3EthAddress: ${proposer3EthAddress}`)
  const proposer3SignatureInfo = await proposer3Libs.contracts.UserReplicaSetManagerClient.getProposeAddOrUpdateContentNodeRequestData(
    newCnodeId,
    newCnodeDelegateWallet,
    newCnodeOwnerWallet,
    proposer3SpId
  )
  console.dir(proposer3SignatureInfo, { depth: 5 })
  // Generate arguments for proposal
  const proposerSpIds = [proposer1SpId, proposer2SpId, proposer3SpId]
  const proposerNonces = [
    proposer1SignatureInfo.nonce,
    proposer2SignatureInfo.nonce,
    proposer3SignatureInfo.nonce
  ]
  await colivingLibs.contracts.UserReplicaSetManagerClient.addOrUpdateContentNode(
    newCnodeId,
    incomingWallets,
    proposerSpIds,
    proposerNonces,
    proposer1SignatureInfo.sig,
    proposer2SignatureInfo.sig,
    proposer3SignatureInfo.sig
  )
}

// In order to issue operations we need a libs account initialized from a different address than
// the 0th account on local data-contracts
// This function explicitly queries the 20th account from data-contracts ganache
// Returns libs instance logged in as said account
const getUrsmLibs = async (defaultColivingLibs, acctIndex = 20) => {
  const dataWeb3 = defaultColivingLibs.web3Manager.getWeb3()
  const dataWeb3Accounts = await dataWeb3.eth.getAccounts()
  const localQueryAccount = dataWeb3Accounts[acctIndex]
  const ursmLibs = await initColivingLibs(true, localQueryAccount)
  return ursmLibs
}

// Update a user's replica set on chain
// Using the bootstrap address configured for local development (accounts[9])
const updateUserReplicaSet = async (
  defaultColivingLibs,
  userId,
  primaryId,
  secondaryIds
) => {
  // UserReplicaBootstrapLibs, logged in as the known bootstrap address
  const userReplicaBootstrapAddressLibs = await getUrsmLibs(defaultColivingLibs, 9)
  const sp1Id = primaryId
  const sp1ContentNodeWallets = await userReplicaBootstrapAddressLibs.contracts.UserReplicaSetManagerClient.getContentNodeWallets(sp1Id)
  const sp1DelWal = sp1ContentNodeWallets.delegateOwnerWallet
  console.log(`spId <-> delegateWallet from UserReplicaSetManager: ${sp1Id} - ${sp1DelWal}`)
  const sp2Id = secondaryIds[0]
  const sp2ContentNodeWallets = await userReplicaBootstrapAddressLibs.contracts.UserReplicaSetManagerClient.getContentNodeWallets(sp2Id)
  const sp2DelWal = sp2ContentNodeWallets.delegateOwnerWallet
  console.log(`spId <-> delegateWallet from UserReplicaSetManager: ${sp2Id} - ${sp2DelWal}`)
  const sp3Id = secondaryIds[1]
  const sp3ContentNodeWallets = await userReplicaBootstrapAddressLibs.contracts.UserReplicaSetManagerClient.getContentNodeWallets(sp3Id)
  const sp3DelWal = sp3ContentNodeWallets.delegateOwnerWallet
  console.log(`spId <-> delegateWallet from UserReplicaSetManager: ${sp3Id} - ${sp3DelWal}`)
  const user1ReplicaSet = await userReplicaBootstrapAddressLibs.contracts.UserReplicaSetManagerClient.getUserReplicaSet(userId)
  console.log(`User ${userId} replica set prior to update: ${JSON.stringify(user1ReplicaSet)}`)
  console.log(`User ${userId} replica set updating to primary=${primaryId}, secondaries=${secondaryIds}`)
  // Uncomment to perform update operation
  const tx1 = await userReplicaBootstrapAddressLibs.contracts.UserReplicaSetManagerClient.updateReplicaSet(
    userId,
    primaryId,
    secondaryIds,
    user1ReplicaSet.primary,
    user1ReplicaSet.secondaries
  )
  console.dir(tx1, { depth: 5 })
  const user1ReplicaSetAfterUpdate = await userReplicaBootstrapAddressLibs.contracts.UserReplicaSetManagerClient.getUserReplicaSet(userId)
  console.log(`User ${userId} replica set after to update: ${JSON.stringify(user1ReplicaSetAfterUpdate)}`)
}

const _initializeLocalEnvironment = async (colivingLibs, ethAccounts) => {
  await distributeTokens(colivingLibs, amountOfAuds)
  await _initEthContractTypes(colivingLibs)
  await _initAllVersions(colivingLibs)
  await queryLocalServices(colivingLibs, serviceTypesList)
}

const makeDiscoveryNodeEndpoint = (serviceNumber) => `http://dn${serviceNumber}_web-server_1:${5000 + parseInt(serviceNumber) - 1}`

const _registerDiscProv = async (ethAccounts, serviceNumber) => {
  const colivingLibs = await initColivingLibs(true, null, ethAccounts[DISCOVERY_WALLET_OFFSET + serviceNumber])
  const endpoint = makeDiscoveryNodeEndpoint(serviceNumber)
  await registerLocalService(colivingLibs, discoveryNodeType, endpoint, amountOfAuds)
}

const makeContentNodeEndpoint = (serviceNumber) => `http://cn${serviceNumber}_content-node_1:${4000 + parseInt(serviceNumber) - 1}`

// Templated cnode to allow for dynamic number of services
const _registerCnode = async (ethAccounts, serviceNumber) => {
  const colivingLibs = await initColivingLibs(true, null, ethAccounts[serviceNumber])
  const endpoint = makeContentNodeEndpoint(serviceNumber)
  await registerLocalService(colivingLibs, contentNodeType, endpoint, amountOfAuds)
}

const _deregisterCnode = async (ethAccounts, serviceNumber) => {
  const colivingLibs = await initColivingLibs(true, null, ethAccounts[serviceNumber])
  const endpoint = makeContentNodeEndpoint(serviceNumber)
  await deregisterLocalService(colivingLibs, contentNodeType, endpoint)
}

const _printEthContractAccounts = async (ethAccounts, numAccounts = 20) => {
  const ganacheEthAccounts = await getEthContractAccounts()
  const accts = []
  for (let i = 0; i < numAccounts; i += 1) {
    const addr = ethAccounts[i]
    const privateKey = ganacheEthAccounts.private_keys[addr.toLowerCase()]
    accts.push({
      address: ethAccounts[i],
      privateKey
    })
  }
  console.log(JSON.stringify(accts))
}

// NOTE - newly selected wallet is the ethAccount with index 10 + current service number
const _updateCNodeDelegateOwnerWallet = async (ethAccounts, serviceNumber) => {
  const colivingLibs = await initColivingLibs(true, null, ethAccounts[serviceNumber])
  const endpoint = makeContentNodeEndpoint(serviceNumber)
  await updateServiceDelegateOwnerWallet(colivingLibs, contentNodeType, endpoint, ethAccounts[serviceNumber + 10])
}

const _updateContentNodeConfig = async ({ ownerWallet, templatePath, writePath, endpoint = null, isShell = false, delegateWallet, envPath = null }) => {
  delegateWallet = (delegateWallet || ownerWallet).toLowerCase()
  ownerWallet = ownerWallet.toLowerCase()

  const ganacheEthAccounts = await getEthContractAccounts()

  // PKey is now recovered
  const ownerWalletPrivKey = ganacheEthAccounts.private_keys[`${ownerWallet}`]
  const delegateWalletPrivKey = ganacheEthAccounts.private_keys[`${delegateWallet}`]

  await _updateContentNodeConfigFile({ templatePath, writePath, ownerWallet, ownerWalletPrivKey, delegateWallet, delegateWalletPrivKey, endpoint, isShell, envPath })
}

const _deregisterAllSPs = async (colivingLibs, ethAccounts) => {
  const colivingLibs1 = colivingLibs
  await deregisterLocalService(colivingLibs1, discoveryNodeType, discProvEndpoint1)
  const colivingLibs2 = await initColivingLibs(true, null, ethAccounts[3])
  await deregisterLocalService(colivingLibs2, discoveryNodeType, discProvEndpoint2)

  const colivingLibs3 = await initColivingLibs(true, null, ethAccounts[1])
  await deregisterLocalService(colivingLibs3, contentNodeType, contentNodeEndpoint1)
  const colivingLibs4 = await initColivingLibs(true, null, ethAccounts[2])
  await deregisterLocalService(colivingLibs4, contentNodeType, contentNodeEndpoint2)
  const colivingLibs5 = await initColivingLibs(true, null, ethAccounts[4])
  await deregisterLocalService(colivingLibs5, contentNodeType, contentNodeEndpoint3)
  const colivingLibs6 = await initColivingLibs(true, null, ethAccounts[5])
  await deregisterLocalService(colivingLibs6, contentNodeType, contentNodeEndpoint4)
}

const _initAllVersions = async (colivingLibs) => {
  for (const serviceType of serviceTypesList) {
    await setServiceVersion(colivingLibs, serviceType, serviceVersions[serviceType])
  }
}

const _initEthContractTypes = async (libs) => {
  console.log(`Registering additional service type ${contentNodeType} - Min=${contentNodeTypeMin}, Max=${contentNodeTypeMax}`)
  // Add content-node serviceType
  await addServiceType(libs, contentNodeType, contentNodeTypeMin, contentNodeTypeMax)
  console.log(`Registering additional service type ${contentNodeType} - Min=${contentNodeTypeMin}, Max=${contentNodeTypeMax}`)
  // Add discovery-node serviceType
  await addServiceType(libs, discoveryNodeType, discoveryNodeTypeMin, discoveryNodeTypeMax)
}

const writeEnvConfigFromTemplate = async ({ templatePath, writePath, replaceMap, envPath }) => {
  let template = fs.readFileSync(templatePath, 'utf8')
  const progressReport = []
  Object.entries(replaceMap).forEach(([toReplace, replacement]) => {
    template = template.replace(`${toReplace}`, replacement)
    progressReport.push(`${toReplace}: ${replacement}`)
  })
  fs.appendFileSync(writePath, template)
  if (envPath) {
    fs.appendFileSync(writePath, fs.readFileSync(envPath, 'utf8'))
  }
  console.log(`Updated ${writePath}:\n${progressReport.join('\n')}`)
}

const _configureDiscProv = async (ethAccounts, serviceNumber, templatePath, writePath) => {
  const ganacheEthAccounts = await getEthContractAccounts()
  const discProvAccountPubkey = ethAccounts[DISCOVERY_WALLET_OFFSET + serviceNumber].toLowerCase()
  const delegateWalletPrivKey = ganacheEthAccounts.private_keys[`${discProvAccountPubkey}`]
  const replaceMap = {
    COLIVING_DELEGATE_OWNER_WALLET: discProvAccountPubkey,
    COLIVING_DELEGATE_PRIVATE_KEY: delegateWalletPrivKey
  }
  writeEnvConfigFromTemplate({ templatePath, writePath, replaceMap })
}

// Write an update to shell env file for content nodes or docker env file
const _updateContentNodeConfigFile = async ({ templatePath, writePath, ownerWallet, ownerWalletPkey, delegateWallet, delegateWalletPrivKey, endpoint, isShell, envPath }) => {
  const replaceMap = {
    DELEGATE_OWNER_WALLET: delegateWallet,
    DELEGATE_PRIVATE_KEY: delegateWalletPrivKey,
    CONTENT_NODE_ENDPOINT: endpoint,
    SP_OWNER_WALLET: ownerWallet
  }
  writeEnvConfigFromTemplate({ templatePath, writePath, replaceMap, envPath })
}

const _updateUserReplicaSetManagerBootstrapConfig = async (ethAccounts) => {
  const dataContractConfigPath = '../../data-contracts/contract-config.js'
  const fileStream = fs.createReadStream(dataContractConfigPath)
  const rl = readline.createInterface({
    input: fileStream,
    crlfDelay: Infinity
  })
  const bootstrapSPIds = [1, 2, 3]
  const bootstrapSPDelegateWallets = bootstrapSPIds.map((id) => {
    return ethAccounts[id]
  })
  const bootstrapSPOwnerWallets = bootstrapSPDelegateWallets
  const bootstrapSPIdsString = `    bootstrapSPIds: [${bootstrapSPIds}],`
  const bootstrapSPDelegateWalletsString = `    bootstrapSPDelegateWallets: ['${bootstrapSPDelegateWallets[0]}', '${bootstrapSPDelegateWallets[1]}', '${bootstrapSPDelegateWallets[2]}'],`
  const bootstrapSPOwnerWalletString = `    bootstrapSPOwnerWallets: ['${bootstrapSPOwnerWallets[0]}', '${bootstrapSPOwnerWallets[1]}', '${bootstrapSPDelegateWallets[2]}'],`
  const bootstrapRegistryAddressString = `    registryAddress: '${dataContractsConfig.registryAddress}'`
  console.log('Initializing UserReplicaSetManager configuration from known delegateWallets within system...')
  console.log(`Bootstrapping with ${bootstrapSPIds}, ${bootstrapSPDelegateWallets}, ${bootstrapSPOwnerWalletString}`)

  let traversingDevelopmentConfigBlock = false
  const output = []
  for await (const line of rl) {
    if (line.includes('development')) {
      traversingDevelopmentConfigBlock = true
      output.push(line)
    } else if (line.includes('test_local')) {
      traversingDevelopmentConfigBlock = false
      output.push(line)
    } else if (traversingDevelopmentConfigBlock && line.includes('bootstrapSPIds')) {
      output.push(bootstrapSPIdsString)
    } else if (traversingDevelopmentConfigBlock && line.includes('bootstrapSPDelegateWallets')) {
      output.push(bootstrapSPDelegateWalletsString)
    } else if (traversingDevelopmentConfigBlock && line.includes('bootstrapSPOwnerWallets')) {
      output.push(bootstrapSPOwnerWalletString)
    } else if (traversingDevelopmentConfigBlock && line.includes('registryAddress')) {
      output.push(bootstrapRegistryAddressString)
    } else {
      output.push(line)
    }
  }
  fs.writeFileSync(dataContractConfigPath, output.join('\n'))
  console.log(`Updated ${dataContractConfigPath} with \nbootstrapSPIds=${bootstrapSPIds}\nbootstrapSPDelegateWallets=${bootstrapSPDelegateWallets}\nbootstrapSPOwnerWallets:${bootstrapSPOwnerWallets}`)
}
