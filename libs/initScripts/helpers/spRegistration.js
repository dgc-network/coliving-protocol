const { getEthWeb3AndAccounts, convertAudsToWeiBN } = require('./utils')

/**
 *
 * @param {Object} colivingLibs fully formed  libs instance with eth contracts connection
 */
async function getStakingParameters (colivingLibs) {
  if (!colivingLibs) throw new Error('colivingLibs is not defined')

  const min = await colivingLibs.ethContracts.StakingProxyClient.getMinStakeAmount()
  const max = await colivingLibs.ethContracts.StakingProxyClient.getMaxStakeAmount()
  console.log(`getStakingParameters: min: ${min}, max: ${max}`)
  return { min, max }
}

/**
 * Local only
 * @param {Object} colivingLibs fully formed  libs instance with eth contracts connection
 * @param {String} serviceType service type trying to register
 * @param {String} serviceEndpoint url string of service to register
 * @param {String} amountOfAUDS integer amount of auds tokens
 */
async function registerLocalService (colivingLibs, serviceType, serviceEndpoint, amountOfAUDS) {
  if (!colivingLibs) throw new Error('colivingLibs is not defined')
  if (!amountOfAUDS) throw new Error('registerLocalService requires an amountOfAuds property')

  const { ethWeb3 } = await getEthWeb3AndAccounts(colivingLibs)
  console.log('\nregistering service providers/---')
  const initialTokenInAudWeiBN = convertAudsToWeiBN(ethWeb3, amountOfAUDS)

  try {
    // Register service
    console.log(`registering service ${serviceType} ${serviceEndpoint}`)
    const tx = await colivingLibs.ethContracts.ServiceProviderFactoryClient.register(
      serviceType,
      serviceEndpoint,
      initialTokenInAudWeiBN,
      false)
    console.log(`registered service ${serviceType} ${serviceEndpoint} - ${tx.txReceipt.transactionHash}`)
  } catch (e) {
    if (!e.toString().includes('already registered')) {
      console.log(e)
    } else {
      console.log(`\n${serviceEndpoint} already registered`)
    }
  }
}

async function updateServiceDelegateOwnerWallet (colivingLibs, serviceType, serviceEndpoint, updatedDelegateOwnerWallet) {
  if (!colivingLibs || !serviceType || !serviceEndpoint || !updatedDelegateOwnerWallet) {
    throw new Error('Missing required params')
  }

  try {
    console.log(`Updating delegateOwnerWallet for ${serviceType} ${serviceEndpoint} with new wallet ${updatedDelegateOwnerWallet}`)
    const tx = await colivingLibs.ethContracts.ServiceProviderFactoryClient.updateDelegateOwnerWallet(
      serviceType, serviceEndpoint, updatedDelegateOwnerWallet
    )
    console.log(`Successfully updated delegateOwnerWallet for ${serviceType} ${serviceEndpoint} with new wallet ${updatedDelegateOwnerWallet} - ${JSON.stringify(tx, null, 2)}`)
  } catch (e) {
    throw new Error(`Failed to update delegateOwnerWallet for ${serviceType} ${serviceEndpoint} with new wallet ${updatedDelegateOwnerWallet} || ERROR ${e}`)
  }
}

/**
 * Local only
 * @param {Object} colivingLibs fully formed  libs instance with eth contracts connection
 * @param {String} serviceType service type trying to register
 * @param {String} serviceEndpoint url string of service to register
 */
async function deregisterLocalService (colivingLibs, serviceType, serviceEndpoint) {
  if (!colivingLibs) throw new Error('colivingLibs is not defined')

  try {
    // de-register service
    console.log(`\nde-registering service ${serviceType} ${serviceEndpoint}`)
    const tx = await colivingLibs.ethContracts.ServiceProviderFactoryClient.deregister(
      serviceType,
      serviceEndpoint)
    console.dir(tx, { depth: 5 })
  } catch (e) {
    console.log(e)
  }
}

/**
 * Local only
 * @param {Object} colivingLibs fully formed  libs instance with eth contracts connection
 * @param {Array} serviceTypeList List of services to query
 * @param {Boolean} queryUserReplicaSetManager Conditionally query L2 replica set contract
 */
async function queryLocalServices (colivingLibs, serviceTypeList, queryUserReplicaSetManager = false) {
  if (!colivingLibs) throw new Error('colivingLibs is not defined')

  console.log('\n----querying service providers')
  const { ethAccounts } = await getEthWeb3AndAccounts(colivingLibs)
  let cnodesInfoList = null

  for (const spType of serviceTypeList) {
    console.log(`${spType}`)
    const spList = await colivingLibs.ethContracts.ServiceProviderFactoryClient.getServiceProviderList(spType)
    if (spType === 'content-node') {
      cnodesInfoList = spList
    }
    for (const sp of spList) {
      console.log(sp)
      const { spID, type, endpoint } = sp
      const idFromEndpoint =
        await colivingLibs.ethContracts.ServiceProviderFactoryClient.getServiceProviderIdFromEndpoint(endpoint)
      console.log(`ID from endpoint: ${idFromEndpoint}`)
      const infoFromId =
        await colivingLibs.ethContracts.ServiceProviderFactoryClient.getServiceEndpointInfo(type, spID)
      const jsonInfoFromId = JSON.stringify(infoFromId)
      console.log(`Info from ID: ${jsonInfoFromId}`)
      const idsFromAddress =
        await colivingLibs.ethContracts.ServiceProviderFactoryClient.getServiceProviderIdsFromAddress(
          ethAccounts[0],
          type)
      console.log(`SP IDs from owner wallet ${ethAccounts[0]}: ${idsFromAddress}`)
    }

    const numProvs = await colivingLibs.ethContracts.ServiceProviderFactoryClient.getTotalServiceTypeProviders(spType)
    console.log(`${numProvs} instances of ${spType}`)
  }
  console.log('----done querying service providers')
  if (queryUserReplicaSetManager) {
    console.log('\n----querying UserReplicaSetManager on data-contracts')
    for (const cnode of cnodesInfoList) {
      const spInfoFromUrsm = await colivingLibs.contracts.UserReplicaSetManagerClient.getContentNodeWallets(cnode.spID)
      const delegateWalletFromUrsmContract = spInfoFromUrsm.delegateOwnerWallet
      const ownerWalletFromUrsmContract = spInfoFromUrsm.ownerWallet
      console.log(`spID ${cnode.spID} | \
eth-contracts delegateWallet=${cnode.delegateOwnerWallet}, data-contracts delegateOwnerWallet=${delegateWalletFromUrsmContract}, ownerWallet=${ownerWalletFromUrsmContract}`)
    }
    console.log('----done querying UserReplicaSetManager on data-contracts\n')
  }
}

module.exports = { getStakingParameters, registerLocalService, deregisterLocalService, queryLocalServices, updateServiceDelegateOwnerWallet }
