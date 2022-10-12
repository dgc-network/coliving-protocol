const request = require('supertest')
const fs = require('fs')
const path = require('path')
const assert = require('assert')
const sinon = require('sinon')
const uuid = require('uuid/v4')
const proxyquire = require('proxyquire')
const _ = require('lodash')

const config = require('../src/config')
const defaultConfig = require('../default-config.json')
const { libs } = require('@coliving/sdk')
const Utils = libs
const BlacklistManager = require('../src/blacklistManager')
const TranscodingQueue = require('../src/TranscodingQueue')
const models = require('../src/models')
const DiskManager = require('../src/diskManager')
const FileManager = require('../src/fileManager')
const DBManager = require('../src/dbManager.js')

const { getApp } = require('./lib/app')
const {
  createStarterCNodeUser,
  testEthereumConstants
} = require('./lib/dataSeeds')
const { getLibsMock } = require('./lib/libsMock')
const { sortKeys } = require('../src/apiSigning')
const { saveFileToStorage, computeFilesHash } = require('./lib/helpers')

const testAudioFilePath = path.resolve(__dirname, 'testDigitalContent.mp3')
const testAudioFileWrongFormatPath = path.resolve(
  __dirname,
  'testDigitalContentWrongFormat.jpg'
)

const TestColivingDigitalContentFileNumSegments = 32
const AGREEMENT_CONTENT_POLLING_ROUTE = '/digital_content_async'

const logContext = {
  logContext: {
    requestID: uuid(),
    requestMethod: 'POST',
    requestHostname: '127.0.0.1',
    requestUrl: AGREEMENT_CONTENT_POLLING_ROUTE
  }
}

// Create the req context for handleDigitalContentRoute
function getReqObj(fileUUID, fileDir, session) {
  return {
    fileName: `${fileUUID}.mp3`,
    fileDir,
    fileDestination: fileDir,
    cnodeUserUUID: session.cnodeUserUUID
  }
}

/**
 * Given index of segment, returns filepath of expected segment file in /test/test-segments/ dir
 * TODO - instead of using ./test/test-segments, use ./test/testDigitalContentUploadDir
 */
function _getTestSegmentFilePathAtIndex(index) {
  let suffix = '000'

  if (index >= 0 && index < 10) suffix += `0${index}`
  else if (index >= 10 && index < 32) suffix += `${index}`
  else throw new Error('Index must be [0, 32)')

  return path.join(__dirname, 'test-segments', `segment${suffix}.ts`)
}

