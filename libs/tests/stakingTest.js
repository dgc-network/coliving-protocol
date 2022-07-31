const assert = require('assert')
const nock = require('nock')
const helpers = require('./helpers')
const { time } = require('@openzeppelin/test-helpers')

// const colivingConfig = helpers.colivingLibsConfig
const { getRandomLocalhost, colivingInstance: coliving0 } = helpers
const initializeLibConfig = helpers.initializeLibConfig
const ethContractsConfig = require('../eth-contracts/config.json')
const ColivingLibs = require('../src/libs');
const { convertAudsToWeiBN } = require('../initScripts/helpers/utils');
const { initial } = require('lodash')
const { deregisterSPEndpoint } = require('./helpers')

let token
let ownerWallet
let accounts
let coliving1
let coliving2
let sp1
let sp2

const assertThrows = async (blockOrPromise, expectedErrorCode, expectedReason) => {
  try {
    (typeof blockOrPromise === 'function') ? await blockOrPromise() : await blockOrPromise
  } catch (error) {
    assert(error.message.search(expectedErrorCode) > -1, `Expected error code "${expectedErrorCode}" but failed with "${error}" instead.`)
    return error
  }
  // assert.fail() for some reason does not have its error string printed 🤷
  assert(false, `Expected "${expectedErrorCode}"${expectedReason ? ` (with reason: "${expectedReason}")` : ''} but it did not fail`)
}

const assertRevert = async (blockOrPromise, expectedReason) => {
  const error = await assertThrows(blockOrPromise, 'revert', expectedReason)
  if (!expectedReason) {
    return
  }
  const expectedMsgFound = error.message.indexOf(expectedReason) >= 0
  assert.equal(expectedMsgFound, true, 'Expected revert reason not found')
}

