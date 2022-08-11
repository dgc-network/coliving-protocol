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
const { uploadTrack } = require('./lib/helpers')
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

const testAudioFilePath = path.resolve(__dirname, 'testTrack.mp3')

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

  it('should expose the proper tracks if added', async function () {
    const expectedIds = [1, 2, 3, 4, 5, 6, 7]
    const addTrackData = generateTimestampAndSignature(
      {
        type: BlacklistManager.getTypes().track,
        values: expectedIds
      },
      DELEGATE_PRIVATE_KEY
    )

    await request(app)
      .post('/blacklist/add')
      .query({
        type: BlacklistManager.getTypes().track,
        'values[]': expectedIds,
        signature: addTrackData.signature,
        timestamp: addTrackData.timestamp
      })
      .expect(200)

    await request(app)
      .get('/blacklist/tracks')
      .expect(200)
      .expect((resp) => {
        const actualIds = resp.body.data.values
        assert.deepStrictEqual(actualIds.length, expectedIds.length)

        _.isEqual(actualIds.sort(), expectedIds.sort())
      })
  })

  it('should expose empty list if no tracks are added', async function () {
    await request(app)
      .get('/blacklist/tracks')
      .expect(200)
      .expect((resp) => {
        const actualIds = resp.body.data.values
        assert.deepStrictEqual(actualIds, [])
      })
  })

  it('should return the proper userIds, trackIds, and segments', async () => {
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

    const addTrackData = generateTimestampAndSignature(
      {
        type: BlacklistManager.getTypes().track,
        values: ids
      },
      DELEGATE_PRIVATE_KEY
    )

    await request(app)
      .post('/blacklist/add')
      .query({
        type: BlacklistManager.getTypes().track,
        'values[]': ids,
        signature: addTrackData.signature,
        timestamp: addTrackData.timestamp
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
        assert.deepStrictEqual(resp.body.data.trackIds.length, 1)
        assert.deepStrictEqual(resp.body.data.trackIds[0], '43021')
        assert.deepStrictEqual(resp.body.data.userIds.length, 1)
        assert.deepStrictEqual(resp.body.data.userIds[0], '43021')
        assert.deepStrictEqual(resp.body.data.individualSegments.length, 1)
        assert.deepStrictEqual(resp.body.data.individualSegments[0], cids[0])
      })
  })

  it('should return the proper userIds, trackIds, and segments when sent by trusted notifier', async () => {
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

    const addTrackData = generateTimestampAndSignature(
      {
        type: BlacklistManager.getTypes().track,
        values: ids
      },
      trustedNotifierConfig.privateKey
    )

    await request(app)
      .post('/blacklist/add')
      .query({
        type: BlacklistManager.getTypes().track,
        'values[]': ids,
        signature: addTrackData.signature,
        timestamp: addTrackData.timestamp
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
        assert.deepStrictEqual(resp.body.data.trackIds.length, 1)
        assert.deepStrictEqual(resp.body.data.trackIds[0], '43021')
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

  it('should add track type and id to db and redis', async () => {
    const ids = [Utils.getRandomInt(MAX_ID)]
    const type = BlacklistManager.getTypes().track
    const { signature, timestamp } = generateTimestampAndSignature(
      { type, values: ids },
      DELEGATE_PRIVATE_KEY
    )

    await request(app)
      .post('/blacklist/add')
      .query({ type, 'values[]': ids, timestamp, signature })
      .expect(200)

    const track = await models.ContentBlacklist.findOne({
      where: {
        value: {
          [models.Sequelize.Op.in]: ids.map((id) => id.toString())
        },
        type
      }
    })
    assert.deepStrictEqual(track.value, ids[0].toString())
    assert.deepStrictEqual(track.type, type)
    assert.deepStrictEqual(
      await BlacklistManager.trackIdIsInBlacklist(track.value),
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

  it('should remove track type and id from db and redis', async () => {
    const ids = [Utils.getRandomInt(MAX_ID)]
    const type = BlacklistManager.getTypes().track
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

    const track = await models.ContentBlacklist.findOne({
      where: {
        value: {
          [models.Sequelize.Op.in]: ids.map((id) => id.toString())
        },
        type
      }
    })
    assert.deepStrictEqual(track, null)
    assert.deepStrictEqual(
      await BlacklistManager.trackIdIsInBlacklist(ids[0]),
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

  it('should return success when removing a track that does not exist', async () => {
    const ids = [Utils.getRandomInt(MAX_ID)]
    const type = BlacklistManager.getTypes().track
    const { signature, timestamp } = generateTimestampAndSignature(
      { type, values: ids },
      DELEGATE_PRIVATE_KEY
    )

    await request(app)
      .post('/blacklist/remove')
      .query({ type, 'values[]': ids, timestamp, signature })
      .expect(200)

    const track = await models.ContentBlacklist.findOne({
      where: {
        value: {
          [models.Sequelize.Op.in]: ids.map((id) => id.toString())
        },
        type
      }
    })
    assert.deepStrictEqual(track, null)
    assert.deepStrictEqual(
      await BlacklistManager.trackIdIsInBlacklist(ids[0]),
      0
    )
  })

  it('should ignore duplicate add for track', async () => {
    const ids = [Utils.getRandomInt(MAX_ID)]
    const type = BlacklistManager.getTypes().track
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

    const tracks = await models.ContentBlacklist.findAll({
      where: {
        value: {
          [models.Sequelize.Op.in]: ids.map((id) => id.toString())
        },
        type
      }
    })
    assert.deepStrictEqual(tracks.length, 1)
    const track = tracks[0]
    assert.deepStrictEqual(track.value, ids[0].toString())
    assert.deepStrictEqual(track.type, type)
    assert.deepStrictEqual(
      await BlacklistManager.trackIdIsInBlacklist(track.value),
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

  it('should only blacklist partial track ids list if only some ids are found', async () => {
    const ids = [Utils.getRandomInt(MAX_ID), Utils.getRandomInt(MAX_ID)]
    libsMock.Track.getTracks.returns([{ track_id: ids[0] }]) // only user @ index 0 is found
    const type = BlacklistManager.getTypes().track
    const { signature, timestamp } = generateTimestampAndSignature(
      { type, values: ids },
      DELEGATE_PRIVATE_KEY
    )

    await request(app)
      .post('/blacklist/add')
      .query({ type, 'values[]': ids, timestamp, signature })
      .expect(200)

    // Ensure only one track was added to the blacklist
    const tracks = await models.ContentBlacklist.findAll({
      where: {
        value: { [models.Sequelize.Op.in]: ids.map((id) => id.toString()) },
        type
      }
    })

    assert.deepStrictEqual(tracks.length, 1)
    const track = tracks[0]
    assert.deepStrictEqual(track.value, ids[0].toString())
    assert.deepStrictEqual(track.type, type)
    assert.deepStrictEqual(
      await BlacklistManager.trackIdIsInBlacklist(track.value),
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

  it("should throw an error if delegate private key does not match that of the creator node's", async () => {
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
    const type = BlacklistManager.getTypes().track

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
    // Create user and upload track
    const data = await createUserAndUploadTrack()
    const trackId = data.track.blockchainId
    const ids = [trackId]

    // Blacklist trackId
    const type = BlacklistManager.getTypes().user
    const { signature, timestamp } = generateTimestampAndSignature(
      { type, values: ids },
      DELEGATE_PRIVATE_KEY
    )
    await request(app)
      .post('/blacklist/add')
      .query({ type, 'values[]': ids, signature, timestamp })
      .expect(200)

    // Hit /ipfs/:CID route for all track CIDs and ensure error response is returned
    await Promise.all(
      data.track.trackSegments.map((segment) =>
        request(app)
          .get(`/ipfs/${segment.multihash}`)
          .query({ trackId })
          .expect(200)
      )
    )

    // TODO: add remove and test that the segments are unblacklisted
  })

  it('should throw an error when adding a track id to the blacklist, and streaming /ipfs/:CID without the trackId query string', async () => {
    // Create user and upload track
    const data = await createUserAndUploadTrack()
    const trackId = data.track.blockchainId
    const ids = [trackId]

    // Blacklist trackId
    const type = BlacklistManager.getTypes().track
    const { signature, timestamp } = generateTimestampAndSignature(
      { type, values: ids },
      DELEGATE_PRIVATE_KEY
    )
    await request(app)
      .post('/blacklist/add')
      .query({ type, 'values[]': ids, signature, timestamp })
      .expect(200)

    // Hit /ipfs/:CID route for all track CIDs and ensure error response is returned because no trackId was passed
    await Promise.all(
      data.track.trackSegments.map((segment) =>
        request(app).get(`/ipfs/${segment.multihash}`).expect(403)
      )
    )
  })

  it('should err when blacklisting track, and streaming /ipfs/:CID?trackId=<blacklistedTrackId>, then pass after removing from BL and streaming again', async () => {
    // Create user and upload track
    const data = await createUserAndUploadTrack()
    const trackId = data.track.blockchainId
    const ids = [trackId]

    // Blacklist trackId
    const type = BlacklistManager.getTypes().track
    const { signature, timestamp } = generateTimestampAndSignature(
      { type, values: ids },
      DELEGATE_PRIVATE_KEY
    )
    await request(app)
      .post('/blacklist/add')
      .query({ type, 'values[]': ids, signature, timestamp })
      .expect(200)

    // Hit /ipfs/:CID route for all track CIDs and ensure error response is returned
    await Promise.all(
      data.track.trackSegments.map((segment) =>
        request(app)
          .get(`/ipfs/${segment.multihash}`)
          .query({ trackId: data.track.blockchainId })
          .expect(403)
      )
    )

    await request(app)
      .post('/blacklist/remove')
      .query({ type, 'values[]': ids, signature, timestamp })
      .expect(200)

    // After removing from blacklist, track should be streamable
    await Promise.all(
      data.track.trackSegments.map((segment) =>
        request(app)
          .get(`/ipfs/${segment.multihash}`)
          .query({ trackId })
          .expect(200)
      )
    )
  })

  it('should throw an error when adding a track id to the blacklist, and streaming /ipfs/:CID?trackId=<trackIdThatDoesntContainCID>', async () => {
    // Create user and upload track
    const data = await createUserAndUploadTrack()
    const trackId = data.track.blockchainId
    const ids = [trackId]

    // Blacklist trackId
    const type = BlacklistManager.getTypes().track
    const { signature, timestamp } = generateTimestampAndSignature(
      { type, values: ids },
      DELEGATE_PRIVATE_KEY
    )
    await request(app)
      .post('/blacklist/add')
      .query({ type, 'values[]': ids, signature, timestamp })
      .expect(200)

    // Hit /ipfs/:CID route for all track CIDs and ensure error response is returned
    await Promise.all(
      data.track.trackSegments.map((segment) =>
        request(app)
          .get(`/ipfs/${segment.multihash}`)
          .query({ trackId: 1234 })
          .expect(403)
      )
    )
  })

  // TODO: fix :(
  it('should not throw an error when streaming a blacklisted CID of a non-blacklisted track at /ipfs/:CID?trackId=<trackIdOfNonBlacklistedTrack>', async () => {
    // Create user and upload track
    const track1 = await createUserAndUploadTrack()
    const track2 = await createUserAndUploadTrack({
      inputUserId: 2,
      trackId: 2,
      pubKey: '0x3f8f51ed837b15af580eb96cee740c723d340e7f'
    })
    const ids = [track1.track.blockchainId]

    // Blacklist trackId
    const type = BlacklistManager.getTypes().track
    const { signature, timestamp } = generateTimestampAndSignature(
      { type, values: ids },
      DELEGATE_PRIVATE_KEY
    )
    await request(app)
      .post('/blacklist/add')
      .query({ type, 'values[]': ids, signature, timestamp })
      .expect(200)

    // Hit /ipfs/:CID route for all track CIDs and ensure no error response is returned
    await Promise.all(
      track2.track.trackSegments.map((segment) =>
        request(app)
          .get(`/ipfs/${segment.multihash}`)
          .query({ trackId: track2.track.blockchainId })
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

  it('should throw an error if track id does not exist', async () => {
    libsMock.Track.getTracks.returns([])
    const ids = [Utils.getRandomInt(MAX_ID)]
    const type = BlacklistManager.getTypes().track
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

  it('should add the relevant CIDs to redis when adding a type TRACK to redis', async () => {
    // Create user and upload track
    const data = await createUserAndUploadTrack()
    const trackId = data.track.blockchainId
    const ids = [trackId]

    // Blacklist trackId
    const type = BlacklistManager.getTypes().track
    const { signature, timestamp } = generateTimestampAndSignature(
      { type, values: ids },
      DELEGATE_PRIVATE_KEY
    )
    await request(app)
      .post('/blacklist/add')
      .query({ type, 'values[]': ids, signature, timestamp })
      .expect(200)

    // Hit /ipfs/:CID route for all track CIDs and ensure error response is returned because no trackId was passed
    let blacklistedCIDs = await BlacklistManager.getAllCIDs()
    blacklistedCIDs = new Set(blacklistedCIDs)
    for (const segment of data.track.trackSegments) {
      assert.deepStrictEqual(blacklistedCIDs.has(segment.multihash), true)
    }
  })

  /** Helper setup method to test ContentBlacklist.  */
  async function createUserAndUploadTrack(
    { inputUserId, trackId, pubKey } = {
      inputUserId: userId,
      trackId: Utils.getRandomInt(MAX_ID),
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

    // Upload a track
    const trackUploadResponse = await uploadTrack(
      testAudioFilePath,
      cnodeUserUUID,
      mockServiceRegistry.blacklistManager
    )

    const {
      transcodedTrackUUID,
      track_segments: trackSegments,
      source_file: sourceFile
    } = trackUploadResponse

    // set track metadata
    const trackMetadata = {
      test: 'field1',
      owner_id: inputUserId,
      track_segments: trackSegments
    }
    const {
      body: {
        data: { metadataFileUUID: trackMetadataFileUUID }
      }
    } = await request(app)
      .post('/tracks/metadata')
      .set('X-Session-ID', sessionToken)
      .set('User-Id', inputUserId)
      .set('Enforce-Write-Quorum', false)
      .send({ metadata: trackMetadata, source_file: sourceFile })
    // associate track metadata with track
    await request(app)
      .post('/tracks')
      .set('X-Session-ID', sessionToken)
      .set('User-Id', inputUserId)
      .send({
        blockchainTrackId: trackId,
        blockNumber: 10,
        metadataFileUUID: trackMetadataFileUUID,
        transcodedTrackUUID
      })

    // Return user and some track data
    return { cnodeUser, track: { trackSegments, blockchainId: trackId } }
  }
})

// Setup libs mock according to ContentBlacklist needs by using libsMock as the base
const setupLibsMock = (libsMock) => {
  libsMock = getLibsMock()

  delete libsMock.User.getUsers.atMost
  libsMock.User.getUsers.callsFake((limit, offset, ids) => {
    // getUsers() is used in creating user/uploading track flow.
    // setting ids to dummy value allows for above flows to work
    if (!ids) ids = [0]
    const resp = ids.map((id) => {
      return {
        creator_node_endpoint: 'http://localhost:5000',
        blocknumber: 10,
        track_blocknumber: 10,
        user_id: id
      }
    })

    return resp
  })

  libsMock.Track = { getTracks: sinon.mock() }
  libsMock.Track.getTracks.callsFake((limit, offset, ids) => {
    return ids.map((id) => {
      return {
        track_id: id
      }
    })
  })
  libsMock.Track.getTracks.atLeast(0)
  return libsMock
}
