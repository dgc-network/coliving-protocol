const assert = require('assert')
const helpers = require('./helpers')

const latestVersionStr = '0.1.0'

const coliving0 = helpers.colivingInstance

let serviceTypeList
let ownerWallet
let accounts

before(async function () {
  await coliving0.init()
  ownerWallet = coliving0.ethWeb3Manager.getWalletAddress()
  accounts = await coliving0.ethWeb3Manager.getWeb3().eth.getAccounts()
  serviceTypeList = await coliving0.ethContracts.ServiceTypeManagerClient.getValidServiceTypes()
})

it('register service versions', async function () {
  for (const serviceType of serviceTypeList) {
    await coliving0.ethContracts.ServiceTypeManagerClient.setServiceVersion(
      serviceType,
      latestVersionStr
    )
  }
})

it('query service versions', async function () {
  for (const serviceType of serviceTypeList) {
    let currentVersion = await coliving0.ethContracts.ServiceTypeManagerClient.getCurrentVersion(serviceType)
    assert(currentVersion === latestVersionStr, 'Expect latest version')
  }
})
