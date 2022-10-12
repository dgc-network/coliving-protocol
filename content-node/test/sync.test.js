const request = require('supertest')
const fs = require('fs-extra')
const path = require('path')
const assert = require('assert')
const _ = require('lodash')
const nock = require('nock')
const chai = require('chai')
const sinon = require('sinon')
const proxyquire = require('proxyquire')

const config = require('../src/config')
const models = require('../src/models')
const { getApp, getServiceRegistryMock } = require('./lib/app')
const { getLibsMock } = require('./lib/libsMock')
const libsMock = getLibsMock()
const {
  createStarterCNodeUser,
  testEthereumConstants,
  destroyUsers
} = require('./lib/dataSeeds')
const { uploadDigitalContent } = require('./lib/helpers')
const BlacklistManager = require('../src/blacklistManager')
const sessionManager = require('../src/sessionManager')
const exportComponentService = require('../src/components/replicaSet/exportComponentService')

const redisClient = require('../src/redis')
const { stringifiedDateFields } = require('./lib/utils')
const secondarySyncFromPrimary = require('../src/services/sync/secondarySyncFromPrimary')

chai.use(require('sinon-chai'))
chai.use(require('chai-as-promised'))
const { expect } = chai

const testAudioFilePath = path.resolve(__dirname, 'testDigitalContent.mp3')

const DUMMY_WALLET = testEthereumConstants.pubKey.toLowerCase()
const DUMMY_CNODEUSER_BLOCKNUMBER = 10
// Below files generated using above dummy data
const sampleExportDummyCIDPath = path.resolve(
  __dirname,
  'syncAssets/sampleExportDummyCID.json'
)
const sampleExportDummyCIDFromClock2Path = path.resolve(
  __dirname,
  'syncAssets/sampleExportDummyCIDFromClock2.json'
)

