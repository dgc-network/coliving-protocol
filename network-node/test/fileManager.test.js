const assert = require('assert')
const sinon = require('sinon')
const uuid = require('uuid/v4')
const fs = require('fs-extra')
const path = require('path')
const proxyquire = require('proxyquire')

const { libs } = require('@coliving/sdk')
const Utils = libs.Utils
const { logger: genericLogger } = require('../src/logging')
const {
  removeTrackFolder,
  saveFileFromBufferToDisk,
  copyMultihashToFs
} = require('../src/fileManager')
const config = require('../src/config')
const models = require('../src/models')
const { sortKeys } = require('../src/apiSigning')
const DiskManager = require('../src/diskManager')

const storagePath = config.get('storagePath')

const reqFnStubs = { storagePath }
const req = {
  session: {
    cnodeUserUUID: uuid()
  },
  logger: {
    info: () => {},
    error: () => {}
  },
  app: {
    get: (key) => {
      return reqFnStubs[key]
    }
  }
}

// TODO - instead of using ./test/test-segments, use ./test/testTrackUploadDir
// consts used for testing generateNonImageCid()
const segmentsDirPath = 'test/test-segments'
const sourceFile = 'segment00001.ts'
const srcPath = path.join(segmentsDirPath, sourceFile)

// consts used for testing saveFileFromBufferToDisk()
const metadata = {
  test: 'field1',
  track_segments: [
    {
      multihash: 'QmYfSQCgCwhxwYcdEwCkFJHicDe6rzCAb7AtLz3GrHmuU6',
      duration: 1000
    }
  ],
  owner_id: 1
}
const buffer = Buffer.from(JSON.stringify(metadata))

