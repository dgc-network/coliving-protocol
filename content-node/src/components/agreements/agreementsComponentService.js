const {
  logger: genericLogger,
  logInfoWithDuration,
  getStartTime
} = require('../../logging')

const AgreementTranscodeHandoffManager = require('./agreementTranscodeHandoffManager')
const AgreementContentUploadManager = require('./agreementContentUploadManager')

/**
 * Upload agreement segment files and make avail - will later be associated with Coliving agreement
 *
 * Also the logic used in /agreement_content_async route. Params are extracted to keys that are necessary for the job so that
 * we can pass this task into a worker queue.
 *
 * @param {Object} logContext the context of the request used to create a generic logger
 * @param {Object} requestProps more request specific context, NOT the req object from Express
 * @returns a success or error server response
 *
 * upload agreement segment files and make avail - will later be associated with Coliving agreement
 * @dev - Prune upload artifacts after successful and failed uploads. Make call without awaiting, and let async queue clean up.
 */
const handleAgreementContentRoute = async ({ logContext }, requestProps) => {
  const logger = genericLogger.child(logContext)
  const { fileName, fileDir, fileDestination, cnodeUserUUID } = requestProps

  const routeTimeStart = getStartTime()

  // Create agreement transcode and segments, and save all to disk
  const codeBlockTimeStart = getStartTime()
  const { transcodeFilePath, segmentFileNames } =
    await AgreementContentUploadManager.transcodeAndSegment(
      { logContext },
      { fileName, fileDir }
    )
  logInfoWithDuration(
    { logger, startTime: codeBlockTimeStart },
    `Successfully re-encoded agreement file=${fileName}`
  )

  const resp = await AgreementContentUploadManager.processTranscodeAndSegments(
    { logContext },
    {
      cnodeUserUUID,
      fileName,
      fileDir,
      transcodeFilePath,
      segmentFileNames,
      fileDestination
    }
  )
  logInfoWithDuration(
    { logger, startTime: routeTimeStart },
    `Successfully handled agreement content for file=${fileName}`
  )

  return resp
}

async function handleTranscodeAndSegment(
  { logContext },
  { fileName, fileDir }
) {
  return AgreementContentUploadManager.transcodeAndSegment(
    { logContext },
    { fileName, fileDir }
  )
}

async function handleTranscodeHandOff(
  { logContext },
  {
    libs,
    fileName,
    fileDir,
    fileNameNoExtension,
    fileDestination,
    session,
    headers
  }
) {
  return AgreementTranscodeHandoffManager.handOff(
    { logContext },
    {
      libs,
      fileName,
      fileDir,
      fileNameNoExtension,
      fileDestination,
      session,
      headers
    }
  )
}

module.exports = {
  handleAgreementContentRoute,
  handleTranscodeAndSegment,
  handleTranscodeHandOff
}