describe('test nodesync', async function () {
  let server, app, mockServiceRegistry, userId

  const originalMaxExportClockValueRange = config.get(
    'maxExportClockValueRange'
  )
  let maxExportClockValueRange = originalMaxExportClockValueRange

  userId = 1

  let sandbox
  const setupDepsAndApp = async function () {
    sandbox = sinon.createSandbox()
    const appInfo = await getApp(libsMock, BlacklistManager, null, userId)
    server = appInfo.server
    app = appInfo.app
    mockServiceRegistry = appInfo.mockServiceRegistry
  }

  /** Wipe DB + Redis */
  beforeEach(async function () {
    try {
      await destroyUsers()
    } catch (e) {
      // do nothing
    }
    await redisClient.flushdb()
  })

  /**
   * Wipe DB, server, and redis state
   */
  afterEach(async function () {
    sandbox.restore()
    await sinon.restore()
    await server.close()
  })

  describe('test /export route', async function () {
    let cnodeUserUUID,
      sessionToken,
      metadataMultihash,
      metadataFileUUID,
      transcodedDigitalContentCID,
      transcodedDigitalContentUUID,
      digitalContentSegments,
      sourceFile
    let digitalContentMetadataMultihash, digitalContentMetadataFileUUID

    const { pubKey } = testEthereumConstants

    const createUserAndDigitalContent = async function () {
      // Create user
      ;({ cnodeUserUUID, sessionToken, userId } = await createStarterCNodeUser(
        userId
      ))

      // Upload user metadata
      const metadata = {
        metadata: {
          testField: 'testValue'
        }
      }
      const userMetadataResp = await request(app)
        .post('/coliving_users/metadata')
        .set('X-Session-ID', sessionToken)
        .set('User-Id', userId)
        .set('Enforce-Write-Quorum', false)
        .send(metadata)
        .expect(200)
      metadataMultihash = userMetadataResp.body.data.metadataMultihash
      metadataFileUUID = userMetadataResp.body.data.metadataFileUUID

      // Associate user with with blockchain ID
      const associateRequest = {
        blockchainUserId: 1,
        metadataFileUUID,
        blockNumber: 10
      }
      await request(app)
        .post('/coliving_users')
        .set('X-Session-ID', sessionToken)
        .set('User-Id', userId)
        .send(associateRequest)
        .expect(200)

      /** Upload a digital_content */

      const digitalContentUploadResponse = await uploadDigitalContent(
        testAudioFilePath,
        cnodeUserUUID,
        mockServiceRegistry.blacklistManager
      )

      transcodedDigitalContentUUID = digitalContentUploadResponse.transcodedDigitalContentUUID
      digitalContentSegments = digitalContentUploadResponse.digital_content_segments
      sourceFile = digitalContentUploadResponse.source_file
      transcodedDigitalContentCID = digitalContentUploadResponse.transcodedDigitalContentCID

      // Upload digital_content metadata
      const digitalContentMetadata = {
        metadata: {
          test: 'field1',
          owner_id: 1,
          digital_content_segments: digitalContentSegments
        },
        source_file: sourceFile
      }
      const digitalContentMetadataResp = await request(app)
        .post('/digital_contents/metadata')
        .set('X-Session-ID', sessionToken)
        .set('User-Id', userId)
        .set('Enforce-Write-Quorum', false)
        .send(digitalContentMetadata)
        .expect(200)
      digitalContentMetadataMultihash = digitalContentMetadataResp.body.data.metadataMultihash
      digitalContentMetadataFileUUID = digitalContentMetadataResp.body.data.metadataFileUUID

      // associate digital_content + digital_content metadata with blockchain ID
      await request(app)
        .post('/digitalContents')
        .set('X-Session-ID', sessionToken)
        .set('User-Id', userId)
        .send({
          blockchainDigitalContentId: 1,
          blockNumber: 10,
          metadataFileUUID: digitalContentMetadataFileUUID,
          transcodedDigitalContentUUID
        })
    }

    describe('Confirm export object matches DB state with a user and digital_content', async function () {
      beforeEach(setupDepsAndApp)

      beforeEach(createUserAndDigitalContent)

      it('Test default export', async function () {
        // confirm maxExportClockValueRange > cnodeUser.clock
        const cnodeUserClock = (
          await models.CNodeUser.findOne({
            where: { cnodeUserUUID },
            raw: true
          })
        ).clock
        assert.ok(cnodeUserClock <= maxExportClockValueRange)

        const { body: exportBody } = await request(app).get(
          `/export?wallet_public_key=${pubKey.toLowerCase()}`
        )

        /**
         * Verify
         */

        // Get user metadata
        const userMetadataFile = stringifiedDateFields(
          await models.File.findOne({
            where: {
              multihash: metadataMultihash,
              fileUUID: metadataFileUUID,
              clock: 1
            },
            raw: true
          })
        )

        // get transcoded digital_content file
        const copy320 = stringifiedDateFields(
          await models.File.findOne({
            where: {
              multihash: transcodedDigitalContentCID,
              fileUUID: transcodedDigitalContentUUID,
              type: 'copy320'
            },
            raw: true
          })
        )

        // get segment files
        const segmentHashes = digitalContentSegments.map((t) => t.multihash)
        const segmentFiles = await Promise.all(
          segmentHashes.map(async (hash, i) => {
            const segment = await models.File.findOne({
              where: {
                multihash: hash,
                type: 'digital_content'
              },
              raw: true
            })
            return stringifiedDateFields(segment)
          })
        )

        // Get digital_content metadata file
        const digitalContentMetadataFile = stringifiedDateFields(
          await models.File.findOne({
            where: {
              multihash: digitalContentMetadataMultihash,
              fileUUID: digitalContentMetadataFileUUID,
              clock: 36
            },
            raw: true
          })
        )

        // get colivingUser
        const colivingUser = stringifiedDateFields(
          await models.ColivingUser.findOne({
            where: {
              metadataFileUUID,
              clock: 2
            },
            raw: true
          })
        )

        // get cnodeUser
        const cnodeUser = stringifiedDateFields(
          await models.CNodeUser.findOne({
            where: {
              cnodeUserUUID
            },
            raw: true
          })
        )

        // get clock records
        const clockRecords = (
          await models.ClockRecord.findAll({
            where: { cnodeUserUUID },
            raw: true
          })
        ).map(stringifiedDateFields)

        // get digital_content file
        const digitalContentFile = stringifiedDateFields(
          await models.DigitalContent.findOne({
            where: {
              cnodeUserUUID,
              metadataFileUUID: digitalContentMetadataFileUUID
            },
            raw: true
          })
        )

        const clockInfo = {
          localClockMax: cnodeUser.clock,
          requestedClockRangeMin: 0,
          requestedClockRangeMax: maxExportClockValueRange - 1
        }

        // construct the expected response
        const expectedData = {
          [cnodeUserUUID]: {
            ...cnodeUser,
            colivingUsers: [colivingUser],
            digitalContents: [digitalContentFile],
            files: [
              userMetadataFile,
              copy320,
              ...segmentFiles,
              digitalContentMetadataFile
            ],
            clockRecords,
            clockInfo
          }
        }

        // compare exported data
        const exportedUserData = exportBody.data.cnodeUsers
        assert.deepStrictEqual(clockRecords.length, cnodeUserClock)
        assert.deepStrictEqual(exportedUserData, expectedData)
      })
    })

    describe('Confirm export works for user with data exceeding maxExportClockValueRange', async function () {
      /**
       * override maxExportClockValueRange to smaller value for testing
       */
      beforeEach(async function () {
        maxExportClockValueRange = 10
        process.env.maxExportClockValueRange = maxExportClockValueRange
      })

      beforeEach(setupDepsAndApp)

      beforeEach(createUserAndDigitalContent)

      /**
       * unset maxExportClockValueRange
       */
      afterEach(async function () {
        delete process.env.maxExportClockValueRange
      })

      it('Export from clock = 0', async function () {
        const requestedClockRangeMin = 0
        const requestedClockRangeMax = maxExportClockValueRange - 1

        // confirm maxExportClockValueRange < cnodeUser.clock
        const cnodeUserClock = (
          await models.CNodeUser.findOne({
            where: { cnodeUserUUID },
            raw: true
          })
        ).clock
        assert.ok(cnodeUserClock > maxExportClockValueRange)

        const { body: exportBody, statusCode } = await request(app).get(
          `/export?wallet_public_key=${pubKey.toLowerCase()}`
        )

        /**
         * Verify
         */

        assert.strictEqual(statusCode, 200)

        // get cnodeUser
        const cnodeUser = stringifiedDateFields(
          await models.CNodeUser.findOne({
            where: {
              cnodeUserUUID
            },
            raw: true
          })
        )
        cnodeUser.clock = requestedClockRangeMax

        // get clockRecords
        const clockRecords = (
          await models.ClockRecord.findAll({
            where: {
              cnodeUserUUID,
              clock: {
                [models.Sequelize.Op.lte]: requestedClockRangeMax
              }
            },
            order: [['clock', 'ASC']],
            raw: true
          })
        ).map(stringifiedDateFields)

        // Get colivingUsers
        const colivingUsers = (
          await models.ColivingUser.findAll({
            where: {
              cnodeUserUUID,
              clock: {
                [models.Sequelize.Op.lte]: requestedClockRangeMax
              }
            },
            order: [['clock', 'ASC']],
            raw: true
          })
        ).map(stringifiedDateFields)

        // get digitalContents
        const digitalContents = (
          await models.DigitalContent.findAll({
            where: {
              cnodeUserUUID,
              clock: {
                [models.Sequelize.Op.lte]: requestedClockRangeMax
              }
            },
            order: [['clock', 'ASC']],
            raw: true
          })
        ).map(stringifiedDateFields)

        // get files
        const files = (
          await models.File.findAll({
            where: {
              cnodeUserUUID,
              clock: {
                [models.Sequelize.Op.lte]: requestedClockRangeMax
              }
            },
            order: [['clock', 'ASC']],
            raw: true
          })
        ).map(stringifiedDateFields)

        const clockInfo = {
          requestedClockRangeMin,
          requestedClockRangeMax,
          localClockMax: requestedClockRangeMax
        }

        // construct the expected response
        const expectedData = {
          [cnodeUserUUID]: {
            ...cnodeUser,
            colivingUsers,
            digitalContents,
            files,
            clockRecords,
            clockInfo
          }
        }

        // compare exported data
        const exportedUserData = exportBody.data.cnodeUsers
        assert.deepStrictEqual(exportedUserData, expectedData)
        // when requesting from 0, exported data set is 1 less than expected range since clock values are 1-indexed
        assert.deepStrictEqual(
          clockRecords.length,
          maxExportClockValueRange - 1
        )
      })

      it('Export from clock = 10', async function () {
        const clockRangeMin = 10
        const requestedClockRangeMin = clockRangeMin
        const requestedClockRangeMax =
          clockRangeMin + (maxExportClockValueRange - 1)

        // confirm maxExportClockValueRange < cnodeUser.clock
        const cnodeUserClock = (
          await models.CNodeUser.findOne({
            where: { cnodeUserUUID },
            raw: true
          })
        ).clock
        assert.ok(cnodeUserClock > maxExportClockValueRange)

        const { body: exportBody, statusCode } = await request(app).get(
          `/export?wallet_public_key=${pubKey.toLowerCase()}&clock_range_min=${requestedClockRangeMin}`
        )

        /**
         * Verify
         */

        assert.strictEqual(statusCode, 200)

        // get cnodeUser
        const cnodeUser = stringifiedDateFields(
          await models.CNodeUser.findOne({
            where: {
              cnodeUserUUID
            },
            raw: true
          })
        )
        cnodeUser.clock = requestedClockRangeMax

        // get clockRecords
        const clockRecords = (
          await models.ClockRecord.findAll({
            where: {
              cnodeUserUUID,
              clock: {
                [models.Sequelize.Op.gte]: requestedClockRangeMin,
                [models.Sequelize.Op.lte]: requestedClockRangeMax
              }
            },
            order: [['clock', 'ASC']],
            raw: true
          })
        ).map(stringifiedDateFields)

        // Get colivingUsers
        const colivingUsers = (
          await models.ColivingUser.findAll({
            where: {
              cnodeUserUUID,
              clock: {
                [models.Sequelize.Op.gte]: requestedClockRangeMin,
                [models.Sequelize.Op.lte]: requestedClockRangeMax
              }
            },
            order: [['clock', 'ASC']],
            raw: true
          })
        ).map(stringifiedDateFields)

        // get digitalContents
        const digitalContents = (
          await models.DigitalContent.findAll({
            where: {
              cnodeUserUUID,
              clock: {
                [models.Sequelize.Op.gte]: requestedClockRangeMin,
                [models.Sequelize.Op.lte]: requestedClockRangeMax
              }
            },
            order: [['clock', 'ASC']],
            raw: true
          })
        ).map(stringifiedDateFields)

        // get files
        const files = (
          await models.File.findAll({
            where: {
              cnodeUserUUID,
              clock: {
                [models.Sequelize.Op.gte]: requestedClockRangeMin,
                [models.Sequelize.Op.lte]: requestedClockRangeMax
              }
            },
            order: [['clock', 'ASC']],
            raw: true
          })
        ).map(stringifiedDateFields)

        const clockInfo = {
          requestedClockRangeMin,
          requestedClockRangeMax,
          localClockMax: requestedClockRangeMax
        }

        // construct the expected response
        const expectedData = {
          [cnodeUserUUID]: {
            ...cnodeUser,
            colivingUsers,
            digitalContents,
            files,
            clockRecords,
            clockInfo
          }
        }

        // compare exported data
        const exportedUserData = exportBody.data.cnodeUsers
        assert.deepStrictEqual(exportedUserData, expectedData)
        assert.deepStrictEqual(clockRecords.length, maxExportClockValueRange)
      })

      it('Export from clock = 30 where range exceeds final value', async function () {
        const clockRangeMin = 30
        const requestedClockRangeMin = clockRangeMin
        const requestedClockRangeMax =
          clockRangeMin + (maxExportClockValueRange - 1)

        // confirm cnodeUser.clock < (requestedClockRangeMin + maxExportClockValueRange)
        const cnodeUserClock = (
          await models.CNodeUser.findOne({
            where: { cnodeUserUUID },
            raw: true
          })
        ).clock
        assert.ok(
          cnodeUserClock < requestedClockRangeMin + maxExportClockValueRange
        )

        const { body: exportBody, statusCode } = await request(app).get(
          `/export?wallet_public_key=${pubKey.toLowerCase()}&clock_range_min=${requestedClockRangeMin}`
        )

        /**
         * Verify
         */
        assert.strictEqual(statusCode, 200)

        // get cnodeUser
        const cnodeUser = stringifiedDateFields(
          await models.CNodeUser.findOne({
            where: {
              cnodeUserUUID
            },
            raw: true
          })
        )
        cnodeUser.clock = Math.min(cnodeUser.clock, requestedClockRangeMax)

        // get clockRecords
        const clockRecords = (
          await models.ClockRecord.findAll({
            where: {
              cnodeUserUUID,
              clock: {
                [models.Sequelize.Op.gte]: requestedClockRangeMin,
                [models.Sequelize.Op.lte]: requestedClockRangeMax
              }
            },
            order: [['clock', 'ASC']],
            raw: true
          })
        ).map(stringifiedDateFields)

        // Get colivingUsers
        const colivingUsers = (
          await models.ColivingUser.findAll({
            where: {
              cnodeUserUUID,
              clock: {
                [models.Sequelize.Op.gte]: requestedClockRangeMin,
                [models.Sequelize.Op.lte]: requestedClockRangeMax
              }
            },
            order: [['clock', 'ASC']],
            raw: true
          })
        ).map(stringifiedDateFields)

        // get digitalContents
        const digitalContents = (
          await models.DigitalContent.findAll({
            where: {
              cnodeUserUUID,
              clock: {
                [models.Sequelize.Op.gte]: requestedClockRangeMin,
                [models.Sequelize.Op.lte]: requestedClockRangeMax
              }
            },
            order: [['clock', 'ASC']],
            raw: true
          })
        ).map(stringifiedDateFields)

        // get files
        const files = (
          await models.File.findAll({
            where: {
              cnodeUserUUID,
              clock: {
                [models.Sequelize.Op.gte]: requestedClockRangeMin,
                [models.Sequelize.Op.lte]: requestedClockRangeMax
              }
            },
            order: [['clock', 'ASC']],
            raw: true
          })
        ).map(stringifiedDateFields)

        const clockInfo = {
          requestedClockRangeMin,
          requestedClockRangeMax,
          localClockMax: cnodeUser.clock
        }

        // construct the expected response
        const expectedData = {
          [cnodeUserUUID]: {
            ...cnodeUser,
            colivingUsers,
            digitalContents,
            files,
            clockRecords,
            clockInfo
          }
        }

        // compare exported data
        const exportedUserData = exportBody.data.cnodeUsers
        assert.deepStrictEqual(exportedUserData, expectedData)
        assert.deepStrictEqual(
          clockRecords.length,
          cnodeUser.clock - requestedClockRangeMin + 1
        )
      })
    })

    describe('Confirm export throws an error with inconsistent data', async function () {
      beforeEach(setupDepsAndApp)

      beforeEach(createUserAndDigitalContent)

      it('Inconsistent clock values', async function () {
        // Mock findOne DB function for cnodeUsers and ClockRecords
        // Have them return inconsistent values
        const clockRecordTableClock = 8
        const clockRecordsFindAllStub = sandbox.stub().resolves([
          {
            cnodeUserUUID: '48523a08-2a11-4200-8aac-ae74b8a39dd0',
            clock: clockRecordTableClock
          }
        ])
        const cnodeUserTableClock = 7
        const cNodeUserFindAll = sandbox.stub().resolves([
          {
            // Random UUID
            cnodeUserUUID: '48523a08-2a11-4200-8aac-ae74b8a39dd0',
            clock: cnodeUserTableClock
          }
        ])

        const modelsMock = {
          ...models,
          ClockRecord: {
            findAll: clockRecordsFindAllStub
          },
          CNodeUser: {
            findAll: cNodeUserFindAll
          }
        }
        const exportComponentServiceMock = proxyquire(
          '../src/components/replicaSet/exportComponentService.js',
          {
            '../../models': modelsMock
          }
        )

        await expect(
          exportComponentServiceMock({
            walletPublicKeys: pubKey.toLowerCase(),
            requestedClockRangeMin: 0,
            requestedClockRangeMax: maxExportClockValueRange,
            logger: console,
            forceExport: false
          })
        ).to.eventually.be.rejectedWith(
          `Cannot export - exported data is not consistent. Exported max clock val = ${cnodeUserTableClock} and exported max ClockRecord val ${clockRecordTableClock}. Fixing and trying again...`
        )

        expect(clockRecordsFindAllStub).to.have.been.calledOnce
        expect(cNodeUserFindAll).to.have.been.calledOnce
      })
    })
  })

  describe('Test secondarySyncFromPrimary function', async function () {
    let serviceRegistryMock

    const TEST_ENDPOINT = 'http://test-cn.co'
    const { pubKey } = testEthereumConstants
    const userWallets = [pubKey.toLowerCase()]

    const createUser = async function () {
      // Create user
      const session = await createStarterCNodeUser(userId)

      // Upload user metadata
      const metadata = {
        metadata: {
          testField: 'testValue'
        }
      }
      const userMetadataResp = await request(app)
        .post('/coliving_users/metadata')
        .set('X-Session-ID', session.sessionToken)
        .set('User-Id', session.userId)
        .set('Enforce-Write-Quorum', false)
        .send(metadata)
        .expect(200)

      const metadataFileUUID = userMetadataResp.body.data.metadataFileUUID

      // Associate user with with blockchain ID
      const associateRequest = {
        blockchainUserId: 1,
        metadataFileUUID,
        blockNumber: 10
      }
      await request(app)
        .post('/coliving_users')
        .set('X-Session-ID', session.sessionToken)
        .set('User-Id', session.userId)
        .send(associateRequest)
        .expect(200)

      return session.cnodeUserUUID
    }

    const unpackSampleExportData = (sampleExportFilePath) => {
      const sampleExport = JSON.parse(fs.readFileSync(sampleExportFilePath))
      const cnodeUser = Object.values(sampleExport.data.cnodeUsers)[0]
      const { colivingUsers, digitalContents, files, clockRecords } = cnodeUser

      return {
        sampleExport,
        cnodeUser,
        colivingUsers,
        digitalContents,
        files,
        clockRecords
      }
    }

    const setupMocks = (sampleExport) => {
      // Mock /export route response
      nock(TEST_ENDPOINT)
        .persist()
        .get((uri) => uri.includes('/export'))
        .reply(200, sampleExport)

      // This text 'coliving is cool' is mapped to the hash in the dummy json data
      // If changes are made to the response body, make the corresponding changes to the hash too
      nock('http://mock-cn1.coliving.lol')
        .persist()
        .get((uri) =>
          uri.includes('/ipfs/QmSU6rdPHdTrVohDSfhVCBiobTMr6a3NvPz4J7nLWVDvmE')
        )
        .reply(200, 'coliving is cool')

      nock('http://mock-cn2.coliving.lol')
        .persist()
        .get((uri) =>
          uri.includes('/ipfs/QmSU6rdPHdTrVohDSfhVCBiobTMr6a3NvPz4J7nLWVDvmE')
        )
        .reply(200, 'coliving is cool')

      nock('http://mock-cn3.coliving.lol')
        .persist()
        .get((uri) =>
          uri.includes('/ipfs/QmSU6rdPHdTrVohDSfhVCBiobTMr6a3NvPz4J7nLWVDvmE')
        )
        .reply(200, 'coliving is cool')
    }

    const verifyLocalCNodeUserStateForUser = async (exportedCnodeUser) => {
      exportedCnodeUser = _.pick(exportedCnodeUser, [
        'cnodeUserUUID',
        'walletPublicKey',
        'lastLogin',
        'latestBlockNumber',
        'clock',
        'createdAt'
      ])

      const localCNodeUser = stringifiedDateFields(
        await models.CNodeUser.findOne({
          where: {
            walletPublicKey: exportedCnodeUser.walletPublicKey
          },
          raw: true
        })
      )

      assert.deepStrictEqual(
        _.omit(localCNodeUser, ['cnodeUserUUID', 'updatedAt']),
        _.omit(exportedCnodeUser, ['cnodeUserUUID', 'updatedAt'])
      )

      const newCNodeUserUUID = localCNodeUser.cnodeUserUUID
      return newCNodeUserUUID
    }

    /**
     * Verifies local state for user with CNodeUserUUID for ColivingUsers, DigitalContents, Files, and ClockRecords tables
     */
    const verifyLocalStateForUser = async ({
      cnodeUserUUID,
      exportedColivingUsers,
      exportedClockRecords,
      exportedFiles,
      exportedDigitalContents
    }) => {
      /**
       * Verify local ColivingUsers table state matches export
       */
      for (const exportedColivingUser of exportedColivingUsers) {
        const localColivingUser = stringifiedDateFields(
          await models.ColivingUser.findOne({
            where: {
              cnodeUserUUID,
              clock: exportedColivingUser.clock
            },
            raw: true
          })
        )
        assert.deepStrictEqual(
          _.omit(localColivingUser, ['cnodeUserUUID']),
          _.omit(exportedColivingUser, ['cnodeUserUUID'])
        )
      }

      /**
       * Verify local DigitalContents table state matches export
       */
      for (const exportedDigitalContent of exportedDigitalContents) {
        const { clock, blockchainId, metadataFileUUID } = exportedDigitalContent
        const localFile = stringifiedDateFields(
          await models.DigitalContent.findOne({
            where: {
              clock,
              cnodeUserUUID,
              blockchainId,
              metadataFileUUID
            },
            raw: true
          })
        )
        assert.deepStrictEqual(
          _.omit(localFile, ['cnodeUserUUID']),
          _.omit(exportedDigitalContent, ['cnodeUserUUID'])
        )
      }

      /**
       * Verify local Files table state matches export
       */
      for (const exportedFile of exportedFiles) {
        const { fileUUID, multihash, clock } = exportedFile
        const localFile = stringifiedDateFields(
          await models.File.findOne({
            where: {
              clock,
              cnodeUserUUID,
              multihash,
              fileUUID
            },
            raw: true
          })
        )
        assert.deepStrictEqual(
          _.omit(localFile, ['cnodeUserUUID']),
          _.omit(exportedFile, ['cnodeUserUUID'])
        )
      }

      /**
       * Verify local ClockRecords table state matches export
       */
      for (const exportedRecord of exportedClockRecords) {
        const { clock, sourceTable, createdAt, updatedAt } = exportedRecord
        const localRecord = stringifiedDateFields(
          await models.ClockRecord.findOne({
            where: {
              clock,
              cnodeUserUUID,
              sourceTable,
              createdAt,
              updatedAt
            },
            raw: true
          })
        )
        assert.deepStrictEqual(
          _.omit(localRecord, ['cnodeUserUUID']),
          _.omit(exportedRecord, ['cnodeUserUUID'])
        )
      }

      /**
       * TODO - Verify all expected files are on disk
       */
    }

    /**
     * Setup deps + mocks + app
     */
    beforeEach(async function () {
      nock.cleanAll()

      maxExportClockValueRange = originalMaxExportClockValueRange
      process.env.maxExportClockValueRange = maxExportClockValueRange

      const appInfo = await getApp(libsMock, BlacklistManager, null, userId)
      server = appInfo.server
      app = appInfo.app

      serviceRegistryMock = getServiceRegistryMock(libsMock, BlacklistManager)
    })

    it('Syncs correctly from clean user state with mocked export object', async function () {
      const {
        sampleExport,
        cnodeUser: exportedCnodeUser,
        colivingUsers: exportedColivingUsers,
        digitalContents: exportedDigitalContents,
        files: exportedFiles,
        clockRecords: exportedClockRecords
      } = unpackSampleExportData(sampleExportDummyCIDPath)

      setupMocks(sampleExport)

      // Confirm local user state is empty before sync
      const initialCNodeUserCount = await models.CNodeUser.count()
      assert.strictEqual(initialCNodeUserCount, 0)

      // Call secondarySyncFromPrimary
      const result = await secondarySyncFromPrimary(
        serviceRegistryMock,
        userWallets,
        TEST_ENDPOINT
      )

      assert.deepStrictEqual(result, {
        result: 'success'
      })

      const newCNodeUserUUID = await verifyLocalCNodeUserStateForUser(
        exportedCnodeUser
      )

      await verifyLocalStateForUser({
        cnodeUserUUID: newCNodeUserUUID,
        exportedColivingUsers,
        exportedClockRecords,
        exportedFiles,
        exportedDigitalContents
      })
    })

    it('Syncs correctly when cnodeUser data already exists locally', async function () {
      const {
        sampleExport,
        cnodeUser: exportedCnodeUser,
        colivingUsers: exportedColivingUsers,
        digitalContents: exportedDigitalContents,
        files: exportedFiles,
        clockRecords: exportedClockRecords
      } = unpackSampleExportData(sampleExportDummyCIDFromClock2Path)

      setupMocks(sampleExport)

      // Confirm local user state is empty before sync
      const initialCNodeUserCount = await models.CNodeUser.count()
      assert.strictEqual(initialCNodeUserCount, 0)

      // seed user state locally with different cnodeUserUUID
      const cnodeUserUUID = await createUser()

      // Confirm local user state exists before sync
      const localCNodeUserCount = await models.CNodeUser.count({
        where: { cnodeUserUUID }
      })
      assert.strictEqual(localCNodeUserCount, 1)

      // Call secondarySyncFromPrimary
      const result = await secondarySyncFromPrimary(
        serviceRegistryMock,
        userWallets,
        TEST_ENDPOINT
      )

      assert.deepStrictEqual(result, {
        result: 'success'
      })

      await verifyLocalCNodeUserStateForUser(exportedCnodeUser)

      await verifyLocalStateForUser({
        cnodeUserUUID,
        exportedColivingUsers,
        exportedClockRecords,
        exportedFiles,
        exportedDigitalContents
      })
    })

    it('Syncs correctly when cnodeUser data already exists locally with `forceResync` = true', async () => {
      const {
        sampleExport,
        cnodeUser: exportedCnodeUser,
        colivingUsers: exportedColivingUsers,
        digitalContents: exportedDigitalContents,
        files: exportedFiles,
        clockRecords: exportedClockRecords
      } = unpackSampleExportData(sampleExportDummyCIDPath)

      setupMocks(sampleExport)

      // Confirm local user state is empty before sync
      const initialCNodeUserCount = await models.CNodeUser.count()
      assert.strictEqual(initialCNodeUserCount, 0)

      // seed local user state with different cnodeUserUUID
      const cnodeUserUUID = await createUser()

      // Confirm local user state exists before sync
      const localCNodeUserCount = await models.CNodeUser.count({
        where: { cnodeUserUUID }
      })
      assert.strictEqual(localCNodeUserCount, 1)

      // Call secondarySyncFromPrimary with `forceResync` = true
      const result = await secondarySyncFromPrimary(
        serviceRegistryMock,
        userWallets,
        TEST_ENDPOINT,
        /* blockNumber */ null,
        /* forceResync */ true
      )

      assert.deepStrictEqual(result, {
        result: 'success'
      })

      const newCNodeUserUUID = await verifyLocalCNodeUserStateForUser(
        exportedCnodeUser
      )

      await verifyLocalStateForUser({
        cnodeUserUUID: newCNodeUserUUID,
        exportedColivingUsers,
        exportedClockRecords,
        exportedFiles,
        exportedDigitalContents
      })
    })
  })
})

