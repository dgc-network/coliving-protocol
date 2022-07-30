const config = require('./config')
const fs = require('fs')
const path = require('path')
const ffmpeg = require('ffmpeg-static').path
const spawn = require('child_process').spawn
const { logger: genericLogger } = require('./logging')

/**
 * Segments file into equal size chunks without re-encoding.
 * Try to segment as mp3 and error on failure 
 * @date 01-27-2022
 * @param {Object} params
 * @param {string} params.fileDir the directory of the uploaded track artifact
 * @param {string} params.fileName the uploaded track artifact filename
 * @param {Object} params.logContext the log context used to instantiate a logger
 * @returns {Object} response in the structure 
  {
    segments: {
      fileNames: segmentFileNames {string[]}: the segment file names only, 
      filePaths: segmentFilePaths {string[]}: the segment file paths 
    },
    m3u8FilePath {string}: the m3u8 file path 
  }
 */
function segmentFile(fileDir, fileName, { logContext }) {
  const logger = genericLogger.child(logContext)
  return new Promise((resolve, reject) => {
    const absolutePath = path.resolve(fileDir, fileName)
    logger.info(`Segmenting file ${absolutePath}...`)

    const m3u8FilePath = path.resolve(fileDir, fileName.split('.')[0] + '.m3u8')

    // https://ffmpeg.org/ffmpeg-formats.html#hls-2
    const args = [
      '-i',
      absolutePath,
      '-ar',
      config.get('sampleRate'),
      '-b:a',
      config.get('bitRate'),
      '-hls_time',
      config.get('hlsTime'),
      '-hls_segment_type',
      config.get('hlsSegmentType'), // `fmp4` for MPEG-DASH - hls 7+ only
      '-hls_list_size',
      0, // write all segments to one m3u8 file
      '-hls_base_url',
      'segments/', // path hack - adds `segments` dir to m3u8 file entries
      '-hls_segment_filename',
      path.resolve(fileDir, 'segments', 'segment%05d.ts'),
      // "-vn" flag required to allow track uploading with album art
      // https://stackoverflow.com/questions/20193065/how-to-remove-id3-audio-tag-image-or-metadata-from-mp3-with-ffmpeg
      '-vn', // skip inclusion of video, process only the audio file without "video"
      m3u8FilePath
    ]
    logger.info(`Spawning: ffmpeg ${args}`)
    const proc = spawn(ffmpeg, args)

    // capture output
    let stdout = ''
    let stderr = ''
    proc.stdout.on('data', (data) => (stdout += data.toString()))
    proc.stderr.on('data', (data) => (stderr += data.toString()))

    proc.on('close', (code) => {
      if (code === 0) {
        const segmentFileNames = fs.readdirSync(fileDir + '/segments')
        const segmentFilePaths = segmentFileNames.map((filename) =>
          path.resolve(fileDir, 'segments', filename)
        )

        resolve({
          segments: {
            fileNames: segmentFileNames,
            filePaths: segmentFilePaths
          },
          m3u8FilePath
        })
      } else {
        logger.error('Error when processing file with ffmpeg')
        logger.error('Command stdout:', stdout, '\nCommand stderr:', stderr)
        reject(new Error('FFMPEG Error'))
      }
    })
  })
}

/**
 * Transcode file into 320kbps mp3 and store in same directory.
 * @date 01-27-2022
 * @param {Object} params
 * @param {string} params.fileDir the directory of the uploaded track artifact
 * @param {string} params.fileName the uploaded track artifact filename
 * @param {Object} params.logContext the log context used to instantiate a logger
 * @returns {string} the path to the transcode
 */
function transcodeFileTo320(fileDir, fileName, { logContext }) {
  const logger = genericLogger.child(logContext)
  return new Promise((resolve, reject) => {
    const sourcePath = path.resolve(fileDir, fileName)
    const targetPath = path.resolve(fileDir, fileName.split('.')[0] + '-dl.mp3')
    logger.info(`Transcoding file ${sourcePath}...`)

    // Exit if dl-copy file already exists at target path.
    if (fs.existsSync(targetPath)) {
      logger.info(`Downloadable copy already exists at ${targetPath}.`)
      resolve(targetPath)
    }

    // https://ffmpeg.org/ffmpeg-formats.html#hls-2
    const args = [
      '-i',
      sourcePath,
      '-ar',
      '48000', // TODO - move to configs
      '-b:a',
      '320k',
      // "-vn" flag required to allow track uploading with album art
      // https://stackoverflow.com/questions/20193065/how-to-remove-id3-audio-tag-image-or-metadata-from-mp3-with-ffmpeg
      '-vn', // skip inclusion of video, process only the audio file without "video"
      targetPath
    ]
    logger.info(`Spawning: ffmpeg ${args}`)
    const proc = spawn(ffmpeg, args)

    // capture output
    let stdout = ''
    let stderr = ''
    proc.stdout.on('data', (data) => (stdout += data.toString()))
    proc.stderr.on('data', (data) => (stderr += data.toString()))

    proc.on('close', (code) => {
      if (code === 0) {
        if (fs.existsSync(targetPath)) {
          logger.info(`Transcoded file ${targetPath}`)
          resolve(targetPath)
        } else {
          logger.error('Error when processing file with ffmpeg')
          logger.error('Command stdout:', stdout, '\nCommand stderr:', stderr)
          reject(new Error('FFMPEG Error'))
        }
      } else {
        logger.error('Error when processing file with ffmpeg')
        logger.error('Command stdout:', stdout, '\nCommand stderr:', stderr)
        reject(new Error('FFMPEG Error'))
      }
    })
  })
}

module.exports = { segmentFile, transcodeFileTo320 }