describe('Staking tests', () => {
  let testServiceType = 'discovery-node'

  before(async function () {
    await coliving0.init()
    token = coliving0.ethContracts.ColivingTokenClient
    accounts = await coliving0.ethWeb3Manager.getWeb3().eth.getAccounts()

    // Set lockup durations to a small number so we can reach it
    // in a reasonable test time
    await coliving0.ethContracts.GovernanceClient.setVotingPeriod(1)
    await coliving0.ethContracts.GovernanceClient.setExecutionDelay(0)
    await coliving0.ethContracts.ServiceProviderFactoryClient.updateDecreaseStakeLockupDuration(10)
    await coliving0.ethContracts.DelegateManagerClient.updateUndelegateLockupDuration(10)

    ownerWallet = accounts[0]
    sp1 = accounts[1]
    sp2 = accounts[2]

    // Initialize more lib instances
    let libsConfig1 = await initializeLibConfig(sp1)
    assert(
      ethContractsConfig.ownerWallet !== libsConfig1.ownerWallet,
      'New wallet addr')
    coliving1 = new ColivingLibs(libsConfig1)
    await coliving1.init()

    let libsConfig2 = await initializeLibConfig(accounts[2])
    assert(
      ethContractsConfig.ownerWallet !== libsConfig2.ownerWallet,
      'New wallet addr')
    coliving2 = new ColivingLibs(libsConfig2)
    await coliving2.init()

    // Refund test accounts
    await token.transfer(sp1, convertAudsToWeiBN(coliving1.ethWeb3Manager.getWeb3(), 2000000))
    await token.transfer(sp2, convertAudsToWeiBN(coliving1.ethWeb3Manager.getWeb3(), 2000000))

  })

  it('initial staking contract state', async function () {
    let tokenAddr = await coliving0.ethContracts.StakingProxyClient.token()
    assert(token.contractAddress, tokenAddr, 'Expect correct token address from staking proxy')
    let supportsHistory = await coliving0.ethContracts.StakingProxyClient.supportsHistory()
    assert.equal(supportsHistory, true, 'History support required')
    assert.equal(await coliving0.ethContracts.StakingProxyClient.totalStaked(), 0, 'Expect no stake on init')
  })

  describe('Registration', () => {
    let initialSPBalance
    let testEndpt
    let testEndpt2
    let initialStake
    let defaultStake

    beforeEach(async () => {

      // Clear any accounts registered w/the coliving1 account
      initialSPBalance = await token.balanceOf(sp1)
      testEndpt = getRandomLocalhost()

      let path = '/version'
      let response = {
        service: testServiceType,
        version : '0.0.1'
      }

      if (testServiceType === 'discovery-node') {
        path = '/health_check'
        response = {data: {...response}}
      }

      nock(testEndpt)
        .get(path)
        .reply(200, response)

      // Cache stake amount prior to register
      initialStake = await coliving1.ethContracts.StakingProxyClient.totalStakedFor(sp1)
      defaultStake = convertAudsToWeiBN(coliving1.ethWeb3Manager.getWeb3(), 210000)

      // Register
      let tx = await coliving1.ethContracts.ServiceProviderFactoryClient.register(
        testServiceType,
        testEndpt,
        defaultStake
      )
    })

    afterEach(async () => {
      await deregisterSPEndpoint(coliving1, sp1, testServiceType)
    })

    it('register service provider + stake', async function () {
      const newBalance = await token.balanceOf(sp1)
      const expectedNewBalance = initialSPBalance.sub(defaultStake)
      assert(
        newBalance.eq(expectedNewBalance),
        'Expect decrease in bal'
      )

      const staked = await coliving1.ethContracts.StakingProxyClient.totalStakedFor(sp1)
      const expectedStaked = initialStake.add(defaultStake)
      assert(
        staked.eq(expectedStaked),
        'Expect increase in stake'
      )
    })

    it('increases service provider stake', async function () {
      let preIncreaseBalance = await token.balanceOf(sp1)
      let preIncreaseStake = await coliving1.ethContracts.StakingProxyClient.totalStakedFor(sp1)
      let tx = await coliving1.ethContracts.ServiceProviderFactoryClient.increaseStake(defaultStake)

      const newBalance = await token.balanceOf(sp1)
      const expectedBalance = preIncreaseBalance.sub(defaultStake)
      assert(
        newBalance.eq(expectedBalance),
        'Expect decrease in balance'
      )
      const totalStaked = await coliving1.ethContracts.StakingProxyClient.totalStakedFor(sp1)
      const expectedStaked = preIncreaseStake.add(defaultStake)
      assert(
        totalStaked.eq(expectedStaked),
        'Expect increase in stake'
      )

      // Confirm revert occurred for incorrect owner
      assertRevert(
        coliving2.ethContracts.ServiceProviderFactoryClient.increaseStake(
          defaultStake
        ),
        'incorrect owner'
      )
    })

    it('decreases service provider stake', async () => {
      const preDecreaseBal = await token.balanceOf(sp1)
      const preDecreaseStake = await coliving1.ethContracts.StakingProxyClient.totalStakedFor(sp1)

      const decreaseAmount = coliving1.ethWeb3Manager.getWeb3().utils.toBN(10000)

      const lockupExpiryBlock = await coliving1.ethContracts.ServiceProviderFactoryClient.requestDecreaseStake(
        decreaseAmount
      )
      await time.advanceBlockTo(lockupExpiryBlock)

      await coliving1.ethContracts.ServiceProviderFactoryClient.decreaseStake(
        lockupExpiryBlock
      )

      const newBalance = await token.balanceOf(sp1)
      const expectedBalance = preDecreaseBal.add(decreaseAmount)
      assert(
        newBalance.eq(expectedBalance),
        'Expect increase in balance'
      )

      const totalStaked = await coliving1.ethContracts.StakingProxyClient.totalStakedFor(sp1)
      const expectedStaked = preDecreaseStake.sub(decreaseAmount)
      assert(
        totalStaked.eq(expectedStaked),
        'Expect decrease in stake'
      )

      assertRevert(
        coliving2.ethContracts.ServiceProviderFactoryClient.decreaseStake(
          decreaseAmount
        ),
        'incorrect owner'
      )

      const currentStake = await coliving1.ethContracts.StakingProxyClient.totalStakedFor(sp1)
      // Configure amount greater than current stake to try and decrease
      const increaseAmt = coliving1.ethWeb3Manager.getWeb3().utils.toBN(10)
      const invalidDecreaseAmount = currentStake.add(increaseAmt)
      assertRevert(
        coliving1.ethContracts.ServiceProviderFactoryClient.decreaseStake(
          invalidDecreaseAmount
        ),
        'subtraction overflow'
      )
    })
  })

  describe('Deregistration', () => {
    beforeEach(async () => {

      // Clear any accounts registered w/the coliving1 account
      initialSPBalance = await token.balanceOf(sp1)
      testEndpt = getRandomLocalhost()

      let path = '/version'
      let response = {
        service: testServiceType,
        version : '0.0.1'
      }

      if (testServiceType === 'discovery-node') {
        path = '/health_check'
        response = {data: {...response}}
      }

      nock(testEndpt)
        .get(path)
        .reply(200, response)

      // Cache stake amount prior to register
      initialStake = await coliving1.ethContracts.StakingProxyClient.totalStakedFor(sp1)
      defaultStake = convertAudsToWeiBN(coliving1.ethWeb3Manager.getWeb3(), 210000)

      // Register
      let tx = await coliving1.ethContracts.ServiceProviderFactoryClient.register(
        testServiceType,
        testEndpt,
        defaultStake
      )
    })

    it('deregisters service provider + recover stake', async function () {
      const initialBalance = await token.balanceOf(sp1)
      const preDeregisterStake = await coliving1.ethContracts.StakingProxyClient.totalStakedFor(sp1)

      nock(testEndpt)
        .get('/version')
        .reply(200, {
          service: testServiceType,
          version: '0.0.1'
      })

      const tx = await coliving1.ethContracts.ServiceProviderFactoryClient.deregister(
        testServiceType,
        testEndpt
      )

      const lockupExpiryBlock = await coliving1.ethContracts.ServiceProviderFactoryClient.getLockupExpiry(
        coliving1.ethWeb3Manager.getWalletAddress()
      )

      await time.advanceBlockTo(lockupExpiryBlock)

      await coliving1.ethContracts.ServiceProviderFactoryClient.decreaseStake(
        lockupExpiryBlock
      )

      const newBalance = await token.balanceOf(sp1)
      const expectedBalance = initialBalance.add(preDeregisterStake)
      assert(
        newBalance.eq(expectedBalance),
        'Expect stake returned after deregistration'
      )

      const totalStaked = await coliving1.ethContracts.StakingProxyClient.totalStakedFor(sp1)
      const expectedStaked = preDeregisterStake.sub(defaultStake)
      assert(
        totalStaked.isZero(),
        'Expect decrease in stake after deregistration'
      )
    })
  })
})
