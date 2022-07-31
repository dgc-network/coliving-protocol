const { getEthWeb3AndAccounts, convertAudsToWeiBN } = require('./utils')

/**
 * @param {Object} colivingLibs fully formed  libs instance with eth contracts connection
 */
async function getClaimInfo (colivingLibs) {
  if (!colivingLibs) throw new Error('colivingLibs is not defined')

  // @dev -  instance numbering is off-by-1 from accounts to
  // align with creator/track numbering below, which are 1-indexed
  const claimInfo = await colivingLibs.ethContracts.StakingProxyClient.getClaimInfo()
  console.log('getClaimInfo', claimInfo)
  return claimInfo
}

/**
 * Funds the treasury that service providers can claim from
 * @param {Object} colivingLibs fully formed  libs instance with eth contracts connection
 * @param {String} amountOfAUDS integer amount of auds tokens
 * @param {String} privateKey The private key string
 */
async function fundNewClaim (colivingLibs, amountOfAUDS, privateKey = null) {
  if (!colivingLibs) throw new Error('colivingLibs is not defined')
  if (!amountOfAUDS) throw new Error('fundNewClaim requires an amountOfAUDS property')

  const { ethWeb3 } = await getEthWeb3AndAccounts(colivingLibs)
  const libOwner = colivingLibs.ethContracts.ethWeb3Manager.getWalletAddress()

  console.log('/---- Funding new claim')
  const bal = await colivingLibs.ethContracts.ColivingTokenClient.balanceOf(libOwner)
  console.log(bal)
  const claimAmountInAudWeiBN = convertAudsToWeiBN(ethWeb3, amountOfAUDS)
  console.log(claimAmountInAudWeiBN)

  // Actually perform fund op
  const tx = await colivingLibs.ethContracts.StakingProxyClient.fundNewClaim(claimAmountInAudWeiBN, privateKey)
  console.log(tx)
  console.log('/---- End funding new claim')

  return getClaimInfo(colivingLibs)
}

module.exports = { getClaimInfo, fundNewClaim }
