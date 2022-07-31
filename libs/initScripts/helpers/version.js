const web3 = require('web3')

/**
 *
 * @param {Object} colivingLibs fully formed  libs instance with eth contracts connection
 * @param {String} serviceType service type trying to register
 * @param {String} serviceVersionStr version string to register
 * @param {String?} privateKey optional private key string
 * @param {Boolean?} dryRun Optional parameter to return the generated parameters without sending tx
 */
async function setServiceVersion (colivingLibs, serviceType, serviceVersionStr, privateKey = null, dryRun = false) {
  if (!colivingLibs) throw new Error('colivingLibs is not defined')

  const validServiceTypes = ['discovery-node', 'content-node']
  if (!validServiceTypes.includes(serviceType)) {
    throw new Error(`Invalid serviceType: ${serviceType}, must be in ${validServiceTypes}`)
  }

  console.log('----version init---')
  let resp
  try {
    resp = await colivingLibs.ethContracts.ServiceTypeManagerClient.setServiceVersion(
      serviceType,
      serviceVersionStr,
      privateKey,
      dryRun
    )
  } catch (e) {
    if (!e.toString().includes('Already registered')) {
      console.log(e)
      return
    } else {
      console.log('Already registered')
    }
  }

  // this prints out the fields and values to be submitted onto the Governance dashboard
  // to create new proposals
  if (dryRun) {
    console.log(`
      Set latest ${serviceType} version on chain to v${serviceVersionStr}
      ServiceTypeManagerProxy
      setServiceVersion(bytes32,bytes32)
      ${resp}

      Description:
      Git SHA - <SHA>
      Link to release - <URL>
    `)
  }

  const versionTx = await colivingLibs.ethContracts.ServiceTypeManagerClient.getCurrentVersion(serviceType)
  const numVersionsTx = await colivingLibs.ethContracts.ServiceTypeManagerClient.getNumberOfVersions(serviceType)
  console.log(`${serviceType} | current version: ${versionTx} | number of versions : ${numVersionsTx}`)

  console.log('/----version init---')
}

/**
 * Add a new service type on chain
 * @param {Object} colivingLibs fully formed  libs instance with eth contracts connection
 * @param {String} serviceType service type trying to register
 * @param {String} serviceTypeMin minimum stake for serviceType
 * @param {String} serviceTypeMax maximum stake for serviceType
 * @param {String?} privateKey optional private key string
 */
async function addServiceType (colivingLibs, serviceType, serviceTypeMin, serviceTypeMax, privateKey = null) {
  if (!colivingLibs) throw new Error('colivingLibs is not defined')

  console.log('----addServiceType---')
  const weiMin = web3.utils.toWei(serviceTypeMin.toString(), 'ether')
  const weiMax = web3.utils.toWei(serviceTypeMax.toString(), 'ether')

  try {
    const resp = await colivingLibs.ethContracts.ServiceTypeManagerClient.addServiceType(
      serviceType,
      weiMin,
      weiMax,
      privateKey)
    console.log(resp)
  } catch (e) {
    console.error('Could not add new service type', e)
  }

  const serviceTypeInfo = await colivingLibs.ethContracts.ServiceTypeManagerClient.getServiceTypeInfo(serviceType)
  console.log(`Expected values for ${serviceType} | expected min ${weiMin} | expected max ${weiMax}`)
  console.log(`Values from contract: ${JSON.stringify(serviceTypeInfo)}`)
  console.log(`Min: ${serviceTypeInfo.minStake.toString()} Max: ${serviceTypeInfo.maxStake.toString()}`)

  console.log('/----addServiceType---')
}

module.exports = { setServiceVersion, addServiceType }
