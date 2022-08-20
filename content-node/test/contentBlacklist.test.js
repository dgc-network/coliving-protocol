const assert = require('assert')
const request = require('supertest')
const sinon = require('sinon')
const path = require('path')
const _ = require('lodash')

const Utils = require('../src/utils')
const BlacklistManager = require('../src/blacklistManager')
const models = require('../src/models')
const redis = require('../src/redis')
const { generateTimestampAndSignature } = require('../src/apiSigning')

const { getApp } = require('./lib/app')
const { getLibsMock } = require('./lib/libsMock')
const {
  createStarterCNodeUser,
  getCNodeUser,
  destroyUsers
} = require('./lib/dataSeeds')
const { generateRandomCID } = require('./lib/utils')
const { uploadAgreement } = require('./lib/helpers')
const { restartBlacklistManager } = require('./lib/blacklistManager')

// Dummy keys from circle config.yml
const DELEGATE_OWNER_WALLET = '0x1eC723075E67a1a2B6969dC5CfF0C6793cb36D25'
const DELEGATE_PRIVATE_KEY =
  '0xdb527e4d4a2412a443c17e1666764d3bba43e89e61129a35f9abc337ec170a5d'
const MAX_ID = 1000

// throwaway wallet pair to set as notifier + sign for the request
const trustedNotifierConfig = {
  wallet: '0xb01831D0bD5A6eB083C0C4412EC91062B79Bed89',
  privateKey: 'fb0486224fc0221d1c23c00379cb10ce5f99aff2b0e5c1afd828c08b57f21429'
}

const testAudioFilePath = path.resolve(__dirname, 'testAgreement.mp3')