describe('test fileManager', () => {
  afterEach(function () {
    sinon.restore()
  })

  // ~~~~~~~~~~~~~~~~~~~~~~~~~ generateNonImageCid() TESTS ~~~~~~~~~~~~~~~~~~~~~~~~~
  describe('test generateNonImageCid()', () => {
    /**
     * Given: copyMultihashToFs is called
     * When: file copying fails
     * Then: an error is thrown
     */
    it('should throw an error if file copy fails', async () => {
      const fsExtraStub = {
        copyFile: sinon.stub().callsFake(() => {
          return new Promise((resolve, reject) =>
            reject(new Error('Failed to copy files!!'))
          )
        })
      }
      const { copyMultihashToFs } = proxyquire('../src/fileManager', {
        'fs-extra': fsExtraStub
      })

      try {
        await copyMultihashToFs(
          'QmYfSQCgCwhxwYcdEwCkFJHicDe6rzCAb7AtLz3GrHmuU6',
          srcPath,
          {
            logContext: { requestID: uuid() }
          }
        )
        assert.fail('Should not have passed if file copying fails.')
      } catch (e) {
        assert.deepStrictEqual(e.message, 'Failed to copy files!!')
      }
    })

    /**
     * Given: a file is being saved to file storage
     * When: everything works as expected
     * Then:
     *  - 1 segment should be saved in <storagePath>/QmSMQGu2vrE6UwXiZDCxyJwTsCcpPrYNBPJBL4by4LKukd
     *  - that segment content should match the original sourcefile
     */
    it('should pass saving file to file storage (happy path)', async () => {
      sinon
        .stub(models.File, 'create')
        .returns({ dataValues: { fileUUID: 'uuid' } })

      const requestID = uuid()
      try {
        await Utils.fileHasher.generateNonImageCid(
          srcPath,
          genericLogger.child({ logContext: { requestID } })
        )
      } catch (e) {
        assert.fail(e.message)
      }

      try {
        await copyMultihashToFs(
          'QmSMQGu2vrE6UwXiZDCxyJwTsCcpPrYNBPJBL4by4LKukd',
          srcPath,
          {
            logContext: { requestID }
          }
        )
      } catch (e) {
        assert.fail('Error should not have been thrown', e)
      }

      // 1 segment should be saved in <storagePath>/QmSMQGu2vrE6UwXiZDCxyJwTsCcpPrYNBPJBL4by4LKukd
      const segmentCID = 'QmSMQGu2vrE6UwXiZDCxyJwTsCcpPrYNBPJBL4by4LKukd'
      const syncedSegmentPath = DiskManager.computeFilePath(segmentCID)
      assert.ok(fs.existsSync(syncedSegmentPath))

      // the segment content should match the original sourcefile
      const syncedSegmentBuf = fs.readFileSync(syncedSegmentPath)
      const originalSegmentBuf = fs.readFileSync(srcPath)
      assert.deepStrictEqual(originalSegmentBuf.compare(syncedSegmentBuf), 0)
    })
  })

  // ~~~~~~~~~~~~~~~~~~~~~~~~~ saveFileFromBufferToDisk() TESTS ~~~~~~~~~~~~~~~~~~~~~~~~~
  describe('test saveFileFromBufferToDisk()', () => {
    /**
     * Given: a file buffer is being saved to fs and db
     * When: cnodeUserUUID is not present
     * Then: an error is thrown
     */
    it('should throw error if cnodeUserUUID is not present', async () => {
      const reqOverride = {
        session: {},
        logger: {
          info: () => {}
        },
        app: {
          get: () => {
            return DiskManager.getConfigStoragePath()
          }
        }
      }

      try {
        await saveFileFromBufferToDisk(reqOverride, buffer)
        assert.fail(
          'Should not have passed if cnodeUserUUID is not present in request.'
        )
      } catch (e) {
        assert.deepStrictEqual(
          e.message,
          'User must be authenticated to save a file'
        )
      }
    })

    /**
     * Given: a file buffer is being saved to file storage and db
     * When: generating the CID fails
     * Then: an error is thrown
     */
    it('should throw an error if CID generation fails', async () => {
      sinon
        .stub(Utils.fileHasher, 'generateNonImageCid')
        .rejects(new Error('generating CID has failed!'))

      try {
        await saveFileFromBufferToDisk(req, buffer)
      } catch (e) {
        assert.deepStrictEqual(e.message, 'generating CID has failed!')
      }
    })

    /**
     * Given: a file buffer is being saved to file storage and db
     * When: writing to filesystem fails
     * Then: an error is thrown
     */
    it('should throw an error if writing file to filesystem fails', async () => {
      sinon
        .stub(Utils.fileHasher, 'generateNonImageCid')
        .resolves([{ hash: 'bad/path/fail' }]) // pass bad data to writeFile()

      try {
        await saveFileFromBufferToDisk(req, buffer)
        assert.fail('Should not have passed if writing to filesystem fails.')
      } catch (e) {
        assert.ok(e.message)
      }
    })

    /**
     * Given: a file buffer is being saved to fs and db
     * When: everything works as expected
     * Then: fs and db should have the buffer contents
     */
    it('should pass saving file from buffer (happy path)', async () => {
      sinon
        .stub(models.File, 'create')
        .returns({ dataValues: { fileUUID: 'uuid' } })

      let resp
      try {
        resp = await saveFileFromBufferToDisk(req, buffer)
      } catch (e) {
        assert.fail(e.message)
      }

      // check that the metadata file was written to storagePath under its multihash
      const metadataPath = DiskManager.computeFilePath(resp.cid)
      assert.ok(fs.existsSync(metadataPath))

      // check that the contents of the metadata file is what we expect
      let metadataFileData = fs.readFileSync(metadataPath, 'utf-8')
      metadataFileData = sortKeys(JSON.parse(metadataFileData))
      assert.deepStrictEqual(metadataFileData, metadata)
    })
  })
})

describe('test removeTrackFolder()', async function () {
  const testTrackUploadDir = './test/testTrackUploadDir/'
  const trackSourceFileDir = path.join(storagePath, 'testTrackSourceFileDir')

  // copy test dir into /test_file_storage dir to be deleted by removeTrackFolder()
  beforeEach(async function () {
    // uses `fs-extra` module for recursive directory copy since base `fs` module doesn't provide this
    await fs.copy(testTrackUploadDir, storagePath)
  })

  afterEach(async function () {
    sinon.restore()
  })

  it.skip('TODO - Failure cases', async function () {})

  it('Successfully removes track folder', async function () {
    // Ensure expected dir state before calling removeTrackFolder()
    // Note that the contents of these files are never checked as only the dir structure/file naming matters here.
    //    The file contents don't matter as these files are never accessed after completing track upload.
    assert.ok(fs.existsSync(trackSourceFileDir))
    assert.ok(fs.existsSync(path.join(trackSourceFileDir, 'segments')))
    assert.ok(fs.existsSync(path.join(trackSourceFileDir, 'master.mp3')))
    assert.ok(
      fs.existsSync(path.join(trackSourceFileDir, 'trackManifest.m3u8'))
    )
    assert.ok(fs.existsSync(path.join(trackSourceFileDir, 'transcode.mp3')))

    // Call removeTrackFolder + expect success
    try {
      await removeTrackFolder(req, trackSourceFileDir)
    } catch (e) {
      assert.fail(e.message)
    }

    // Ensure dir has been removed
    assert.ok(!fs.existsSync(trackSourceFileDir))
  })
})