describe('test Polling DigitalContents with mocked IPFS', function () {
  let app,
    server,
    libsMock,
    handleDigitalContentRoute
  let session, userId, userWallet

  const spId = 1

  beforeEach(async () => {
    libsMock = getLibsMock()

    userId = 1
    userWallet = testEthereumConstants.pubKey.toLowerCase()

    const { getApp } = require('./lib/app')
    const appInfo = await getApp(libsMock, BlacklistManager, null, spId)
    await BlacklistManager.init()

    app = appInfo.app
    server = appInfo.server
    session = await createStarterCNodeUser(userId, userWallet)

    // Mock `generateNonImageCid()` in `handleDigitalContentRoute()` to succeed
    const mockCid = 'QmYfSQCgCwhxwYcdEwCkFJHicDe6rzCAb7AtLz3GrHmuU6'
    ;({ handleDigitalContentRoute } = proxyquire(
      '../src/components/digital_contents/digitalContentsComponentService.js',
      {
        '@coliving/sdk': {
          libs: {
            Utils: {
              fileHasher: {
                generateNonImageCid: sinon.stub().returns(
                  new Promise((resolve) => {
                    return resolve(mockCid)
                  })
                )
              }
            }
          },
          '@global': true
        },
        '../../fileManager': {
          copyMultihashToFs: sinon
            .stub(FileManager, 'copyMultihashToFs')
            .returns(
              new Promise((resolve) => {
                const dstPath = DiskManager.computeFilePath(mockCid)
                return resolve(dstPath)
              })
            ),
          '@global': true
        }
      }
    ))
  })

  afterEach(async () => {
    sinon.restore()
    await server.close()
  })

  // Testing middleware -- leave as /digital_content_async
  it('fails to upload when format is not accepted', async function () {
    const file = fs.readFileSync(testAudioFileWrongFormatPath)

    await request(app)
      .post(AGREEMENT_CONTENT_POLLING_ROUTE)
      .attach('file', file, { filename: 'fname.jpg' })
      .set('Content-Type', 'multipart/form-data')
      .set('X-Session-ID', session.sessionToken)
      .set('User-Id', session.userId)
      .expect(400)
  })

  // Testing middleware -- leave as /digital_content_async
  it('fails to upload when maxAudioFileSizeBytes exceeded', async function () {
    // Configure extremely small file size
    process.env.maxAudioFileSizeBytes = 10

    // Reset app
    await server.close()

    const appInfo = await getApp(libsMock, BlacklistManager, null, userId)
    app = appInfo.app
    server = appInfo.server
    session = await createStarterCNodeUser(userId)

    // Confirm max digitalcoin file size is respected by multer
    const file = fs.readFileSync(testAudioFilePath)
    await request(app)
      .post(AGREEMENT_CONTENT_POLLING_ROUTE)
      .attach('file', file, { filename: 'fname.mp3' })
      .set('Content-Type', 'multipart/form-data')
      .set('X-Session-ID', session.sessionToken)
      .set('User-Id', session.userId)
      .expect(400)

    // Reset max file limits
    process.env.maxAudioFileSizeBytes = defaultConfig.maxAudioFileSizeBytes
  })

  it('fails to upload when maxMemoryFileSizeBytes exceeded', async function () {
    // Configure extremely small file size
    process.env.maxMemoryFileSizeBytes = 10

    // Reset app
    await server.close()
    const appInfo = await getApp(libsMock, BlacklistManager, null, userId)
    app = appInfo.app
    server = appInfo.server
    session = await createStarterCNodeUser(userId)

    // Confirm max digitalcoin file size is respected by multer
    const file = fs.readFileSync(testAudioFileWrongFormatPath)
    await request(app)
      .post('/image_upload')
      .attach('file', file, { filename: 'fname.jpg' })
      .set('Content-Type', 'multipart/form-data')
      .set('X-Session-ID', session.sessionToken)
      .set('User-Id', session.userId)
      .expect(500)

    // Reset max file limits
    process.env.maxMemoryFileSizeBytes = defaultConfig.maxMemoryFileSizeBytes
  })

  it('uploads /digital_content_async', async function () {
    const { fileUUID, fileDir } = saveFileToStorage(testAudioFilePath)
    const resp = await handleDigitalContentRoute(
      logContext,
      getReqObj(fileUUID, fileDir, session)
    )

    const {
      digital_content_segments: digitalContentSegments,
      source_file: sourceFile,
      transcodedDigitalContentCID,
      transcodedDigitalContentUUID
    } = resp

    assert.deepStrictEqual(
      digitalContentSegments[0].multihash,
      'QmYfSQCgCwhxwYcdEwCkFJHicDe6rzCAb7AtLz3GrHmuU6'
    )
    assert.deepStrictEqual(digitalContentSegments.length, 32)
    assert.deepStrictEqual(sourceFile.includes('.mp3'), true)
    assert.deepStrictEqual(
      transcodedDigitalContentCID,
      'QmYfSQCgCwhxwYcdEwCkFJHicDe6rzCAb7AtLz3GrHmuU6'
    )
    assert.deepStrictEqual(typeof transcodedDigitalContentUUID, 'string')
  })

  // depends on "uploads /digital_content_async"
  it('Confirm /users/clock_status works with user and digital_content state', async function () {
    const numExpectedFilesForUser = TestColivingDigitalContentFileNumSegments + 1 // numSegments + 320kbps copy

    /** Upload digital_content */
    const { fileUUID, fileDir } = saveFileToStorage(testAudioFilePath)
    let resp = await handleDigitalContentRoute(
      logContext,
      getReqObj(fileUUID, fileDir, session)
    )

    const wallet = session.walletPublicKey

    // Confirm /users/clock_status returns expected info
    resp = await request(app).get(`/users/clock_status/${wallet}`).expect(200)
    assert.deepStrictEqual(resp.body.data, {
      clockValue: numExpectedFilesForUser,
      syncInProgress: false
    })

    // Confirm /users/clock_status returns expected info with returnSkipInfo flag
    resp = await request(app)
      .get(`/users/clock_status/${wallet}?returnSkipInfo=true`)
      .expect(200)
    assert.deepStrictEqual(resp.body.data, {
      clockValue: numExpectedFilesForUser,
      syncInProgress: false,
      CIDSkipInfo: { numCIDs: numExpectedFilesForUser, numSkippedCIDs: 0 }
    })

    // Update digital_content DB entries to be skipped
    const numAffectedRows = (
      await models.File.update(
        { skipped: true },
        {
          where: {
            cnodeUserUUID: session.cnodeUserUUID,
            type: 'digital_content'
          }
        }
      )
    )[0]
    assert.strictEqual(numAffectedRows, TestColivingDigitalContentFileNumSegments)

    // Confirm /users/clock_status returns expected info with returnSkipInfo flag when some entries are skipped
    resp = await request(app)
      .get(`/users/clock_status/${wallet}?returnSkipInfo=true`)
      .expect(200)
    assert.deepStrictEqual(resp.body.data, {
      clockValue: numExpectedFilesForUser,
      syncInProgress: false,
      CIDSkipInfo: {
        numCIDs: numExpectedFilesForUser,
        numSkippedCIDs: TestColivingDigitalContentFileNumSegments
      }
    })

    const files = await models.File.findAll({
      where: { cnodeUserUUID: session.cnodeUserUUID }
    })
    const filesSorted = _.sortBy(files, ['clock'], ['asc'])
    const multihashesSorted = filesSorted.map((file) => file.multihash)

    // Confirm /users/clock_status returns expected info with `returnFilesHash` flag
    const expectedFilesHashFull = computeFilesHash(multihashesSorted)
    resp = await request(app)
      .get(`/users/clock_status/${wallet}?returnFilesHash=true`)
      .expect(200)
    assert.deepStrictEqual(resp.body.data, {
      clockValue: numExpectedFilesForUser,
      syncInProgress: false,
      filesHash: expectedFilesHashFull
    })

    /** Confirm /users/clock_status returns expected info with `returnsFilesHash` and clock range specified */
    const clockMin = 3
    const clockMax = 8

    /** clockMin */
    const expectedFilesHashClockMin = computeFilesHash(multihashesSorted
      .slice(clockMin - 1))
    resp = await request(app)
      .get(
        `/users/clock_status/${wallet}?returnFilesHash=true&filesHashClockRangeMin=${clockMin}`
      )
      .expect(200)
    assert.deepStrictEqual(resp.body.data, {
      clockValue: numExpectedFilesForUser,
      syncInProgress: false,
      filesHash: expectedFilesHashFull,
      filesHashForClockRange: expectedFilesHashClockMin
    })

    /** clockMax */
    const expectedFilesHashClockMax = computeFilesHash(multihashesSorted
      .slice(0, clockMax - 1))
    resp = await request(app)
      .get(
        `/users/clock_status/${wallet}?returnFilesHash=true&filesHashClockRangeMax=${clockMax}`
      )
      .expect(200)
    assert.deepStrictEqual(resp.body.data, {
      clockValue: numExpectedFilesForUser,
      syncInProgress: false,
      filesHash: expectedFilesHashFull,
      filesHashForClockRange: expectedFilesHashClockMax
    })

    /** clockMin and clockMax */
    let expectedFilesHashClockRange = computeFilesHash(multihashesSorted
      .slice(clockMin - 1, clockMax - 1))
    resp = await request(app)
      .get(
        `/users/clock_status/${wallet}?returnFilesHash=true&filesHashClockRangeMin=${clockMin}&filesHashClockRangeMax=${clockMax}`
      )
      .expect(200)
    assert.deepStrictEqual(resp.body.data, {
      clockValue: numExpectedFilesForUser,
      syncInProgress: false,
      filesHash: expectedFilesHashFull,
      filesHashForClockRange: expectedFilesHashClockRange
    })

    /** clockMinTooHigh */
    const clockMinTooHigh = numExpectedFilesForUser + 5
    resp = await request(app).get(
      `/users/clock_status/${wallet}?returnFilesHash=true&filesHashClockRangeMin=${clockMinTooHigh}`
    )
    assert.deepStrictEqual(resp.body.data, {
      clockValue: numExpectedFilesForUser,
      syncInProgress: false,
      filesHash: expectedFilesHashFull,
      filesHashForClockRange: null
    })

    /** clockMaxTooLow */
    const clockMaxTooLow = -5
    resp = await request(app).get(
      `/users/clock_status/${wallet}?returnFilesHash=true&filesHashClockRangeMax=${clockMaxTooLow}`
    )
    assert.deepStrictEqual(resp.body.data, {
      clockValue: numExpectedFilesForUser,
      syncInProgress: false,
      filesHash: expectedFilesHashFull,
      filesHashForClockRange: null
    })

    /** partially overlapping clockrange */
    const clockMaxTooHigh = numExpectedFilesForUser + 5
    expectedFilesHashClockRange = computeFilesHash(
      multihashesSorted.slice(clockMin - 1, clockMaxTooHigh - 1)
    )
    resp = await request(app)
      .get(
        `/users/clock_status/${wallet}?returnFilesHash=true&filesHashClockRangeMin=${clockMin}&filesHashClockRangeMax=${clockMaxTooHigh}`
      )
      .expect(200)
    assert.deepStrictEqual(resp.body.data, {
      clockValue: numExpectedFilesForUser,
      syncInProgress: false,
      filesHash: expectedFilesHashFull,
      filesHashForClockRange: expectedFilesHashClockRange
    })

    /** Non-existent user */
    const invalidWallet = 'asdf'
    resp = await request(app)
      .get(`/users/clock_status/${invalidWallet}`)
      .expect(200)
    assert.deepStrictEqual(resp.body.data, {
      clockValue: -1,
      syncInProgress: false
    })

    /** Non-existent user, returnFilesHash = true */
    resp = await request(app)
      .get(`/users/clock_status/${invalidWallet}?returnFilesHash=true`)
      .expect(200)
    assert.deepStrictEqual(resp.body.data, {
      clockValue: -1,
      syncInProgress: false,
      filesHash: null
    })
  })

  it('Confirms /users/batch_clock_status works with user and digital_content state for 2 users', async () => {
    const numExpectedFilesForUser = TestColivingDigitalContentFileNumSegments + 1 // numSegments + 320kbps copy

    /** Upload digital_content for user 1 */
    const { fileUUID: fileUUID1, fileDir: fileDir1 } =
      saveFileToStorage(testAudioFilePath)
    await handleDigitalContentRoute(
      logContext,
      getReqObj(fileUUID1, fileDir1, session)
    )

    // Compute expected filesHash for user1
    const expectedUser1FilesHash = await DBManager.fetchFilesHashFromDB({
      lookupKey: { lookupWallet: userWallet }
    })

    // Create user 2
    const userId2 = 2
    const pubKey2 = '0xadD36bad12002f1097Cdb7eE24085C28e9random'
    const session2 = await createStarterCNodeUser(userId2, pubKey2)

    /** Upload digital_content for user 2 */
    const { fileUUID: fileUUID2, fileDir: fileDir2 } =
      saveFileToStorage(testAudioFilePath)
    await handleDigitalContentRoute(
      logContext,
      getReqObj(fileUUID2, fileDir2, session2)
    )

    const expectedUser2FilesHash = await DBManager.fetchFilesHashFromDB({
      lookupKey: { lookupWallet: pubKey2 }
    })

    // Confirm /users/batch_clock_status returns expected info
    let resp = await request(app)
      .post(`/users/batch_clock_status`)
      .send({ walletPublicKeys: [userWallet, pubKey2] })
      .expect(200)
    assert.deepStrictEqual(resp.body.data, {
      users: [
        { walletPublicKey: userWallet, clock: numExpectedFilesForUser },
        { walletPublicKey: pubKey2, clock: numExpectedFilesForUser }
      ]
    })

    // Requests with too many wallet keys should be rejected
    const maxNumWallets = config.get('maxBatchClockStatusBatchSize')
    const largeWalletPublicKeys = Array.from(
      { length: maxNumWallets + 1 },
      (_, i) => i + 'a'
    )
    resp = await request(app)
      .post(`/users/batch_clock_status`)
      .send({ walletPublicKeys: largeWalletPublicKeys })
      .expect(400, {
        error: `Number of wallets must not exceed ${maxNumWallets} (reduce 'walletPublicKeys' field in request body).`
      })

    /** Non-existent user */
    const invalidWallet = 'asdf'
    resp = await request(app)
      .post(`/users/batch_clock_status`)
      .send({ walletPublicKeys: [userWallet, invalidWallet] })
      .expect(200)
    assert.deepStrictEqual(resp.body.data, {
      users: [
        { walletPublicKey: userWallet, clock: numExpectedFilesForUser },
        { walletPublicKey: invalidWallet, clock: -1 }
      ]
    })

    /** returnFilesHash = true */
    resp = await request(app)
      .post(`/users/batch_clock_status?returnFilesHash=true`)
      .send({ walletPublicKeys: [userWallet, pubKey2] })
      .expect(200)
    assert.deepStrictEqual(resp.body.data, {
      users: [
        {
          walletPublicKey: userWallet,
          clock: numExpectedFilesForUser,
          filesHash: expectedUser1FilesHash
        },
        {
          walletPublicKey: pubKey2,
          clock: numExpectedFilesForUser,
          filesHash: expectedUser2FilesHash
        }
      ]
    })

    /** returnFilesHash = true, invalid user */
    resp = await request(app)
      .post(`/users/batch_clock_status?returnFilesHash=true`)
      .send({ walletPublicKeys: [userWallet, invalidWallet] })
      .expect(200)
    assert.deepStrictEqual(resp.body.data, {
      users: [
        {
          walletPublicKey: userWallet,
          clock: numExpectedFilesForUser,
          filesHash: expectedUser1FilesHash
        },
        { walletPublicKey: invalidWallet, clock: -1, filesHash: null }
      ]
    })
  })

  // depends on "uploads /digital_content_async"; if that test fails, this test will fail to due to similarity
  it('creates Coliving digital_content using application logic for /digital_content_async', async function () {
    libsMock.User.getUsers.exactly(2)

    const { fileUUID, fileDir } = saveFileToStorage(testAudioFilePath)
    const resp = await handleDigitalContentRoute(
      logContext,
      getReqObj(fileUUID, fileDir, session)
    )

    const { digital_content_segments: digitalContentSegments, source_file: sourceFile } = resp
    assert.deepStrictEqual(
      digitalContentSegments[0].multihash,
      'QmYfSQCgCwhxwYcdEwCkFJHicDe6rzCAb7AtLz3GrHmuU6'
    )
    assert.deepStrictEqual(digitalContentSegments.length, 32)
    assert.deepStrictEqual(sourceFile.includes('.mp3'), true)

    // creates Coliving digital_content
    const metadata = {
      test: 'field1',
      owner_id: 1,
      digital_content_segments: digitalContentSegments
    }

    const digitalContentMetadataResp = await request(app)
      .post('/digital_contents/metadata')
      .set('X-Session-ID', session.sessionToken)
      .set('User-Id', session.userId)
      .set('Enforce-Write-Quorum', false)
      .send({ metadata, sourceFile })
      .expect(200)

    assert.deepStrictEqual(
      digitalContentMetadataResp.body.data.metadataMultihash,
      'QmYhusD7qFv7gxNqi9nyaoiqaRXYQvoCvVgXY75nSoydmy'
    )
  })

  // depends on "uploads /digital_content_async"
  it('fails to create Coliving digital_content when segments not provided', async function () {
    libsMock.User.getUsers.exactly(2)

    const { fileUUID, fileDir } = saveFileToStorage(testAudioFilePath)
    const resp = await handleDigitalContentRoute(
      logContext,
      getReqObj(fileUUID, fileDir, session)
    )

    const { digital_content_segments: digitalContentSegments, source_file: sourceFile } = resp

    assert.deepStrictEqual(
      digitalContentSegments[0].multihash,
      'QmYfSQCgCwhxwYcdEwCkFJHicDe6rzCAb7AtLz3GrHmuU6'
    )
    assert.deepStrictEqual(digitalContentSegments.length, 32)
    assert.deepStrictEqual(sourceFile.includes('.mp3'), true)

    // creates Coliving digital_content
    const metadata = {
      test: 'field1',
      owner_id: 1
    }

    await request(app)
      .post('/digital_contents/metadata')
      .set('X-Session-ID', session.sessionToken)
      .set('User-Id', session.userId)
      .set('Enforce-Write-Quorum', false)
      .send({ metadata, sourceFile })
      .expect(400)
  })

  // depends on "uploads /digital_content_async"
  it('fails to create Coliving digital_content when invalid segment multihashes are provided', async function () {
    libsMock.User.getUsers.exactly(2)

    const { fileUUID, fileDir } = saveFileToStorage(testAudioFilePath)
    const resp = await handleDigitalContentRoute(
      logContext,
      getReqObj(fileUUID, fileDir, session)
    )

    const { digital_content_segments: digitalContentSegments, source_file: sourceFile } = resp

    assert.deepStrictEqual(
      digitalContentSegments[0].multihash,
      'QmYfSQCgCwhxwYcdEwCkFJHicDe6rzCAb7AtLz3GrHmuU6'
    )
    assert.deepStrictEqual(digitalContentSegments.length, 32)
    assert.deepStrictEqual(sourceFile.includes('.mp3'), true)

    // creates Coliving digital_content
    const metadata = {
      test: 'field1',
      digital_content_segments: [{ multihash: 'incorrectCIDLink', duration: 1000 }],
      owner_id: 1
    }

    await request(app)
      .post('/digitalContents')
      .set('X-Session-ID', session.sessionToken)
      .set('User-Id', session.userId)
      .send({ metadata, sourceFile })
      .expect(400)
  })

  // depends on "uploads /digital_content_async"
  it('fails to create Coliving digital_content when owner_id is not provided', async function () {
    libsMock.User.getUsers.exactly(2)

    const { fileUUID, fileDir } = saveFileToStorage(testAudioFilePath)
    const resp = await handleDigitalContentRoute(
      logContext,
      getReqObj(fileUUID, fileDir, session)
    )

    const { source_file: sourceFile } = resp

    // creates Coliving digital_content
    const metadata = {
      test: 'field1',
      digital_content_segments: [
        {
          multihash: 'QmYfSQCgCwhxwYcdEwCkFJHicDe6rzCAb7AtLz3GrHmuU6',
          duration: 1000
        }
      ]
    }

    await request(app)
      .post('/digitalContents')
      .set('X-Session-ID', session.sessionToken)
      .set('User-Id', session.userId)
      .send({ metadata, sourceFile })
      .expect(400)
  })

  // depends on "uploads /digital_content_async" and "creates Coliving digital_content" tests
  it('completes Coliving digital_content creation', async function () {
    libsMock.User.getUsers.exactly(4)

    const { fileUUID, fileDir } = saveFileToStorage(testAudioFilePath)
    const {
      digital_content_segments: digitalContentSegments,
      source_file: sourceFile,
      transcodedDigitalContentUUID
    } = await handleDigitalContentRoute(
      logContext,
      getReqObj(fileUUID, fileDir, session)
    )

    const metadata = {
      test: 'field1',
      digital_content_segments: digitalContentSegments,
      owner_id: 1
    }

    const digitalContentMetadataResp = await request(app)
      .post('/digital_contents/metadata')
      .set('X-Session-ID', session.sessionToken)
      .set('User-Id', session.userId)
      .set('Enforce-Write-Quorum', false)
      .send({ metadata, sourceFile })
      .expect(200)

    assert.deepStrictEqual(
      digitalContentMetadataResp.body.data.metadataMultihash,
      'QmTWhw49RfSMSJJmfm8cMHFBptgWoBGpNwjAc5jy2qeJfs'
    )

    await request(app)
      .post('/digitalContents')
      .set('X-Session-ID', session.sessionToken)
      .set('User-Id', session.userId)
      .send({
        blockchainDigitalContentId: 1,
        blockNumber: 10,
        metadataFileUUID: digitalContentMetadataResp.body.data.metadataFileUUID,
        transcodedDigitalContentUUID
      })
      .expect(200)
  })

  // depends on "uploads /digital_content_async"
  it('fails to create downloadable digital_content with no digital_content_id and no source_id present', async function () {
    libsMock.User.getUsers.exactly(2)

    const { fileUUID, fileDir } = saveFileToStorage(testAudioFilePath)
    const resp = await handleDigitalContentRoute(
      logContext,
      getReqObj(fileUUID, fileDir, session)
    )

    const { digital_content_segments: digitalContentSegments } = resp
    assert.deepStrictEqual(
      digitalContentSegments[0].multihash,
      'QmYfSQCgCwhxwYcdEwCkFJHicDe6rzCAb7AtLz3GrHmuU6'
    )
    assert.deepStrictEqual(digitalContentSegments.length, 32)

    // creates a downloadable Coliving digital_content with no digital_content_id and no source_file
    const metadata = {
      test: 'field1',
      owner_id: 1,
      digital_content_segments: [
        {
          multihash: 'QmYfSQCgCwhxwYcdEwCkFJHicDe6rzCAb7AtLz3GrHmuU6',
          duration: 1000
        }
      ],
      download: {
        is_downloadable: true,
        requires_follow: false
      }
    }

    await request(app)
      .post('/digital_contents/metadata')
      .set('X-Session-ID', session.sessionToken)
      .set('User-Id', session.userId)
      .set('Enforce-Write-Quorum', false)
      .send({ metadata })
      .expect(400)
  })

  // depends on "uploads /digital_content_async" and "creates Coliving digital_content" tests
  it('creates a downloadable digital_content', async function () {
    libsMock.User.getUsers.exactly(4)

    const { fileUUID, fileDir } = saveFileToStorage(testAudioFilePath)
    const {
      digital_content_segments: digitalContentSegments,
      source_file: sourceFile,
      transcodedDigitalContentUUID
    } = await handleDigitalContentRoute(
      logContext,
      getReqObj(fileUUID, fileDir, session)
    )

    assert.deepStrictEqual(
      digitalContentSegments[0].multihash,
      'QmYfSQCgCwhxwYcdEwCkFJHicDe6rzCAb7AtLz3GrHmuU6'
    )
    assert.deepStrictEqual(digitalContentSegments.length, 32)
    assert.deepStrictEqual(sourceFile.includes('.mp3'), true)

    // needs debugging as to why this 'cid' key is needed for test to work
    const metadata = {
      test: 'field1',
      digital_content_segments: digitalContentSegments,
      owner_id: 1,
      download: {
        is_downloadable: true,
        requires_follow: false,
        cid: 'QmYfSQCgCwhxwYcdEwCkFJHicDe6rzCAb7AtLz3GrHmuU6'
      }
    }

    const digitalContentMetadataResp = await request(app)
      .post('/digital_contents/metadata')
      .set('X-Session-ID', session.sessionToken)
      .set('User-Id', session.userId)
      .set('Enforce-Write-Quorum', false)
      .send({ metadata, sourceFile })
      .expect(200)

    assert.deepStrictEqual(
      digitalContentMetadataResp.body.data.metadataMultihash,
      'QmPjrvx9MBcvf495t43ZhiMpKWwu1JnqkcNUN3Z9EBWm49'
    )

    await request(app)
      .post('/digitalContents')
      .set('X-Session-ID', session.sessionToken)
      .set('User-Id', session.userId)
      .send({
        blockchainDigitalContentId: 1,
        blockNumber: 10,
        metadataFileUUID: digitalContentMetadataResp.body.data.metadataFileUUID,
        transcodedDigitalContentUUID
      })
      .expect(200)
  })
})

