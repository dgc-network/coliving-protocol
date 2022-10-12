const { segmentFile } = require('../src/ffmpeg')

const path = require('path')
const fs = require('fs')
const assert = require('assert')

describe('test segmentFile()', () => {
  // Create the segments directory to store segments in.
  // Middleware would normally handle this, however, in this test
  // context, segmentFile() is unit tested directly without the middleware.
  before(() => {
    const segmentsDirPath = path.join(__dirname, 'segments')
    if (!fs.existsSync(segmentsDirPath)) {
      try {
        fs.mkdirSync(segmentsDirPath)
      } catch (e) {
        assert.fail(`Could not create dir at ${segmentsDirPath}: ${e}`)
      }
    }
  })

  /**
   * Given: improper params are passed in
   * When: digital_content segmenting occurs
   * Then: an error is thrown
   */
  it('should throw an error if ffmpeg reads bad params', async () => {
    try {
      await segmentFile(null, null, {})
      assert.fail('Should have thrown error with bad params')
    } catch (e) {
      assert.ok(e.message)
    }
  })

  /**
   * Given: a corrupted digital_content is present (image)
   * Then: an error is thrown
   * When: it is segmented
  */
  it('should throw an error if ffmpeg reads a bad digital_content file (image)', async () => {
    const fileDir = __dirname
    const fileName = 'testDigitalContentWrongFormat.jpg'

    try {
      await segmentFile(fileDir, fileName, {})
      assert.fail('Should have thrown error when segmenting a bad digital_content (image)')
    } catch (e) {
      assert.deepStrictEqual(e.message, 'FFMPEG Error')
    }
  })

  /**
   * Given: a proper digital_content of length 3:07 is present
   * When: it is segmented
   * Then: there are 32 proper digital_content segments present in tests/segments
  */
  it('should properly segment digital_content', async () => {
    const fileDir = __dirname
    const fileName = 'testDigitalContent.mp3'

    try {
      await segmentFile(fileDir, fileName, {})
    } catch (e) {
      assert.fail(e.message)
    }

    // read segments assets from /test-segments
    // TODO - instead of using ./test/test-segments, use ./test/testDigitalContentUploadDir
    const testSegmentsPath = path.join(fileDir, 'test-segments')
    fs.readdir(testSegmentsPath, (err, files) => {
      if (err) assert.fail(`Could not read directory at ${testSegmentsPath}`)

      // check that testDigitalContent.mp3 that 32 digital_content segments are written
      assert.deepStrictEqual(files.length, 32)

      const allSegmentsSet = new Set(files)
      files.map((file, i) => {
        // check that the segment follows naming convention
        const indexSuffix = ('00000' + i).slice(-5)
        assert.deepStrictEqual(file, `segment${indexSuffix}.ts`)

        // check that the segment is proper by comparing its buffer to test assets
        const testGeneratedSegmentBuf = fs.readFileSync(path.join(fileDir, 'segments', file))
        const expectedSegmentBuf = fs.readFileSync(path.join(testSegmentsPath, file))
        assert.deepStrictEqual(expectedSegmentBuf.compare(testGeneratedSegmentBuf), 0)

        allSegmentsSet.delete(file)
      })

      // check that all the expected segments were found
      assert.deepStrictEqual(allSegmentsSet.size, 0)
    })
  })
})
