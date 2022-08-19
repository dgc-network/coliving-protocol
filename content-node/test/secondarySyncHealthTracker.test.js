const assert = require('assert')

const SecondarySyncHealthAgreementer = require('../src/snapbackSM/secondarySyncHealthAgreementer')
const { getLibsMock } = require('./lib/libsMock')
const { getApp } = require('./lib/app')

describe('test secondarySyncHealthAgreementer', function () {
  let app, server

  beforeEach(async function () {
    const appInfo = await getApp(getLibsMock())
    app = appInfo.app
    server = appInfo.server

    await app.get('redisClient').flushdb()
  })

  afterEach(async function () {
    await server.close()
  })

  it(
    '[computeUsersSecondarySyncSuccessRatesForToday] should return 100% success rate for 1 success and 0 failures',
    async function () {
      const wallet = 'testWallet1'
      const secondary = 'http://secondary1.co'
      const syncType = 'testSyncType'

      await SecondarySyncHealthAgreementer.recordSuccess(secondary, wallet, syncType)

      const walletsToSecondariesMapping = {
        [wallet]: [[secondary]]
      }
      const userSecondarySyncMetricsMap =
        await SecondarySyncHealthAgreementer.computeUsersSecondarySyncSuccessRatesForToday(
          walletsToSecondariesMapping
        )

      const expectedUserSecondarySyncMetricsMap = {
        [wallet]: {
          [secondary]: {
            successCount: 1,
            failureCount: 0,
            successRate: 1
          }
        }
      }
      assert.deepEqual(userSecondarySyncMetricsMap, expectedUserSecondarySyncMetricsMap)
  })

  it(
    '[computeUsersSecondarySyncSuccessRatesForToday] should return 50% success rate for 1 success and 1 failure',
    async function () {
      const wallet = 'testWallet1'
      const secondary = 'http://secondary1.co'
      const syncType = 'testSyncType'

      await SecondarySyncHealthAgreementer.recordSuccess(secondary, wallet, syncType)
      await SecondarySyncHealthAgreementer.recordFailure(secondary, wallet, syncType)

      const walletsToSecondariesMapping = {
        [wallet]: [[secondary]]
      }
      const userSecondarySyncMetricsMap =
        await SecondarySyncHealthAgreementer.computeUsersSecondarySyncSuccessRatesForToday(
          walletsToSecondariesMapping
        )

      const expectedUserSecondarySyncMetricsMap = {
        [wallet]: {
          [secondary]: {
            successCount: 1,
            failureCount: 1,
            successRate: 0.5
          }
        }
      }
      assert.deepEqual(userSecondarySyncMetricsMap, expectedUserSecondarySyncMetricsMap)
  })

  it(
    '[computeUsersSecondarySyncSuccessRatesForToday] should return 0% success rate for 0 successes and 1 failure',
    async function () {
      const wallet = 'testWallet1'
      const secondary = 'http://secondary1.co'
      const syncType = 'testSyncType'

      await SecondarySyncHealthAgreementer.recordFailure(secondary, wallet, syncType)

      const walletsToSecondariesMapping = {
        [wallet]: [[secondary]]
      }
      const userSecondarySyncMetricsMap =
        await SecondarySyncHealthAgreementer.computeUsersSecondarySyncSuccessRatesForToday(
          walletsToSecondariesMapping
        )

      const expectedUserSecondarySyncMetricsMap = {
        [wallet]: {
          [secondary]: {
            successCount: 0,
            failureCount: 1,
            successRate: 0
          }
        }
      }
      assert.deepEqual(userSecondarySyncMetricsMap, expectedUserSecondarySyncMetricsMap)
  })

  it(
    '[computeUsersSecondarySyncSuccessRatesForToday] only returns wallets and secondaries requested',
    async function () {
      const wallet = 'testWallet1'
      const wallet2 = 'testWallet2'
      const wallet3 = 'testWallet3'
      const secondary = 'http://secondary1.co'
      const secondary2 = 'http://secondary2.co'
      const secondary3 = 'http://secondary3.co'
      const syncType = 'testSyncType'

      for (const currSecondary of [secondary, secondary2, secondary3]) {
        await SecondarySyncHealthAgreementer.recordSuccess(currSecondary, wallet, syncType)
        await SecondarySyncHealthAgreementer.recordSuccess(currSecondary, wallet, syncType)
        await SecondarySyncHealthAgreementer.recordFailure(currSecondary, wallet2, syncType)
        await SecondarySyncHealthAgreementer.recordSuccess(currSecondary, wallet3, syncType)
        await SecondarySyncHealthAgreementer.recordFailure(currSecondary, wallet3, syncType)
      }

      const walletsToSecondariesMapping = {
        [wallet]: [[secondary], [secondary2]],
        [wallet2]: [[secondary], [secondary3]]
      }
      const userSecondarySyncMetricsMap =
        await SecondarySyncHealthAgreementer.computeUsersSecondarySyncSuccessRatesForToday(
          walletsToSecondariesMapping
        )

      const expectedUserSecondarySyncMetricsMap = {
        [wallet]: {
          [secondary]: {
            successCount: 2,
            failureCount: 0,
            successRate: 1
          },
          [secondary2]: {
            successCount: 2,
            failureCount: 0,
            successRate: 1
          }
        },
        [wallet2]: {
          [secondary]: {
            successCount: 0,
            failureCount: 1,
            successRate: 0
          },
          [secondary3]: {
            successCount: 0,
            failureCount: 1,
            successRate: 0
          }
        }
      }
      assert.deepEqual(userSecondarySyncMetricsMap, expectedUserSecondarySyncMetricsMap)
  })
})