describe('test ContentBlacklist', function () {
  let app, server, libsMock, mockServiceRegistry, userId

  beforeEach(async () => {
    libsMock = setupLibsMock(libsMock)

    process.env.delegateOwnerWallet = DELEGATE_OWNER_WALLET
    process.env.delegatePrivateKey = DELEGATE_PRIVATE_KEY

    userId = 1

    const appInfo = await getApp(libsMock, BlacklistManager, null, userId)
    await BlacklistManager.init()

    app = appInfo.app
    server = appInfo.server
    mockServiceRegistry = appInfo.mockServiceRegistry
  })

  afterEach(async () => {
    // Reinitialize BlacklistManager and clear redis state
    await restartBlacklistManager(redis)

    // clear TrustedNotifier wallet key
    mockServiceRegistry.trustedNotifierManager.trustedNotifierData.wallet = null

    sinon.restore()
    await destroyUsers()
    await server.close()
  })

  after(async () => {
    await redis.flushall()
  })

  it('should expose the proper agreements if added', async function () {
    const expectedIds = [1, 2, 3, 4, 5, 6, 7]
    const addAgreementData = generateTimestampAndSignature(
      {
        type: BlacklistManager.getTypes().agreement,
        values: expectedIds
      },
      DELEGATE_PRIVATE_KEY
    )

    await request(app)
      .post('/blacklist/add')
      .query({
        type: BlacklistManager.getTypes().agreement,
        'values[]': expectedIds,
        signature: addAgreementData.signature,
        timestamp: addAgreementData.timestamp
      })
      .expect(200)

    await request(app)
      .get('/blacklist/agreements')
      .expect(200)
      .expect((resp) => {
        const actualIds = resp.body.data.values
        assert.deepStrictEqual(actualIds.length, expectedIds.length)

        _.isEqual(actualIds.sort(), expectedIds.sort())
      })
  })

  it('should expose empty list if no agreements are added', async function () {
    await request(app)
      .get('/blacklist/agreements')
      .expect(200)
      .expect((resp) => {
        const actualIds = resp.body.data.values
        assert.deepStrictEqual(actualIds, [])
      })
  })

  it('should return the proper userIds, agreementIds, and segments', async () => {
    const ids = [43021]
    const addUserData = generateTimestampAndSignature(
      {
        type: BlacklistManager.getTypes().user,
        values: ids
      },
      DELEGATE_PRIVATE_KEY
    )

    await request(app)
      .post('/blacklist/add')
      .query({
        type: BlacklistManager.getTypes().user,
        'values[]': ids,
        signature: addUserData.signature,
        timestamp: addUserData.timestamp
      })
      .expect(200)

    const addAgreementData = generateTimestampAndSignature(
      {
        type: BlacklistManager.getTypes().agreement,
        values: ids
      },
      DELEGATE_PRIVATE_KEY
    )

    await request(app)
      .post('/blacklist/add')
      .query({
        type: BlacklistManager.getTypes().agreement,
        'values[]': ids,
        signature: addAgreementData.signature,
        timestamp: addAgreementData.timestamp
      })
      .expect(200)

    const cids = [generateRandomCID()]
    const addCIDData = generateTimestampAndSignature(
      {
        type: BlacklistManager.getTypes().cid,
        values: cids
      },
      DELEGATE_PRIVATE_KEY
    )

    await request(app)
      .post('/blacklist/add')
      .query({
        type: BlacklistManager.getTypes().cid,
        'values[]': cids,
        signature: addCIDData.signature,
        timestamp: addCIDData.timestamp
      })
      .expect(200)

    await request(app)
      .get('/blacklist')
      .expect(200)
      .expect((resp) => {
        assert.deepStrictEqual(resp.body.data.agreementIds.length, 1)
        assert.deepStrictEqual(resp.body.data.agreementIds[0], '43021')
        assert.deepStrictEqual(resp.body.data.userIds.length, 1)
        assert.deepStrictEqual(resp.body.data.userIds[0], '43021')
        assert.deepStrictEqual(resp.body.data.individualSegments.length, 1)
        assert.deepStrictEqual(resp.body.data.individualSegments[0], cids[0])
      })
  })

  it('should return the proper userIds, agreementIds, and segments when sent by trusted notifier', async () => {
    mockServiceRegistry.trustedNotifierManager.trustedNotifierData.wallet =
      trustedNotifierConfig.wallet

    const ids = [43021]
    const addUserData = generateTimestampAndSignature(
      {
        type: BlacklistManager.getTypes().user,
        values: ids
      },
      trustedNotifierConfig.privateKey
    )

    await request(app)
      .post('/blacklist/add')
      .query({
        type: BlacklistManager.getTypes().user,
        'values[]': ids,
        signature: addUserData.signature,
        timestamp: addUserData.timestamp
      })
      .expect(200)

    const addAgreementData = generateTimestampAndSignature(
      {
        type: BlacklistManager.getTypes().agreement,
        values: ids
      },
      trustedNotifierConfig.privateKey
    )

    await request(app)
      .post('/blacklist/add')
      .query({
        type: BlacklistManager.getTypes().agreement,
        'values[]': ids,
        signature: addAgreementData.signature,
        timestamp: addAgreementData.timestamp
      })
      .expect(200)

    const cids = [generateRandomCID()]
    const addCIDData = generateTimestampAndSignature(
      {
        type: BlacklistManager.getTypes().cid,
        values: cids
      },
      trustedNotifierConfig.privateKey
    )

    await request(app)
      .post('/blacklist/add')
      .query({
        type: BlacklistManager.getTypes().cid,
        'values[]': cids,
        signature: addCIDData.signature,
        timestamp: addCIDData.timestamp
      })
      .expect(200)

    await request(app)
      .get('/blacklist')
      .expect(200)
      .expect((resp) => {
        assert.deepStrictEqual(resp.body.data.agreementIds.length, 1)
        assert.deepStrictEqual(resp.body.data.agreementIds[0], '43021')
        assert.deepStrictEqual(resp.body.data.userIds.length, 1)
        assert.deepStrictEqual(resp.body.data.userIds[0], '43021')
        assert.deepStrictEqual(resp.body.data.individualSegments.length, 1)
        assert.deepStrictEqual(resp.body.data.individualSegments[0], cids[0])
      })
  })

  it('should add user type and id to db and redis', async () => {
    const ids = [Utils.getRandomInt(MAX_ID)]
    const type = BlacklistManager.getTypes().user
    const { signature, timestamp } = generateTimestampAndSignature(
      { type, values: ids },
      DELEGATE_PRIVATE_KEY
    )

    await request(app)
      .post('/blacklist/add')
      .query({ type, 'values[]': ids, timestamp, signature })
      .expect(200)

    const user = await models.ContentBlacklist.findOne({
      where: {
        value: { [models.Sequelize.Op.in]: ids.map((id) => id.toString()) },
        type
      }
    })

    assert.deepStrictEqual(user.value, ids[0].toString())
    assert.deepStrictEqual(user.type, type)
    assert.deepStrictEqual(
      await BlacklistManager.userIdIsInBlacklist(user.value),
      1
    )
  })

  it('should add agreement type and id to db and redis', async () => {
    const ids = [Utils.getRandomInt(MAX_ID)]
    const type = BlacklistManager.getTypes().agreement
    const { signature, timestamp } = generateTimestampAndSignature(
      { type, values: ids },
      DELEGATE_PRIVATE_KEY
    )

    await request(app)
      .post('/blacklist/add')
      .query({ type, 'values[]': ids, timestamp, signature })
      .expect(200)

    const agreement = await models.ContentBlacklist.findOne({
      where: {
        value: {
          [models.Sequelize.Op.in]: ids.map((id) => id.toString())
        },
        type
      }
    })
    assert.deepStrictEqual(agreement.value, ids[0].toString())
    assert.deepStrictEqual(agreement.type, type)
    assert.deepStrictEqual(
      await BlacklistManager.agreementIdIsInBlacklist(agreement.value),
      1
    )
  })

  it('should remove user type and id from db and redis', async () => {
    const ids = [Utils.getRandomInt(MAX_ID)]
    const type = BlacklistManager.getTypes().user
    const { signature, timestamp } = generateTimestampAndSignature(
      { type, values: ids },
      DELEGATE_PRIVATE_KEY
    )

    await request(app)
      .post('/blacklist/add')
      .query({ type, 'values[]': ids, timestamp, signature })
      .expect(200)

    await request(app)
      .post('/blacklist/remove')
      .query({ type, 'values[]': ids, timestamp, signature })
      .expect(200)

    const user = await models.ContentBlacklist.findOne({
      where: {
        value: {
          [models.Sequelize.Op.in]: ids.map((id) => id.toString())
        },
        type
      }
    })
    assert.deepStrictEqual(user, null)
    assert.deepStrictEqual(
      await BlacklistManager.userIdIsInBlacklist(ids[0]),
      0
    )
  })

  it('should remove agreement type and id from db and redis', async () => {
    const ids = [Utils.getRandomInt(MAX_ID)]
    const type = BlacklistManager.getTypes().agreement
    const { signature, timestamp } = generateTimestampAndSignature(
      { type, values: ids },
      DELEGATE_PRIVATE_KEY
    )

    await request(app)
      .post('/blacklist/add')
      .query({ type, 'values[]': ids, timestamp, signature })
      .expect(200)

    await request(app)
      .post('/blacklist/remove')
      .query({ type, 'values[]': ids, timestamp, signature })
      .expect(200)

    const agreement = await models.ContentBlacklist.findOne({
      where: {
        value: {
          [models.Sequelize.Op.in]: ids.map((id) => id.toString())
        },
        type
      }
    })
    assert.deepStrictEqual(agreement, null)
    assert.deepStrictEqual(
      await BlacklistManager.agreementIdIsInBlacklist(ids[0]),
      0
    )
  })

  it('should return success when removing a user that does not exist', async () => {
    const ids = [Utils.getRandomInt(MAX_ID)]
    const type = BlacklistManager.getTypes().user
    const { signature, timestamp } = generateTimestampAndSignature(
      { type, values: ids },
      DELEGATE_PRIVATE_KEY
    )

    await request(app)
      .post('/blacklist/remove')
      .query({ type, 'values[]': ids, timestamp, signature })
      .expect(200)

    const user = await models.ContentBlacklist.findOne({
      where: {
        value: {
          [models.Sequelize.Op.in]: ids.map((id) => id.toString())
        },
        type
      }
    })
    assert.deepStrictEqual(user, null)
    assert.deepStrictEqual(
      await BlacklistManager.userIdIsInBlacklist(ids[0]),
      0
    )
  })

  it('should return success when removing a agreement that does not exist', async () => {
    const ids = [Utils.getRandomInt(MAX_ID)]
    const type = BlacklistManager.getTypes().agreement
    const { signature, timestamp } = generateTimestampAndSignature(
      { type, values: ids },
      DELEGATE_PRIVATE_KEY
    )

    await request(app)
      .post('/blacklist/remove')
      .query({ type, 'values[]': ids, timestamp, signature })
      .expect(200)

    const agreement = await models.ContentBlacklist.findOne({
      where: {
        value: {
          [models.Sequelize.Op.in]: ids.map((id) => id.toString())
        },
        type
      }
    })
    assert.deepStrictEqual(agreement, null)
    assert.deepStrictEqual(
      await BlacklistManager.agreementIdIsInBlacklist(ids[0]),
      0
    )
  })

  it('should ignore duplicate add for agreement', async () => {
    const ids = [Utils.getRandomInt(MAX_ID)]
    const type = BlacklistManager.getTypes().agreement
    const { signature, timestamp } = generateTimestampAndSignature(
      { type, values: ids },
      DELEGATE_PRIVATE_KEY
    )

    await request(app)
      .post('/blacklist/add')
      .query({ type, 'values[]': ids, timestamp, signature })
      .expect(200)

    await request(app)
      .post('/blacklist/add')
      .query({ type, 'values[]': ids, timestamp, signature })
      .expect(200)

    const agreements = await models.ContentBlacklist.findAll({
      where: {
        value: {
          [models.Sequelize.Op.in]: ids.map((id) => id.toString())
        },
        type
      }
    })
    assert.deepStrictEqual(agreements.length, 1)
    const agreement = agreements[0]
    assert.deepStrictEqual(agreement.value, ids[0].toString())
    assert.deepStrictEqual(agreement.type, type)
    assert.deepStrictEqual(
      await BlacklistManager.agreementIdIsInBlacklist(agreement.value),
      1
    )
  })

  it('should ignore duplicate add for user', async () => {
    const ids = [Utils.getRandomInt(MAX_ID)]
    const type = BlacklistManager.getTypes().user
    const { signature, timestamp } = generateTimestampAndSignature(
      { type, values: ids },
      DELEGATE_PRIVATE_KEY
    )

    await request(app)
      .post('/blacklist/add')
      .query({ type, 'values[]': ids, timestamp, signature })
      .expect(200)

    await request(app)
      .post('/blacklist/add')
      .query({ type, 'values[]': ids, timestamp, signature })
      .expect(200)

    const users = await models.ContentBlacklist.findAll({
      where: {
        value: {
          [models.Sequelize.Op.in]: ids.map((id) => id.toString())
        },
        type
      }
    })
    assert.deepStrictEqual(users.length, 1)
    const user = users[0]
    assert.deepStrictEqual(user.value, ids[0].toString())
    assert.deepStrictEqual(user.type, type)
    assert.deepStrictEqual(
      await BlacklistManager.userIdIsInBlacklist(user.value),
      1
    )
  })

  it('should only blacklist partial user ids list if only some ids are found', async () => {
    const ids = [Utils.getRandomInt(MAX_ID), Utils.getRandomInt(MAX_ID)]
    libsMock.User.getUsers.returns([{ user_id: ids[0] }]) // only user @ index 0 is found
    const type = BlacklistManager.getTypes().user
    const { signature, timestamp } = generateTimestampAndSignature(
      { type, values: ids },
      DELEGATE_PRIVATE_KEY
    )

    await request(app)
      .post('/blacklist/add')
      .query({ type, 'values[]': ids, timestamp, signature })
      .expect(200)

    // Ensure only one user was added to the blacklist
    const users = await models.ContentBlacklist.findAll({
      where: {
        value: { [models.Sequelize.Op.in]: ids.map((id) => id.toString()) },
        type
      }
    })

    assert.deepStrictEqual(users.length, 1)
    const user = users[0]
    assert.deepStrictEqual(user.value, ids[0].toString())
    assert.deepStrictEqual(user.type, type)
    assert.deepStrictEqual(
      await BlacklistManager.userIdIsInBlacklist(user.value),
      1
    )
  })

  it('should only blacklist partial agreement ids list if only some ids are found', async () => {
    const ids = [Utils.getRandomInt(MAX_ID), Utils.getRandomInt(MAX_ID)]
    libsMock.Agreement.getAgreements.returns([{ agreement_id: ids[0] }]) // only user @ index 0 is found
    const type = BlacklistManager.getTypes().agreement
    const { signature, timestamp } = generateTimestampAndSignature(
      { type, values: ids },
      DELEGATE_PRIVATE_KEY
    )

    await request(app)
      .post('/blacklist/add')
      .query({ type, 'values[]': ids, timestamp, signature })
      .expect(200)

    // Ensure only one agreement was added to the blacklist
    const agreements = await models.ContentBlacklist.findAll({
      where: {
        value: { [models.Sequelize.Op.in]: ids.map((id) => id.toString()) },
        type
      }
    })

    assert.deepStrictEqual(agreements.length, 1)
    const agreement = agreements[0]
    assert.deepStrictEqual(agreement.value, ids[0].toString())
    assert.deepStrictEqual(agreement.type, type)
    assert.deepStrictEqual(
      await BlacklistManager.agreementIdIsInBlacklist(agreement.value),
      1
    )
  })

  it('should add cids to db and redis', async () => {
    const cids = [generateRandomCID()]
    const type = BlacklistManager.getTypes().cid
    const { signature, timestamp } = generateTimestampAndSignature(
      { type, values: cids },
      DELEGATE_PRIVATE_KEY
    )

    await request(app)
      .post('/blacklist/add')
      .query({ type, 'values[]': cids, timestamp, signature })
      .expect(200)

    const entry = await models.ContentBlacklist.findOne({
      where: {
        value: { [models.Sequelize.Op.in]: cids },
        type
      }
    })

    assert.deepStrictEqual(entry.value, cids[0])
    assert.deepStrictEqual(entry.type, type)
    assert.deepStrictEqual(await BlacklistManager.CIDIsInBlacklist(cids[0]), 1)
  })

  it('should remove cids from db and redis', async () => {
    const cids = [generateRandomCID()]
    const type = BlacklistManager.getTypes().cid
    const { signature, timestamp } = generateTimestampAndSignature(
      { type, values: cids },
      DELEGATE_PRIVATE_KEY
    )

    await request(app)
      .post('/blacklist/add')
      .query({ type, 'values[]': cids, timestamp, signature })
      .expect(200)

    await request(app)
      .post('/blacklist/remove')
      .query({ type, 'values[]': cids, timestamp, signature })
      .expect(200)

    const entry = await models.ContentBlacklist.findAll({
      where: {
        value: { [models.Sequelize.Op.in]: cids },
        type
      }
    })

    assert.deepStrictEqual(entry, [])
    assert.deepStrictEqual(await BlacklistManager.CIDIsInBlacklist(cids[0]), 0)
  })

  it("should throw an error if delegate private key does not match that of the content node's", async () => {
    const ids = [Utils.getRandomInt(MAX_ID)]
    const type = BlacklistManager.getTypes().user
    const BAD_KEY =
      '0xBADKEY4d4a2412a443c17e1666764d3bba43e89e61129a35f9abc337ec170a5d'

    const { signature, timestamp } = generateTimestampAndSignature(
      { type, values: ids },
      BAD_KEY
    )

    await request(app)
      .post('/blacklist/add')
      .query({ type, 'values[]': ids, timestamp, signature })
      .expect(401)
  })

  it('should throw an error if query params does not contain all necessary keys', async () => {
    const ids = [Utils.getRandomInt(MAX_ID)]
    const type = BlacklistManager.getTypes().agreement

    await request(app)
      .post('/blacklist/add')
      .query({ type, 'values[]': ids })
      .expect(400)

    await request(app)
      .post('/blacklist/remove')
      .query({ type, 'values[]': ids })
      .expect(400)
  })

  it('should throw an error if query params id and type are not proper', async () => {
    const improperIds = 'halsey'
    const type = 'is fantastic'
    const { signature, timestamp } = generateTimestampAndSignature(
      { type, values: improperIds },
      DELEGATE_PRIVATE_KEY
    )

    await request(app)
      .post('/blacklist/add')
      .query({ type, 'values[]': improperIds, signature, timestamp })
      .expect(400)

    await request(app)
      .post('/blacklist/remove')
      .query({ type, 'values[]': improperIds, signature, timestamp })
      .expect(400)
  })

  // TODO: need to consider the USER case UGHUAWIFEWHUIAWFHEWI
  it('should throw an error when adding an user id to the blacklist and streaming /ipfs/:CID route', async () => {
    // Create user and upload agreement
    const data = await createUserAndUploadAgreement()
    const agreementId = data.agreement.blockchainId
    const ids = [agreementId]

    // Blacklist agreementId
    const type = BlacklistManager.getTypes().user
    const { signature, timestamp } = generateTimestampAndSignature(
      { type, values: ids },
      DELEGATE_PRIVATE_KEY
    )
    await request(app)
      .post('/blacklist/add')
      .query({ type, 'values[]': ids, signature, timestamp })
      .expect(200)

    // Hit /ipfs/:CID route for all agreement CIDs and ensure error response is returned
    await Promise.all(
      data.agreement.agreementSegments.map((segment) =>
        request(app)
          .get(`/ipfs/${segment.multihash}`)
          .query({ agreementId })
          .expect(200)
      )
    )

    // TODO: add remove and test that the segments are unblacklisted
  })

  it('should throw an error when adding a agreement id to the blacklist, and streaming /ipfs/:CID without the agreementId query string', async () => {
    // Create user and upload agreement
    const data = await createUserAndUploadAgreement()
    const agreementId = data.agreement.blockchainId
    const ids = [agreementId]

    // Blacklist agreementId
    const type = BlacklistManager.getTypes().agreement
    const { signature, timestamp } = generateTimestampAndSignature(
      { type, values: ids },
      DELEGATE_PRIVATE_KEY
    )
    await request(app)
      .post('/blacklist/add')
      .query({ type, 'values[]': ids, signature, timestamp })
      .expect(200)

    // Hit /ipfs/:CID route for all agreement CIDs and ensure error response is returned because no agreementId was passed
    await Promise.all(
      data.agreement.agreementSegments.map((segment) =>
        request(app).get(`/ipfs/${segment.multihash}`).expect(403)
      )
    )
  })

  it('should err when blacklisting agreement, and streaming /ipfs/:CID?agreementId=<blacklistedAgreementId>, then pass after removing from BL and streaming again', async () => {
    // Create user and upload agreement
    const data = await createUserAndUploadAgreement()
    const agreementId = data.agreement.blockchainId
    const ids = [agreementId]

    // Blacklist agreementId
    const type = BlacklistManager.getTypes().agreement
    const { signature, timestamp } = generateTimestampAndSignature(
      { type, values: ids },
      DELEGATE_PRIVATE_KEY
    )
    await request(app)
      .post('/blacklist/add')
      .query({ type, 'values[]': ids, signature, timestamp })
      .expect(200)

    // Hit /ipfs/:CID route for all agreement CIDs and ensure error response is returned
    await Promise.all(
      data.agreement.agreementSegments.map((segment) =>
        request(app)
          .get(`/ipfs/${segment.multihash}`)
          .query({ agreementId: data.agreement.blockchainId })
          .expect(403)
      )
    )

    await request(app)
      .post('/blacklist/remove')
      .query({ type, 'values[]': ids, signature, timestamp })
      .expect(200)

    // After removing from blacklist, agreement should be streamable
    await Promise.all(
      data.agreement.agreementSegments.map((segment) =>
        request(app)
          .get(`/ipfs/${segment.multihash}`)
          .query({ agreementId })
          .expect(200)
      )
    )
  })

  it('should throw an error when adding a agreement id to the blacklist, and streaming /ipfs/:CID?agreementId=<agreementIdThatDoesntContainCID>', async () => {
    // Create user and upload agreement
    const data = await createUserAndUploadAgreement()
    const agreementId = data.agreement.blockchainId
    const ids = [agreementId]

    // Blacklist agreementId
    const type = BlacklistManager.getTypes().agreement
    const { signature, timestamp } = generateTimestampAndSignature(
      { type, values: ids },
      DELEGATE_PRIVATE_KEY
    )
    await request(app)
      .post('/blacklist/add')
      .query({ type, 'values[]': ids, signature, timestamp })
      .expect(200)

    // Hit /ipfs/:CID route for all agreement CIDs and ensure error response is returned
    await Promise.all(
      data.agreement.agreementSegments.map((segment) =>
        request(app)
          .get(`/ipfs/${segment.multihash}`)
          .query({ agreementId: 1234 })
          .expect(403)
      )
    )
  })

  // TODO: fix :(
  it('should not throw an error when streaming a blacklisted CID of a non-blacklisted agreement at /ipfs/:CID?agreementId=<agreementIdOfNonBlacklistedAgreement>', async () => {
    // Create user and upload agreement
    const agreement1 = await createUserAndUploadAgreement()
    const agreement2 = await createUserAndUploadAgreement({
      inputUserId: 2,
      agreementId: 2,
      pubKey: '0x3f8f51ed837b15af580eb96cee740c723d340e7f'
    })
    const ids = [agreement1.agreement.blockchainId]

    // Blacklist agreementId
    const type = BlacklistManager.getTypes().agreement
    const { signature, timestamp } = generateTimestampAndSignature(
      { type, values: ids },
      DELEGATE_PRIVATE_KEY
    )
    await request(app)
      .post('/blacklist/add')
      .query({ type, 'values[]': ids, signature, timestamp })
      .expect(200)

    // Hit /ipfs/:CID route for all agreement CIDs and ensure no error response is returned
    await Promise.all(
      agreement2.agreement.agreementSegments.map((segment) =>
        request(app)
          .get(`/ipfs/${segment.multihash}`)
          .query({ agreementId: agreement2.agreement.blockchainId })
          .expect(200)
      )
    )
  })

  it('should throw an error when adding a cid to the blacklist and streaming /ipfs/:CID', async () => {
    const cids = [generateRandomCID()]
    const type = BlacklistManager.getTypes().cid
    const { signature, timestamp } = generateTimestampAndSignature(
      { type, values: cids },
      DELEGATE_PRIVATE_KEY
    )

    await request(app)
      .post('/blacklist/add')
      .query({ type, 'values[]': cids, timestamp, signature })
      .expect(200)

    await request(app).get(`/ipfs/${cids[0]}`).expect(403)
  })

  it('should throw an error if user id does not exist', async () => {
    libsMock.User.getUsers.returns([])
    const ids = [Utils.getRandomInt(MAX_ID)]
    const type = BlacklistManager.getTypes().user
    const resp1 = generateTimestampAndSignature(
      { type, values: ids },
      DELEGATE_PRIVATE_KEY
    )

    await request(app)
      .post('/blacklist/add')
      .query({
        type,
        'values[]': ids,
        timestamp: resp1.timestamp,
        signature: resp1.signature
      })
      .expect(400)

    // Ensure works with multiple ids
    ids.push(Utils.getRandomInt(MAX_ID))
    const resp2 = generateTimestampAndSignature(
      { type, values: ids },
      DELEGATE_PRIVATE_KEY
    )

    await request(app)
      .post('/blacklist/add')
      .query({
        type,
        'values[]': ids,
        timestamp: resp2.timestamp,
        signature: resp2.signature
      })
      .expect(400)
  })

  it('should throw an error if agreement id does not exist', async () => {
    libsMock.Agreement.getAgreements.returns([])
    const ids = [Utils.getRandomInt(MAX_ID)]
    const type = BlacklistManager.getTypes().agreement
    const resp1 = generateTimestampAndSignature(
      { type, values: ids },
      DELEGATE_PRIVATE_KEY
    )

    await request(app)
      .post('/blacklist/add')
      .query({
        type,
        'values[]': ids,
        timestamp: resp1.timestamp,
        signature: resp1.signature
      })
      .expect(400)

    // Ensure works with multiple ids
    ids.push(Utils.getRandomInt(MAX_ID))
    const resp2 = generateTimestampAndSignature(
      { type, values: ids },
      DELEGATE_PRIVATE_KEY
    )

    await request(app)
      .post('/blacklist/add')
      .query({
        type,
        'values[]': ids,
        timestamp: resp2.timestamp,
        signature: resp2.signature
      })
      .expect(400)
  })

  it('should throw an error if disc prov is unable to lookup ids', async () => {
    libsMock.User.getUsers.returns([])
    const ids = [Utils.getRandomInt(MAX_ID)]
    const type = BlacklistManager.getTypes().user
    const resp1 = generateTimestampAndSignature(
      { type, values: ids },
      DELEGATE_PRIVATE_KEY
    )

    await request(app)
      .post('/blacklist/add')
      .query({
        type,
        'values[]': ids,
        timestamp: resp1.timestamp,
        signature: resp1.signature
      })
      .expect(400)

    // Ensure works with multiple ids
    ids.push(Utils.getRandomInt(MAX_ID))
    const resp2 = generateTimestampAndSignature(
      { type, values: ids },
      DELEGATE_PRIVATE_KEY
    )

    await request(app)
      .post('/blacklist/add')
      .query({
        type,
        'values[]': ids,
        timestamp: resp2.timestamp,
        signature: resp2.signature
      })
      .expect(400)
  })

  it('should throw an error if query params cids does not match the Qm... pattern', async () => {
    const cids = [
      'vicky was here',
      'and here too',
      Utils.getRandomInt(MAX_ID),
      '###%^&'
    ]
    const type = BlacklistManager.getTypes().cid
    const { timestamp, signature } = generateTimestampAndSignature(
      { type: BlacklistManager.getTypes().cid, values: cids },
      DELEGATE_PRIVATE_KEY
    )

    await request(app)
      .post('/blacklist/add')
      .query({
        type,
        'values[]': cids,
        timestamp,
        signature
      })
      .expect(400)
  })

  it('should add the relevant CIDs to redis when adding a type AGREEMENT to redis', async () => {
    // Create user and upload agreement
    const data = await createUserAndUploadAgreement()
    const agreementId = data.agreement.blockchainId
    const ids = [agreementId]

    // Blacklist agreementId
    const type = BlacklistManager.getTypes().agreement
    const { signature, timestamp } = generateTimestampAndSignature(
      { type, values: ids },
      DELEGATE_PRIVATE_KEY
    )
    await request(app)
      .post('/blacklist/add')
      .query({ type, 'values[]': ids, signature, timestamp })
      .expect(200)

    // Hit /ipfs/:CID route for all agreement CIDs and ensure error response is returned because no agreementId was passed
    let blacklistedCIDs = await BlacklistManager.getAllCIDs()
    blacklistedCIDs = new Set(blacklistedCIDs)
    for (const segment of data.agreement.agreementSegments) {
      assert.deepStrictEqual(blacklistedCIDs.has(segment.multihash), true)
    }
  })

  /** Helper setup method to test ContentBlacklist.  */
  async function createUserAndUploadAgreement(
    { inputUserId, agreementId, pubKey } = {
      inputUserId: userId,
      agreementId: Utils.getRandomInt(MAX_ID),
      pubKey: null
    }
  ) {
    // Create user
    let cnodeUserUUID, sessionToken
    if (!pubKey) {
      ;({ cnodeUserUUID, sessionToken } = await createStarterCNodeUser(
        inputUserId
      ))
    } else {
      ;({ cnodeUserUUID, sessionToken } = await createStarterCNodeUser(
        inputUserId,
        pubKey
      ))
    }
    const cnodeUser = await getCNodeUser(cnodeUserUUID)

    // Set user metadata
    const metadata = {
      metadata: {
        testField: 'testValue'
      }
    }
    const {
      body: {
        data: { metadataFileUUID }
      }
    } = await request(app)
      .post('/coliving_users/metadata')
      .set('X-Session-ID', sessionToken)
      .set('User-Id', inputUserId)
      .set('Enforce-Write-Quorum', false)
      .send(metadata)

    const associateRequest = {
      blockchainUserId: inputUserId,
      metadataFileUUID,
      blockNumber: 10
    }

    // Associate user with metadata
    await request(app)
      .post('/coliving_users/')
      .set('X-Session-ID', sessionToken)
      .set('User-Id', inputUserId)
      .send(associateRequest)

    // Upload a agreement
    const agreementUploadResponse = await uploadAgreement(
      testAudioFilePath,
      cnodeUserUUID,
      mockServiceRegistry.blacklistManager
    )

    const {
      transcodedAgreementUUID,
      agreement_segments: agreementSegments,
      source_file: sourceFile
    } = agreementUploadResponse

    // set agreement metadata
    const agreementMetadata = {
      test: 'field1',
      owner_id: inputUserId,
      agreement_segments: agreementSegments
    }
    const {
      body: {
        data: { metadataFileUUID: agreementMetadataFileUUID }
      }
    } = await request(app)
      .post('/agreements/metadata')
      .set('X-Session-ID', sessionToken)
      .set('User-Id', inputUserId)
      .set('Enforce-Write-Quorum', false)
      .send({ metadata: agreementMetadata, source_file: sourceFile })
    // associate agreement metadata with agreement
    await request(app)
      .post('/agreements')
      .set('X-Session-ID', sessionToken)
      .set('User-Id', inputUserId)
      .send({
        blockchainAgreementId: agreementId,
        blockNumber: 10,
        metadataFileUUID: agreementMetadataFileUUID,
        transcodedAgreementUUID
      })

    // Return user and some agreement data
    return { cnodeUser, agreement: { agreementSegments, blockchainId: agreementId } }
  }
})

// Setup libs mock according to ContentBlacklist needs by using libsMock as the base
const setupLibsMock = (libsMock) => {
  libsMock = getLibsMock()

  delete libsMock.User.getUsers.atMost
  libsMock.User.getUsers.callsFake((limit, offset, ids) => {
    // getUsers() is used in creating user/uploading agreement flow.
    // setting ids to dummy value allows for above flows to work
    if (!ids) ids = [0]
    const resp = ids.map((id) => {
      return {
        content_node_endpoint: 'http://localhost:5000',
        blocknumber: 10,
        agreement_blocknumber: 10,
        user_id: id
      }
    })

    return resp
  })

  libsMock.Agreement = { getAgreements: sinon.mock() }
  libsMock.Agreement.getAgreements.callsFake((limit, offset, ids) => {
    return ids.map((id) => {
      return {
        agreement_id: id
      }
    })
  })
  libsMock.Agreement.getAgreements.atLeast(0)
  return libsMock
}