describe('test Polling DigitalContents with real files', function () {
  let app2, server, session, libsMock, handleDigitalContentRoute, userId

  /** Inits libs mock, web server app, blacklist manager, and creates starter CNodeUser */
  beforeEach(async () => {
    libsMock = getLibsMock()

    userId = 1

    const { getApp } = require('./lib/app')
    const appInfo = await getApp(libsMock, BlacklistManager, null, userId)
    await BlacklistManager.init()

    app2 = appInfo.app
    server = appInfo.server
    session = await createStarterCNodeUser(userId)

    handleDigitalContentRoute =
      require('../src/components/digital_contents/digitalContentsComponentService').handleDigitalContentRoute
  })

  /** Reset sinon & close server */
  afterEach(async () => {
    sinon.restore()
    await server.close()
  })

  // ~~~~~~~~~~~~~~~~~~~~~~~~~ /digital_content_async TESTS ~~~~~~~~~~~~~~~~~~~~~~~~~
  it('sends server error response if segmenting fails', async function () {
    const { handleDigitalContentRoute } = proxyquire(
      '../src/components/digital_contents/digitalContentsComponentService.js',
      {
        '../../TranscodingQueue': {
          segment: sinon
            .stub(TranscodingQueue, 'segment')
            .rejects(new Error('failed to segment')),
          '@global': true
        }
      }
    )

    const { fileUUID, fileDir } = saveFileToStorage(testAudioFilePath)
    try {
      await handleDigitalContentRoute(
        logContext,
        getReqObj(fileUUID, fileDir, session)
      )
      assert.fail('Should have thrown error if segmenting failed')
    } catch (e) {
      assert.ok(e.message.includes('failed to segment'))
    }
  })

  it('sends server error response if transcoding fails', async function () {
    const { handleDigitalContentRoute } = proxyquire(
      '../src/components/digital_contents/digitalContentsComponentService.js',
      {
        '../../TranscodingQueue': {
          transcode320: sinon
            .stub(TranscodingQueue, 'transcode320')
            .rejects(new Error('failed to transcode')),
          '@global': true
        }
      }
    )

    const { fileUUID, fileDir } = saveFileToStorage(testAudioFilePath)
    try {
      await handleDigitalContentRoute(
        logContext,
        getReqObj(fileUUID, fileDir, session)
      )
      assert.fail('Should have thrown error if transcoding failed')
    } catch (e) {
      assert.ok(e.message.includes('failed to transcode'))
    }
  })

  it('should successfully upload digital_content + transcode and prune upload artifacts when TranscodingQueue is available', async function () {
    const { fileUUID, fileDir } = saveFileToStorage(testAudioFilePath)
    const resp = await handleDigitalContentRoute(
      logContext,
      getReqObj(fileUUID, fileDir, session)
    )

    const { digital_content_segments: digitalContentSegments, transcodedDigitalContentCID } = resp

    // check that the generated transcoded digital_content is the same as the transcoded digital_content in /tests
    const transcodedDigitalContentAssetPath = path.join(
      __dirname,
      'testTranscoded320DigitalContent.mp3'
    )
    const transcodedDigitalContentAssetBuf = fs.readFileSync(transcodedDigitalContentAssetPath)
    const transcodedDigitalContentPath = DiskManager.computeFilePath(transcodedDigitalContentCID)
    const transcodedDigitalContentTestBuf = fs.readFileSync(transcodedDigitalContentPath)
    assert.deepStrictEqual(
      transcodedDigitalContentAssetBuf.compare(transcodedDigitalContentTestBuf),
      0
    )

    // Ensure 32 segments are returned, each segment has a corresponding file on disk,
    //    and each segment disk file is exactly as expected
    // Note - The exact output of digital_content segmentation is deterministic only for a given environment/ffmpeg version
    //    This test may break in the future but at that point we should re-generate the reference segment files.
    assert.deepStrictEqual(digitalContentSegments.length, TestColivingDigitalContentFileNumSegments)
    digitalContentSegments.map(function (cid, index) {
      const cidPath = DiskManager.computeFilePath(cid.multihash)

      // Ensure file exists
      assert.ok(fs.existsSync(cidPath))

      // Ensure file is identical to expected segment file
      const expectedSegmentFilePath = _getTestSegmentFilePathAtIndex(index)
      const expectedSegmentFileBuf = fs.readFileSync(expectedSegmentFilePath)
      const returnedSegmentFileBuf = fs.readFileSync(cidPath)
      assert.deepStrictEqual(
        expectedSegmentFileBuf.compare(returnedSegmentFileBuf),
        0
      )
    })
  })

  // ~~~~~~~~~~~~~~~~~~~~~~~~~ /digital_contents/metadata TESTS ~~~~~~~~~~~~~~~~~~~~~~~~~
  it('should throw an error if no metadata is passed', async function () {
    const resp = await request(app2)
      .post('/digital_contents/metadata')
      .set('X-Session-ID', session.sessionToken)
      .set('User-Id', session.userId)
      .set('Enforce-Write-Quorum', false)
      .send({})
      .expect(400)

    assert.deepStrictEqual(
      resp.body.error,
      'Metadata object must include owner_id and non-empty digital_content_segments array'
    )
  })

  it('should not throw an error if segment is blacklisted', async function () {
    sinon.stub(BlacklistManager, 'CIDIsInBlacklist').returns(true)
    const metadata = {
      test: 'field1',
      digital_content_segments: [
        {
          multihash: 'QmYfSQCgCwhxwYcdEwCkFJHicDe6rzCAb7AtLz3GrHmuU6',
          duration: 1000
        }
      ],
      owner_id: 1
    }

    await request(app2)
      .post('/digital_contents/metadata')
      .set('X-Session-ID', session.sessionToken)
      .set('User-Id', session.userId)
      .set('Enforce-Write-Quorum', false)
      .send({ metadata })
      .expect(200)
  })

  it('successfully adds metadata file to filesystem and db', async function () {
    const metadata = sortKeys({
      test: 'field1',
      digital_content_segments: [
        {
          multihash: 'QmYfSQCgCwhxwYcdEwCkFJHicDe6rzCAb7AtLz3GrHmuU6',
          duration: 1000
        }
      ],
      owner_id: 1
    })

    const resp = await request(app2)
      .post('/digital_contents/metadata')
      .set('X-Session-ID', session.sessionToken)
      .set('User-Id', session.userId)
      .set('Enforce-Write-Quorum', false)
      .send({ metadata })
      .expect(200)

    // check that the metadata file was written to storagePath under its multihash
    const metadataPath = DiskManager.computeFilePath(
      resp.body.data.metadataMultihash
    )
    assert.ok(fs.existsSync(metadataPath))

    // check that the metadata file contents match the metadata specified
    let metadataFileData = fs.readFileSync(metadataPath, 'utf-8')
    metadataFileData = sortKeys(JSON.parse(metadataFileData))
    assert.deepStrictEqual(metadataFileData, metadata)

    // check that the correct metadata file properties were written to db
    const file = await models.File.findOne({
      where: {
        multihash: resp.body.data.metadataMultihash,
        storagePath: metadataPath,
        type: 'metadata'
      }
    })
    assert.ok(file)
  })

  // ~~~~~~~~~~~~~~~~~~~~~~~~~ /digitalContents TESTS ~~~~~~~~~~~~~~~~~~~~~~~~~
  it('POST /digitalContents tests', async function () {
    // Upload digital_content content
    const { fileUUID, fileDir } = saveFileToStorage(testAudioFilePath)
    const {
      digital_content_segments: digitalContentSegments,
      transcodedDigitalContentUUID,
      source_file: sourceFile
    } = await handleDigitalContentRoute(
      logContext,
      getReqObj(fileUUID, fileDir, session)
    )

    // Upload digital_content metadata
    const digitalContentMetadata = {
      metadata: {
        owner_id: userId,
        digital_content_segments: digitalContentSegments
      },
      source_file: sourceFile
    }
    const digitalContentMetadataResp = await request(app2)
      .post('/digital_contents/metadata')
      .set('X-Session-ID', session.sessionToken)
      .set('User-Id', userId)
      .set('Enforce-Write-Quorum', false)
      .send(digitalContentMetadata)
      .expect(200)
    const digitalContentMetadataFileUUID = digitalContentMetadataResp.body.data.metadataFileUUID

    // Complete digital_content creation
    await request(app2)
      .post('/digitalContents')
      .set('X-Session-ID', session.sessionToken)
      .set('User-Id', userId)
      .send({
        blockchainDigitalContentId: 1,
        blockNumber: 10,
        metadataFileUUID: digitalContentMetadataFileUUID,
        transcodedDigitalContentUUID
      })
  })

  it('parallel digital_content upload', async function () {
    // Upload digital_content content
    const { fileUUID, fileDir } = saveFileToStorage(testAudioFilePath)
    const {
      digital_content_segments: digitalContentSegments,
      transcodedDigitalContentUUID,
      source_file: sourceFile
    } = await handleDigitalContentRoute(
      logContext,
      getReqObj(fileUUID, fileDir, session)
    )

    // Upload same digital_content content again
    const { fileUUID: fileUUID2, fileDir: fileDir2 } =
      saveFileToStorage(testAudioFilePath)
    const {
      digital_content_segments: digitalContent2Segments,
      transcodedDigitalContentUUID: transcodedDigitalContent2UUID,
      source_file: sourceFile2
    } = await handleDigitalContentRoute(
      logContext,
      getReqObj(fileUUID2, fileDir2, session)
    )

    // Upload digital_content 1 metadata
    const digitalContentMetadata = {
      metadata: {
        owner_id: userId,
        digital_content_segments: digitalContentSegments
      },
      source_file: sourceFile
    }
    const digitalContentMetadataResp = await request(app2)
      .post('/digital_contents/metadata')
      .set('X-Session-ID', session.sessionToken)
      .set('User-Id', userId)
      .set('Enforce-Write-Quorum', false)
      .send(digitalContentMetadata)
      .expect(200)
    const digitalContentMetadataFileUUID = digitalContentMetadataResp.body.data.metadataFileUUID

    // Upload digital_content 2 metadata
    const digitalContent2Metadata = {
      metadata: {
        owner_id: userId,
        digital_content_segments: digitalContent2Segments
      },
      source_file: sourceFile
    }
    const digitalContent2MetadataResp = await request(app2)
      .post('/digital_contents/metadata')
      .set('X-Session-ID', session.sessionToken)
      .set('User-Id', userId)
      .set('Enforce-Write-Quorum', false)
      .send(digitalContent2Metadata)
      .expect(200)
    const digitalContent2MetadataFileUUID = digitalContent2MetadataResp.body.data.metadataFileUUID

    // Complete digitalContent1 creation
    await request(app2)
      .post('/digitalContents')
      .set('X-Session-ID', session.sessionToken)
      .set('User-Id', userId)
      .send({
        blockchainDigitalContentId: 1,
        blockNumber: 10,
        metadataFileUUID: digitalContentMetadataFileUUID,
        transcodedDigitalContentUUID
      })
      .expect(200)

    // Complete digitalContent2 creation
    await request(app2)
      .post('/digitalContents')
      .set('X-Session-ID', session.sessionToken)
      .set('User-Id', userId)
      .send({
        blockchainDigitalContentId: 2,
        blockNumber: 20,
        metadataFileUUID: digitalContent2MetadataFileUUID,
        transcodedDigitalContentUUID: transcodedDigitalContent2UUID
      })
      .expect(200)
  })
})
