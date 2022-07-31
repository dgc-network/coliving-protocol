const { getEthWeb3AndAccounts, convertAudsToWeiBN } = require('./utils')

/**
 * Local only
 * @param {Object} colivingLibs fully formed  libs instance with eth contracts connection
 * @param {String} amountOfAUDS integer amount of auds tokens
 */
async function distributeTokens (colivingLibs, amountOfAUDS) {
  if (!colivingLibs) throw new Error('colivingLibs is not defined')

  const { ethWeb3, ethAccounts } = await getEthWeb3AndAccounts(colivingLibs)

  const initialTokenInAudWeiBN = convertAudsToWeiBN(ethWeb3, amountOfAUDS)
  await Promise.all(ethAccounts.map(async (account) => {
    if (account === ethAccounts[0]) { return }
    const tx = await colivingLibs.ethContracts.ColivingTokenClient.transfer(account, initialTokenInAudWeiBN)
    console.log(`${tx.txReceipt.transactionHash} Transferred ${amountOfAUDS} to ${account}`)
  }))
  for (const account of ethAccounts) {
    if (account === ethAccounts[0]) { continue }
  }
}

module.exports = { distributeTokens }