describe('Test primarySyncFromSecondary() with mocked export', async () => {
  let server, app, serviceRegistryMock, primarySyncFromSecondaryStub

  const NODES = {
    CN1: 'http://mock-cn1.coliving.lol',
    CN2: 'http://mock-cn2.coliving.lol',
    CN3: 'http://mock-cn3.coliving.lol'
  }
  const NODES_LIST = Object.values(NODES)
  const SELF = NODES.CN1
  const SECONDARY = NODES.CN3
  const USER_1_ID = 1
  const SP_ID_1 = 1
  const USER_1_WALLET = DUMMY_WALLET
  const USER_1_BLOCKNUMBER = DUMMY_CNODEUSER_BLOCKNUMBER

  const assetsDirPath = path.resolve(__dirname, 'sync/assets')
  const exportFilePath = path.resolve(assetsDirPath, 'realExport.json')

  const unpackExportDataFromFile = (exportDataFilePath) => {
    const exportObj = JSON.parse(fs.readFileSync(exportDataFilePath))
    const cnodeUserInfo = Object.values(exportObj.data.cnodeUsers)[0]
    const cnodeUser = _.omit(cnodeUserInfo, [
      'colivingUsers',
      'digitalContents',
      'files',
      'clockRecords',
      'clockInfo'
    ])
    const { colivingUsers, digitalContents, files, clockRecords, clockInfo } =
      cnodeUserInfo

    return {
      exportObj,
      cnodeUser,
      colivingUsers,
      digitalContents,
      files,
      clockRecords,
      clockInfo
    }
  }

  /**
   * Sets `/export` route response from `endpoint` to `exportData`
   */
  const setupExportMock = (endpoint, exportData) => {
    nock(endpoint)
      .persist()
      .get((uri) => uri.includes('/export'))
      .reply(200, exportData)
  }

  const computeFilePathForCID = (CID) => {
    const directoryID = CID.slice(-4, -1) // sharded file system
    const parentDirPath = path.join(assetsDirPath, 'files', directoryID)
    const filePath = path.join(parentDirPath, CID)
    return filePath
  }

  /**
   * Sets `/ipfs` route responses for DUMMY_CID from all nodes to DUMMY_CID_DATA
   */
  const setupIPFSRouteMocks = () => {
    NODES_LIST.forEach((node) => {
      nock(node)
        .persist()
        .get((uri) => uri.includes('/ipfs'))
        .reply(200, (uri, requestbody) => {
          const CID = uri.split('/ipfs/')[1].slice(0, 46)
          const CIDFilePath = computeFilePathForCID(CID)
          const fileBuffer = fs.readFileSync(CIDFilePath)
          return fileBuffer
        })
    })
  }

  const fetchDBStateForWallet = async (walletPublicKey) => {
    const response = {
      cnodeUser: null,
      colivingUsers: null,
      digitalContents: null,
      files: null,
      clockRecords: null
    }

    const cnodeUser = stringifiedDateFields(
      await models.CNodeUser.findOne({
        where: {
          walletPublicKey
        },
        raw: true
      })
    )

    if (!cnodeUser || Object.keys(cnodeUser).length === 0) {
      return response
    } else {
      response.cnodeUser = cnodeUser
    }

    const cnodeUserUUID = cnodeUser.cnodeUserUUID

    const colivingUsers = (
      await models.ColivingUser.findAll({
        where: { cnodeUserUUID },
        raw: true
      })
    ).map(stringifiedDateFields)
    response.colivingUsers = colivingUsers

    const digitalContents = (
      await models.DigitalContent.findAll({
        where: { cnodeUserUUID },
        raw: true
      })
    ).map(stringifiedDateFields)
    response.digitalContents = digitalContents

    const files = (
      await models.File.findAll({
        where: { cnodeUserUUID },
        raw: true
      })
    ).map(stringifiedDateFields)
    response.files = files

    const clockRecords = (
      await models.ClockRecord.findAll({
        where: { cnodeUserUUID },
        raw: true
      })
    ).map(stringifiedDateFields)
    response.clockRecords = clockRecords

    return response
  }

  const comparisonOmittedFields = ['cnodeUserUUID', 'createdAt', 'updatedAt']

  const assertTableEquality = (tableA, tableB, comparisonOmittedFields) => {
    assert.deepStrictEqual(
      _.orderBy(
        tableA.map((entry) => _.omit(entry, comparisonOmittedFields)),
        ['clock'],
        ['asc']
      ),
      _.orderBy(
        tableB.map((entry) => _.omit(entry, comparisonOmittedFields)),
        ['clock'],
        ['asc']
      )
    )
  }

  const assertFullUserStateEquality = async (wallet, exportedUserData) => {
    const {
      cnodeUser: localCNodeUser,
      colivingUsers: localColivingUsers,
      digitalContents: localDigitalContents,
      files: localFiles,
      clockRecords: localClockRecords
    } = await fetchDBStateForWallet(wallet)

    const {
      exportedCnodeUser,
      exportedColivingUsers,
      exportedDigitalContents,
      exportedFiles,
      exportedClockRecords
    } = exportedUserData

    assert.deepStrictEqual(
      _.omit(localCNodeUser, comparisonOmittedFields),
      _.omit(exportedCnodeUser, comparisonOmittedFields)
    )

    assertTableEquality(
      localColivingUsers,
      exportedColivingUsers,
      comparisonOmittedFields
    )

    assertTableEquality(localDigitalContents, exportedDigitalContents, comparisonOmittedFields)

    assertTableEquality(localFiles, exportedFiles, comparisonOmittedFields)

    assertTableEquality(
      localClockRecords,
      exportedClockRecords,
      comparisonOmittedFields
    )
  }

  /**
   * Create local user with CNodeUser, ColivingUser, File, and ClockRecord state
   * @returns cnodeUserUUID
   */
  const createUser = async (userId, userWallet, blockNumber) => {
    // Create CNodeUser
    const session = await createStarterCNodeUser(userId, userWallet)

    // Upload user metadata
    const metadata = {
      metadata: {
        testField: 'testValue'
      }
    }
    const userMetadataResp = await request(app)
      .post('/coliving_users/metadata')
      .set('X-Session-ID', session.sessionToken)
      .set('User-Id', session.userId)
      .set('Enforce-Write-Quorum', false)
      .send(metadata)
      .expect(200)

    const metadataFileUUID = userMetadataResp.body.data.metadataFileUUID

    // Associate user with with blockchain ID
    const associateRequest = {
      blockchainUserId: userId,
      metadataFileUUID,
      blockNumber
    }
    await request(app)
      .post('/coliving_users')
      .set('X-Session-ID', session.sessionToken)
      .set('User-Id', session.userId)
      .set('Enforce-Write-Quorum', false)
      .send(associateRequest)
      .expect(200)

    return session.cnodeUserUUID
  }

  /** Upload new metadata for user */
  const updateUser = async (userId, cnodeUserUUID) => {
    const sessionToken = await sessionManager.createSession(cnodeUserUUID)

    // Upload user metadata
    const metadata = {
      metadata: {
        testField: 'testValue2'
      }
    }
    await request(app)
      .post('/coliving_users/metadata')
      .set('X-Session-ID', sessionToken)
      .set('User-Id', userId)
      .set('Enforce-Write-Quorum', false)
      .send(metadata)
      .expect(200)
  }

  /**
   * Reset nocks, DB, redis, file storage
   * Setup mocks, deps
   */
  beforeEach(async function () {
    nock.cleanAll()

    await destroyUsers()

    await redisClient.flushdb()

    // Clear storagePath
    const storagePath = config.get('storagePath')
    const absoluteStoragePath = path.resolve(storagePath)
    await fs.emptyDir(path.resolve(absoluteStoragePath))

    // Start server
    const appInfo = await getApp(libsMock, BlacklistManager, null, SP_ID_1)
    server = appInfo.server
    app = appInfo.app

    // Define mocks

    serviceRegistryMock = getServiceRegistryMock(libsMock, BlacklistManager)

    primarySyncFromSecondaryStub = proxyquire(
      '../src/services/sync/primarySyncFromSecondary',
      {
        '../../serviceRegistry': { serviceRegistry: serviceRegistryMock },
        '../initColivingLibs': async () => libsMock
      }
    )
  })

  // close server
  afterEach(async function () {
    await server.close()
  })

  it('Primary correctly syncs from secondary when primary has no state', async function () {
    const {
      exportObj,
      cnodeUser: exportedCnodeUser,
      colivingUsers: exportedColivingUsers,
      digitalContents: exportedDigitalContents,
      files: exportedFiles,
      clockRecords: exportedClockRecords
    } = unpackExportDataFromFile(exportFilePath)

    setupExportMock(SECONDARY, exportObj)
    setupIPFSRouteMocks()

    // Confirm local user state is empty before sync
    const { cnodeUser: initialLocalCNodeUser } = await fetchDBStateForWallet(
      USER_1_WALLET
    )
    assert.deepStrictEqual(initialLocalCNodeUser, null)

    await primarySyncFromSecondaryStub({
      secondary: SECONDARY,
      wallet: USER_1_WALLET,
      selfEndpoint: SELF
    })

    /**
     * Verify DB state after sync
     */
    const exportedUserData = {
      exportedCnodeUser,
      exportedColivingUsers,
      exportedDigitalContents,
      exportedFiles,
      exportedClockRecords
    }
    await assertFullUserStateEquality(USER_1_WALLET, exportedUserData)
  })

  it('Primary correctly syncs from secondary when nodes have divergent state', async function () {
    const {
      exportObj,
      cnodeUser: exportedCnodeUser,
      colivingUsers: exportedColivingUsers,
      digitalContents: exportedDigitalContents,
      files: exportedFiles,
      clockRecords: exportedClockRecords
    } = unpackExportDataFromFile(exportFilePath)

    setupExportMock(SECONDARY, exportObj)
    setupIPFSRouteMocks()

    // Confirm local user state is empty initially
    const { cnodeUser: initialLocalCNodeUser } = await fetchDBStateForWallet(
      USER_1_WALLET
    )
    assert.deepStrictEqual(initialLocalCNodeUser, null)

    // Add some local user state
    await createUser(USER_1_ID, USER_1_WALLET, USER_1_BLOCKNUMBER)

    /**
     * Confirm local user state is non-empty before sync
     */

    const {
      cnodeUser: localInitialCNodeUser,
      colivingUsers: localInitialColivingUsers,
      digitalContents: localInitialDigitalContents,
      files: localInitialFiles,
      clockRecords: localInitialClockRecords
    } = await fetchDBStateForWallet(USER_1_WALLET)

    assert.deepStrictEqual(
      _.omit(localInitialCNodeUser, comparisonOmittedFields),
      {
        walletPublicKey: USER_1_WALLET,
        clock: 2,
        latestBlockNumber: USER_1_BLOCKNUMBER,
        lastLogin: null
      }
    )

    assertTableEquality(localInitialColivingUsers, exportedColivingUsers, [
      ...comparisonOmittedFields,
      'metadataFileUUID'
    ])

    assertTableEquality(localInitialDigitalContents, [], comparisonOmittedFields)

    assertTableEquality(
      localInitialFiles,
      _.orderBy(exportedFiles, ['clock', 'asc']).slice(0, 1),
      [...comparisonOmittedFields, 'fileUUID']
    )

    assertTableEquality(
      localInitialClockRecords,
      _.orderBy(exportedClockRecords, ['clock', 'asc']).slice(0, 2),
      comparisonOmittedFields
    )

    await primarySyncFromSecondaryStub({
      serviceRegistry: serviceRegistryMock,
      secondary: SECONDARY,
      wallet: USER_1_WALLET,
      sourceEndpoint: SELF
    })

    /**
     * Verify DB state after sync
     */

    const {
      cnodeUser: localFinalCNodeUser,
      colivingUsers: localFinalColivingUsers,
      digitalContents: localFinalDigitalContents,
      files: localFinalFiles,
      clockRecords: localFinalClockRecords
    } = await fetchDBStateForWallet(USER_1_WALLET)

    assert.deepStrictEqual(
      _.omit(localFinalCNodeUser, comparisonOmittedFields),
      _.omit(
        { ...exportedCnodeUser, clock: exportedCnodeUser.clock + 2 },
        comparisonOmittedFields
      )
    )

    assertTableEquality(
      localFinalColivingUsers,
      _.concat(
        localInitialColivingUsers,
        exportedColivingUsers.map((colivingUser) => ({
          ...colivingUser,
          clock: colivingUser.clock + 2
        }))
      ),
      comparisonOmittedFields
    )

    assertTableEquality(localFinalDigitalContents, exportedDigitalContents, [
      ...comparisonOmittedFields,
      'clock'
    ])

    assertTableEquality(
      localFinalFiles,
      _.concat(
        localInitialFiles,
        exportedFiles.map((file) => ({ ...file, clock: file.clock + 2 }))
      ),
      comparisonOmittedFields
    )

    assertTableEquality(
      localFinalClockRecords,
      _.concat(
        localInitialClockRecords,
        exportedClockRecords.map((clockRecord) => ({
          ...clockRecord,
          clock: clockRecord.clock + 2
        }))
      ),
      comparisonOmittedFields
    )
  })

  it('Primary correctly syncs from secondary when primary has subset of secondary state', async function () {
    const {
      exportObj,
      cnodeUser: exportedCnodeUser,
      colivingUsers: exportedColivingUsers,
      digitalContents: exportedDigitalContents,
      files: exportedFiles,
      clockRecords: exportedClockRecords
    } = unpackExportDataFromFile(exportFilePath)

    setupExportMock(SECONDARY, exportObj)
    setupIPFSRouteMocks()

    /**
     * Confirm local user state is empty before sync
     */
    const { cnodeUser: localCNodeUserInitial } = await fetchDBStateForWallet(
      USER_1_WALLET
    )
    assert.deepStrictEqual(localCNodeUserInitial, null)

    /**
     * Write first few records to local DB before syncing
     */
    const colivingUsersSubset = _.orderBy(
      exportedColivingUsers,
      ['clock'],
      ['asc']
    ).slice(0, 1)
    const filesSubset = _.orderBy(exportedFiles, ['clock'], ['asc']).slice(0, 1)
    const clockRecordsSubSet = _.orderBy(
      exportedClockRecords,
      ['clock'],
      ['asc']
    ).slice(0, 2)

    const transaction = await models.sequelize.transaction()
    await models.CNodeUser.create(
      { ...exportedCnodeUser, clock: 2 },
      { transaction }
    )
    await models.ClockRecord.bulkCreate(clockRecordsSubSet, { transaction })
    await models.File.bulkCreate(filesSubset, { transaction })
    await models.ColivingUser.bulkCreate(colivingUsersSubset, { transaction })
    await transaction.commit()

    /**
     * Confirm user state has updated
     */
    const { cnodeUser: localCNodeUserAfterWrite } = await fetchDBStateForWallet(
      USER_1_WALLET
    )
    assert.deepStrictEqual(localCNodeUserAfterWrite.clock, 2)

    /**
     * Sync primary from secondary
     */
    await primarySyncFromSecondaryStub({
      serviceRegistry: serviceRegistryMock,
      secondary: SECONDARY,
      wallet: USER_1_WALLET,
      sourceEndpoint: SELF
    })

    /**
     * Verify DB state after sync
     */
    const exportedUserData = {
      exportedCnodeUser,
      exportedColivingUsers,
      exportedDigitalContents,
      exportedFiles,
      exportedClockRecords
    }
    await assertFullUserStateEquality(USER_1_WALLET, exportedUserData)
  })

  it('Primary correctly syncs from secondary when both have same data', async function () {
    const {
      exportObj,
      cnodeUser: exportedCnodeUser,
      colivingUsers: exportedColivingUsers,
      digitalContents: exportedDigitalContents,
      files: exportedFiles,
      clockRecords: exportedClockRecords
    } = unpackExportDataFromFile(exportFilePath)

    setupExportMock(SECONDARY, exportObj)
    setupIPFSRouteMocks()

    /**
     * Confirm local user state is empty before sync
     */
    const { cnodeUser: localCNodeUserInitial } = await fetchDBStateForWallet(
      USER_1_WALLET
    )
    assert.deepStrictEqual(localCNodeUserInitial, null)

    /**
     * Write all secondary state to primary
     */
    const exportedNonDigitalContentFiles = exportedFiles.filter((file) =>
      models.File.NonDigitalContentTypes.includes(file.type)
    )
    const exportedDigitalContentFiles = exportedFiles.filter((file) =>
      models.File.DigitalContentTypes.includes(file.type)
    )
    const transaction = await models.sequelize.transaction()
    await models.CNodeUser.create({ ...exportedCnodeUser }, { transaction })
    await models.ClockRecord.bulkCreate(exportedClockRecords, { transaction })
    await models.File.bulkCreate(exportedNonDigitalContentFiles, { transaction })
    await models.ColivingUser.bulkCreate(exportedColivingUsers, { transaction })
    await models.File.bulkCreate(exportedDigitalContentFiles, { transaction })
    await models.DigitalContent.bulkCreate(exportedDigitalContents, { transaction })
    await transaction.commit()

    /**
     * Confirm user state has updated
     */
    const { cnodeUser: localCNodeUserAfterWrite } = await fetchDBStateForWallet(
      USER_1_WALLET
    )
    assert.deepStrictEqual(
      localCNodeUserAfterWrite.clock,
      exportedCnodeUser.clock
    )

    /**
     * Sync primary from secondary
     */
    await primarySyncFromSecondaryStub({
      serviceRegistry: serviceRegistryMock,
      secondary: SECONDARY,
      wallet: USER_1_WALLET
    })

    /**
     * Verify DB state after sync
     */
    const exportedUserData = {
      exportedCnodeUser,
      exportedColivingUsers,
      exportedDigitalContents,
      exportedFiles,
      exportedClockRecords
    }
    await assertFullUserStateEquality(USER_1_WALLET, exportedUserData)
  })

  it('Primary correctly syncs from secondary when primary has superset of secondary state', async function () {
    const {
      exportObj,
      cnodeUser: exportedCnodeUser,
      colivingUsers: exportedColivingUsers,
      digitalContents: exportedDigitalContents,
      files: exportedFiles,
      clockRecords: exportedClockRecords
    } = unpackExportDataFromFile(exportFilePath)

    setupExportMock(SECONDARY, exportObj)
    setupIPFSRouteMocks()

    /**
     * Confirm local user state is empty initially
     */
    const { cnodeUser: localCNodeUserInitial } = await fetchDBStateForWallet(
      USER_1_WALLET
    )
    assert.deepStrictEqual(localCNodeUserInitial, null)

    /**
     * Write all secondary state to primary
     */
    const exportedNonDigitalContentFiles = exportedFiles.filter((file) =>
      models.File.NonDigitalContentTypes.includes(file.type)
    )
    const exportedDigitalContentFiles = exportedFiles.filter((file) =>
      models.File.DigitalContentTypes.includes(file.type)
    )
    const transaction = await models.sequelize.transaction()
    const cnodeUser = await models.CNodeUser.create(exportedCnodeUser, {
      returning: true,
      transaction
    })
    await models.ClockRecord.bulkCreate(exportedClockRecords, { transaction })
    await models.File.bulkCreate(exportedNonDigitalContentFiles, { transaction })
    await models.ColivingUser.bulkCreate(exportedColivingUsers, { transaction })
    await models.File.bulkCreate(exportedDigitalContentFiles, { transaction })
    await models.DigitalContent.bulkCreate(exportedDigitalContents, { transaction })
    await transaction.commit()

    /**
     * Confirm user state has updated
     */
    const { cnodeUser: localCNodeUserAfterWrite } = await fetchDBStateForWallet(
      USER_1_WALLET
    )
    assert.deepStrictEqual(
      localCNodeUserAfterWrite.clock,
      exportedCnodeUser.clock
    )

    // Add some more local user state
    await updateUser(USER_1_ID, cnodeUser.cnodeUserUUID)
    const additionalClockRecords = 1

    /**
     * Confirm user state has updated
     */
    const { cnodeUser: localCNodeUserAfterCreateUser } =
      await fetchDBStateForWallet(USER_1_WALLET)
    assert.deepStrictEqual(
      localCNodeUserAfterCreateUser.clock,
      exportedCnodeUser.clock + additionalClockRecords
    )

    const {
      cnodeUser: localInitialCNodeUser,
      colivingUsers: localInitialColivingUsers,
      digitalContents: localInitialDigitalContents,
      files: localInitialFiles,
      clockRecords: localInitialClockRecords
    } = await fetchDBStateForWallet(USER_1_WALLET)

    /**
     * Sync primary from secondary
     */
    await primarySyncFromSecondaryStub({
      serviceRegistry: serviceRegistryMock,
      secondary: SECONDARY,
      wallet: USER_1_WALLET
    })

    /**
     * Verify DB state after sync is identical to DB state before sync !!!
     */

    const {
      cnodeUser: localFinalCNodeUser,
      colivingUsers: localFinalColivingUsers,
      digitalContents: localFinalDigitalContents,
      files: localFinalFiles,
      clockRecords: localFinalClockRecords
    } = await fetchDBStateForWallet(USER_1_WALLET)

    assert.deepStrictEqual(localFinalCNodeUser, localInitialCNodeUser)

    assertTableEquality(localFinalColivingUsers, localInitialColivingUsers, [])

    assertTableEquality(localFinalDigitalContents, localInitialDigitalContents, [])

    assertTableEquality(localFinalFiles, localInitialFiles, [])

    assertTableEquality(localFinalClockRecords, localInitialClockRecords, [])
  })
})
