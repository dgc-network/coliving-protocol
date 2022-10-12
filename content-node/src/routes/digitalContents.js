const express = require('express')
const path = require('path')
const fs = require('fs')
const { Buffer } = require('buffer')
const { promisify } = require('util')

const config = require('../config')
const models = require('../models')
const {
  saveFileFromBufferToDisk,
  removeDigitalContentFolder,
  getTmpDigitalContentUploadArtifactsPathWithInputUUID,
  handleDigitalContentUpload
} = require('../fileManager')
const {
  handleResponse,
  sendResponse,
  successResponse,
  errorResponseBadRequest,
  errorResponseServerError,
  errorResponseForbidden
} = require('../apiHelpers')
const {
  validateStateForImageDirCIDAndReturnFileUUID,
  currentNodeShouldHandleTranscode
} = require('../utils')
const {
  authMiddleware,
  ensurePrimaryMiddleware,
  issueAndWaitForSecondarySyncRequests,
  ensureStorageMiddleware,
  ensureValidSPMiddleware
} = require('../middlewares')
const { decode } = require('../hashids')
const { getCID, streamFromFileSystem } = require('./files')
const DBManager = require('../dbManager')
const { generateListenTimestampAndSignature } = require('../apiSigning')
const BlacklistManager = require('../blacklistManager')
const TranscodingQueue = require('../transcodingQueue')

const readFile = promisify(fs.readFile)

const router = express.Router()

/**
 * Add a digital_content transcode task into the worker queue. If the digital_content file is uploaded properly (not transcoded), return successResponse
 * @note this digital_content content route is used in conjunction with the polling.
 */
router.post(
  '/digital_content_async',
  authMiddleware,
  ensurePrimaryMiddleware,
  ensureStorageMiddleware,
  handleDigitalContentUpload,
  handleResponse(async (req, res) => {
    if (req.fileSizeError || req.fileFilterError) {
      removeDigitalContentFolder({ logContext: req.logContext }, req.fileDir)
      return errorResponseBadRequest(req.fileSizeError || req.fileFilterError)
    }

    const AsyncProcessingQueue =
      req.app.get('serviceRegistry').asyncProcessingQueue

    const selfTranscode = currentNodeShouldHandleTranscode({
      transcodingQueueCanAcceptMoreJobs: await TranscodingQueue.isAvailable(),
      spID: config.get('spID')
    })

    if (selfTranscode) {
      await AsyncProcessingQueue.addDigitalContentUploadTask({
        logContext: req.logContext,
        req: {
          fileName: req.fileName,
          fileDir: req.fileDir,
          fileDestination: req.file.destination,
          cnodeUserUUID: req.session.cnodeUserUUID
        }
      })
    } else {
      await AsyncProcessingQueue.addTranscodeHandOffTask({
        logContext: req.logContext,
        req: {
          fileName: req.fileName,
          fileDir: req.fileDir,
          fileNameNoExtension: req.fileNameNoExtension,
          fileDestination: req.file.destination,
          cnodeUserUUID: req.session.cnodeUserUUID,
          headers: req.headers
        }
      })
    }

    return successResponse({ uuid: req.logContext.requestID })
  })
)

/**
 * Delete all temporary transcode artifacts from digital_content transcode handoff flow.
 * This is called on the node that was handed off the transcode to clear the state from disk
 */
router.post(
  '/clear_transcode_and_segment_artifacts',
  ensureValidSPMiddleware,
  handleResponse(async (req, res) => {
    const fileDir = req.body.fileDir
    req.logger.info('Clearing filesystem fileDir', fileDir)
    if (!fileDir.includes('tmp_digital_content_artifacts')) {
      return errorResponseBadRequest(
        'Cannot remove digital_content folder outside temporary digital_content artifacts'
      )
    }
    await removeDigitalContentFolder({ logContext: req.logContext }, fileDir)

    return successResponse()
  })
)

/**
 * Given that the requester is a valid SP, the current Content Node has enough storage,
 * upload the digital_content to the current node and add a transcode and segmenting job to the queue.
 *
 * This route is used on an available SP when the primary sends over a transcode and segment request
 * to initiate the transcode handoff. This route does not run on the primary.
 */
router.post(
  '/transcode_and_segment',
  ensureValidSPMiddleware,
  ensureStorageMiddleware,
  handleDigitalContentUpload,
  handleResponse(async (req, res) => {
    const AsyncProcessingQueue =
      req.app.get('serviceRegistry').asyncProcessingQueue

    await AsyncProcessingQueue.addTranscodeAndSegmentTask({
      logContext: req.logContext,
      req: {
        fileName: req.fileName,
        fileDir: req.fileDir,
        uuid: req.logContext.requestID
      }
    })

    return successResponse({ uuid: req.logContext.requestID })
  })
)

/**
 * Given that the request is coming from a valid SP, serve the corresponding file
 * from the transcode handoff
 *
 * This route is called from the primary to request the transcoded files after
 * sending the first request for the transcode handoff. This route does not run on the primary.
 */
router.get(
  '/transcode_and_segment',
  ensureValidSPMiddleware,
  async (req, res) => {
    const fileName = req.query.fileName
    const fileType = req.query.fileType
    const uuid = req.query.uuid

    if (!fileName || !fileType || !uuid) {
      return sendResponse(
        req,
        res,
        errorResponseBadRequest(
          `No provided filename=${fileName}, fileType=${fileType}, or uuid=${uuid}`
        )
      )
    }

    const basePath = getTmpDigitalContentUploadArtifactsPathWithInputUUID(uuid)
    let pathToFile
    if (fileType === 'transcode') {
      pathToFile = path.join(basePath, fileName)
    } else if (fileType === 'segment') {
      pathToFile = path.join(basePath, 'segments', fileName)
    } else if (fileType === 'm3u8') {
      pathToFile = path.join(basePath, fileName)
    }

    try {
      return await streamFromFileSystem(req, res, pathToFile)
    } catch (e) {
      return sendResponse(
        req,
        res,
        errorResponseServerError(
          `Could not serve content, error=${e.toString()}`
        )
      )
    }
  }
)

/**
 * Given digital_content metadata object, save metadata to disk. Return metadata multihash if successful.
 * If metadata is for a downloadable digital_content, ensures transcoded master record exists in DB
 */
router.post(
  '/digital_contents/metadata',
  authMiddleware,
  ensurePrimaryMiddleware,
  ensureStorageMiddleware,
  handleResponse(async (req, res) => {
    const metadataJSON = req.body.metadata

    if (
      !metadataJSON ||
      !metadataJSON.owner_id ||
      !metadataJSON.digital_content_segments ||
      !Array.isArray(metadataJSON.digital_content_segments) ||
      !metadataJSON.digital_content_segments.length
    ) {
      return errorResponseBadRequest(
        'Metadata object must include owner_id and non-empty digital_content_segments array'
      )
    }

    // If metadata indicates digital_content is downloadable but doesn't provide a transcode CID,
    //    ensure that a transcoded master record exists in DB
    if (
      metadataJSON.download &&
      metadataJSON.download.is_downloadable &&
      !metadataJSON.download.cid
    ) {
      const sourceFile = req.body.sourceFile
      const digitalContentId = metadataJSON.digital_content_id
      if (!sourceFile && !digitalContentId) {
        return errorResponseBadRequest(
          'Cannot make downloadable - A sourceFile must be provided or the metadata object must include digital_content_id'
        )
      }

      // See if the digital_content already has a transcoded master
      if (digitalContentId) {
        const { blockchainId } = await models.DigitalContent.findOne({
          attributes: ['blockchainId'],
          where: {
            blockchainId: digitalContentId
          },
          order: [['clock', 'DESC']]
        })

        // Error if no DB entry for transcode found
        const transcodedFile = await models.File.findOne({
          attributes: ['multihash'],
          where: {
            cnodeUserUUID: req.session.cnodeUserUUID,
            type: 'copy320',
            digitalContentBlockchainId: blockchainId
          }
        })
        if (!transcodedFile) {
          return errorResponseServerError('Failed to find transcoded file')
        }
      }
    }

    const metadataBuffer = Buffer.from(JSON.stringify(metadataJSON))
    const cnodeUserUUID = req.session.cnodeUserUUID

    // Save file from buffer to disk
    let multihash, dstPath
    try {
      const resp = await saveFileFromBufferToDisk(req, metadataBuffer)
      multihash = resp.cid
      dstPath = resp.dstPath
    } catch (e) {
      return errorResponseServerError(
        `/digital_contents/metadata saveFileFromBufferToDisk op failed: ${e}`
      )
    }

    // Record metadata file entry in DB
    const transaction = await models.sequelize.transaction()
    let fileUUID
    try {
      const createFileQueryObj = {
        multihash,
        sourceFile: req.fileName,
        storagePath: dstPath,
        type: 'metadata' // TODO - replace with models enum
      }
      const file = await DBManager.createNewDataRecord(
        createFileQueryObj,
        cnodeUserUUID,
        models.File,
        transaction
      )
      fileUUID = file.fileUUID

      await transaction.commit()
    } catch (e) {
      await transaction.rollback()
      return errorResponseServerError(`Could not save to db db: ${e}`)
    }

    // Await 2/3 write quorum (replicating data to at least 1 secondary)
    await issueAndWaitForSecondarySyncRequests(req)

    return successResponse({
      metadataMultihash: multihash,
      metadataFileUUID: fileUUID
    })
  })
)

/**
 * Given digital_content blockchainDigitalContentId, blockNumber, and metadataFileUUID, creates/updates DigitalContent DB digital_content entry
 * and associates segment & image file entries with digital_content. Ends digital_content creation/update process.
 */
router.post(
  '/digitalContents',
  authMiddleware,
  ensurePrimaryMiddleware,
  ensureStorageMiddleware,
  handleResponse(async (req, res) => {
    const {
      blockchainDigitalContentId,
      blockNumber,
      metadataFileUUID,
      transcodedDigitalContentUUID
    } = req.body

    // Input validation
    if (!blockchainDigitalContentId || !blockNumber || !metadataFileUUID) {
      return errorResponseBadRequest(
        'Must include blockchainDigitalContentId, blockNumber, and metadataFileUUID.'
      )
    }

    // Error on outdated blocknumber
    const cnodeUser = req.session.cnodeUser
    if (blockNumber < cnodeUser.latestBlockNumber) {
      return errorResponseBadRequest(
        `Invalid blockNumber param ${blockNumber}. Must be greater or equal to previously processed blocknumber ${cnodeUser.latestBlockNumber}.`
      )
    }
    const cnodeUserUUID = req.session.cnodeUserUUID

    // Fetch metadataJSON for metadataFileUUID, error if not found or malformatted
    const file = await models.File.findOne({
      where: { fileUUID: metadataFileUUID, cnodeUserUUID }
    })
    if (!file) {
      return errorResponseBadRequest(
        `No file db record found for provided metadataFileUUID ${metadataFileUUID}.`
      )
    }
    let metadataJSON
    try {
      const fileBuffer = await readFile(file.storagePath)
      metadataJSON = JSON.parse(fileBuffer)
      if (
        !metadataJSON ||
        !metadataJSON.digital_content_segments ||
        !Array.isArray(metadataJSON.digital_content_segments) ||
        !metadataJSON.digital_content_segments.length
      ) {
        return errorResponseServerError(
          `Malformatted metadataJSON stored for metadataFileUUID ${metadataFileUUID}.`
        )
      }
    } catch (e) {
      return errorResponseServerError(
        `No file stored on disk for metadataFileUUID ${metadataFileUUID} at storagePath ${file.storagePath}.`
      )
    }

    // Get coverArtFileUUID for multihash in metadata object, else error
    let coverArtFileUUID
    try {
      coverArtFileUUID = await validateStateForImageDirCIDAndReturnFileUUID(
        req,
        metadataJSON.cover_art_sizes
      )
    } catch (e) {
      return errorResponseServerError(e.message)
    }

    const transaction = await models.sequelize.transaction()
    try {
      const existingDigitalContentEntry = await models.DigitalContent.findOne({
        where: {
          cnodeUserUUID,
          blockchainId: blockchainDigitalContentId
        },
        order: [['clock', 'DESC']],
        transaction
      })

      // Insert digital_content entry in DB
      const createDigitalContentQueryObj = {
        metadataFileUUID,
        metadataJSON,
        blockchainId: blockchainDigitalContentId,
        coverArtFileUUID
      }
      const digital_content = await DBManager.createNewDataRecord(
        createDigitalContentQueryObj,
        cnodeUserUUID,
        models.DigitalContent,
        transaction
      )

      /**
       * Associate matching transcode & segment files on DB with new/updated digital_content
       * Must be done in same transaction to atomicity
       *
       * TODO - consider implications of edge-case -> two attempted /digital_content before associate
       */

      const digitalContentSegmentCIDs = metadataJSON.digital_content_segments.map(
        (segment) => segment.multihash
      )

      // if digital_content created, ensure files exist with digitalContentBlockchainId = null and update them
      if (!existingDigitalContentEntry) {
        if (!transcodedDigitalContentUUID) {
          throw new Error('Cannot create digital_content without transcodedDigitalContentUUID.')
        }

        // Associate the transcode file db record with digital_content_UUID
        const transcodedFile = await models.File.findOne({
          where: {
            fileUUID: transcodedDigitalContentUUID,
            cnodeUserUUID,
            digitalContentBlockchainId: null,
            type: 'copy320'
          },
          transaction
        })
        if (!transcodedFile || !transcodedFile.sourceFile) {
          throw new Error(
            'Did not find a transcoded file for the provided CID.'
          )
        }
        const transcodeAssociateNumAffectedRows = await models.File.update(
          { digitalContentBlockchainId: digital_content.blockchainId },
          {
            where: {
              fileUUID: transcodedDigitalContentUUID,
              cnodeUserUUID,
              digitalContentBlockchainId: null,
              type: 'copy320' // TODO - replace with model enum
            },
            transaction
          }
        )
        if (transcodeAssociateNumAffectedRows === 0) {
          throw new Error(
            'Failed to associate the transcoded file for the provided digital_content UUID.'
          )
        }

        // Associate all segment file db records with digital_content_UUID
        const digitalContentFiles = await models.File.findAll({
          where: {
            multihash: digitalContentSegmentCIDs,
            cnodeUserUUID,
            digitalContentBlockchainId: null,
            type: 'digital_content',
            sourceFile: transcodedFile.sourceFile
          },
          transaction
        })

        if (digitalContentFiles.length !== digitalContentSegmentCIDs.length) {
          req.logger.error(
            `Did not find files for every digital_content segment CID for user ${cnodeUserUUID} ${digitalContentFiles} ${digitalContentSegmentCIDs}`
          )
          throw new Error('Did not find files for every digital_content segment CID.')
        }
        const segmentsAssociateNumAffectedRows = await models.File.update(
          { digitalContentBlockchainId: digital_content.blockchainId },
          {
            where: {
              multihash: digitalContentSegmentCIDs,
              cnodeUserUUID,
              digitalContentBlockchainId: null,
              type: 'digital_content',
              sourceFile: transcodedFile.sourceFile
            },
            transaction
          }
        )
        if (
          parseInt(segmentsAssociateNumAffectedRows, 10) !==
          digitalContentSegmentCIDs.length
        ) {
          req.logger.error(
            `Failed to associate files for every digital_content segment CID ${cnodeUserUUID} ${digital_content.blockchainId} ${segmentsAssociateNumAffectedRows} ${digitalContentSegmentCIDs.length}`
          )
          throw new Error(
            'Failed to associate files for every digital_content segment CID.'
          )
        }
      } /** updateDigitalContent scenario */ else {
        /**
         * If digital_content updated, ensure files exist with digitalContentBlockchainId
         */

        // Ensure transcode file db record exists, if uuid provided
        if (transcodedDigitalContentUUID) {
          const transcodedFile = await models.File.findOne({
            where: {
              fileUUID: transcodedDigitalContentUUID,
              cnodeUserUUID,
              digitalContentBlockchainId: digital_content.blockchainId,
              type: 'copy320'
            },
            transaction
          })
          if (!transcodedFile) {
            throw new Error(
              'Did not find the corresponding transcoded file for the provided digital_content UUID.'
            )
          }
        }

        // Ensure segment file db records exist for all CIDs
        const digitalContentFiles = await models.File.findAll({
          where: {
            multihash: digitalContentSegmentCIDs,
            cnodeUserUUID,
            digitalContentBlockchainId: digital_content.blockchainId,
            type: 'digital_content'
          },
          transaction
        })
        if (digitalContentFiles.length < digitalContentSegmentCIDs.length) {
          throw new Error(
            'Did not find files for every digital_content segment CID with digitalContentBlockchainId.'
          )
        }
      }

      // Update cnodeUser's latestBlockNumber if higher than previous latestBlockNumber.
      // TODO - move to subquery to guarantee atomicity.
      const updatedCNodeUser = await models.CNodeUser.findOne({
        where: { cnodeUserUUID },
        transaction
      })
      if (!updatedCNodeUser || !updatedCNodeUser.latestBlockNumber) {
        throw new Error('Issue in retrieving udpatedCnodeUser')
      }
      req.logger.info(
        `cnodeuser ${cnodeUserUUID} first latestBlockNumber ${cnodeUser.latestBlockNumber} || \
        current latestBlockNumber ${updatedCNodeUser.latestBlockNumber} || \
        given blockNumber ${blockNumber}`
      )
      if (blockNumber > updatedCNodeUser.latestBlockNumber) {
        // Update cnodeUser's latestBlockNumber
        await cnodeUser.update(
          { latestBlockNumber: blockNumber },
          { transaction }
        )
      }

      await transaction.commit()

      // Discovery only indexes metadata and not files, so we eagerly replicate data but don't await it
      issueAndWaitForSecondarySyncRequests(req, true)

      return successResponse()
    } catch (e) {
      req.logger.error(e.message)
      await transaction.rollback()
      return errorResponseServerError(e.message)
    }
  })
)

/** Returns download status of digital_content and 320kbps CID if ready + downloadable. */
router.get(
  '/digital_contents/download_status/:blockchainId',
  handleResponse(async (req, res) => {
    const blockchainId = req.params.blockchainId
    if (!blockchainId) {
      return errorResponseBadRequest('Please provide blockchainId.')
    }

    const digital_content = await models.DigitalContent.findOne({
      where: { blockchainId },
      order: [['clock', 'DESC']]
    })
    if (!digital_content) {
      return errorResponseBadRequest(
        `No digital_content found for blockchainId ${blockchainId}`
      )
    }

    // Case: digital_content is not marked as downloadable
    if (
      !digital_content.metadataJSON ||
      !digital_content.metadataJSON.download ||
      !digital_content.metadataJSON.download.is_downloadable
    ) {
      return successResponse({ isDownloadable: false, cid: null })
    }

    // Case: digital_content is marked as downloadable
    // - Check if downloadable file exists. Since copyFile may or may not have digitalContentBlockchainId association,
    //    fetch a segmentFile for digitalContentBlockchainId, and find copyFile for segmentFile's sourceFile.
    const segmentFile = await models.File.findOne({
      where: {
        type: 'digital_content',
        digitalContentBlockchainId: digital_content.blockchainId
      }
    })
    const copyFile = await models.File.findOne({
      where: {
        type: 'copy320',
        sourceFile: segmentFile.sourceFile
      }
    })

    // Serve from file system
    return successResponse({
      isDownloadable: true,
      cid: copyFile ? copyFile.multihash : null
    })
  })
)

/**
 * Gets a streamable mp3 link for a digital_content by encodedId. Supports range request headers.
 * @dev - Wrapper around getCID, which retrieves digital_content given its CID.
 **/
router.get(
  '/digital_contents/stream/:encodedId',
  async (req, res, next) => {
    const libs = req.app.get('colivingLibs')
    const redisClient = req.app.get('redisClient')
    const delegateOwnerWallet = config.get('delegateOwnerWallet')

    const encodedId = req.params.encodedId
    if (!encodedId) {
      return sendResponse(
        req,
        res,
        errorResponseBadRequest('Please provide a digital_content ID')
      )
    }

    const blockchainId = decode(encodedId)
    if (!blockchainId) {
      return sendResponse(
        req,
        res,
        errorResponseBadRequest(`Invalid ID: ${encodedId}`)
      )
    }

    const isNotServable = await BlacklistManager.digitalContentIdIsInBlacklist(
      blockchainId
    )
    if (isNotServable) {
      return sendResponse(
        req,
        res,
        errorResponseForbidden(
          `digitalContentId=${blockchainId} cannot be served by this node`
        )
      )
    }

    let fileRecord = await models.File.findOne({
      attributes: ['multihash'],
      where: {
        type: 'copy320',
        digitalContentBlockchainId: blockchainId
      },
      order: [['clock', 'DESC']]
    })

    if (!fileRecord) {
      try {
        // see if there's a fileRecord in redis so we can short circuit all this logic
        let redisFileRecord = await redisClient.get(
          `streamFallback:::${blockchainId}`
        )
        if (redisFileRecord) {
          redisFileRecord = JSON.parse(redisFileRecord)
          if (redisFileRecord && redisFileRecord.multihash) {
            fileRecord = redisFileRecord
          }
        }
      } catch (e) {
        req.logger.error(
          { error: e },
          'Error looking for stream fallback in redis'
        )
      }
    }

    // if digital_content didn't finish the upload process and was never associated, there may not be a digitalContentBlockchainId for the File records,
    // try to fall back to discovery to fetch the metadata multihash and see if you can deduce the copy320 file
    if (!fileRecord) {
      try {
        let digitalContentRecord = await libs.DigitalContent.getDigitalContents(1, 0, [blockchainId])
        if (
          !digitalContentRecord ||
          digitalContentRecord.length === 0 ||
          !digitalContentRecord[0].hasOwnProperty('blocknumber')
        ) {
          return sendResponse(
            req,
            res,
            errorResponseServerError(
              'Missing or malformatted digital_content fetched from discovery node.'
            )
          )
        }

        digitalContentRecord = digitalContentRecord[0]

        // query the files table for a metadata multihash from discovery for a given digital_content
        // no need to add CNodeUserUUID to the filter because the digital_content is associated with a user and that contains the
        // user_id inside it which is unique to the user
        const file = await models.File.findOne({
          where: {
            multihash: digitalContentRecord.metadata_multihash,
            type: 'metadata'
          }
        })
        if (!file) {
          return sendResponse(
            req,
            res,
            errorResponseServerError(
              'Missing or malformatted digital_content fetched from discovery node.'
            )
          )
        }

        // make sure all digital_content segments have the same sourceFile
        const segments = digitalContentRecord.digital_content_segments.map(
          (segment) => segment.multihash
        )

        const fileSegmentRecords = await models.File.findAll({
          attributes: ['sourceFile'],
          where: {
            multihash: segments,
            cnodeUserUUID: file.cnodeUserUUID
          },
          raw: true
        })

        // check that the number of files in the Files table for these segments for this user matches the number of segments from the metadata object
        if (fileSegmentRecords.length !== digitalContentRecord.digital_content_segments.length) {
          req.logger.warn(
            `DigitalContent stream content mismatch for blockchainId ${blockchainId} - number of segments don't match between local and discovery`
          )
        }

        // check that there's a single sourceFile that all File records share by getting an array of uniques
        const uniqSourceFiles = fileSegmentRecords
          .map((record) => record.sourceFile)
          .filter((v, i, a) => a.indexOf(v) === i)

        if (uniqSourceFiles.length !== 1) {
          req.logger.warn(
            `DigitalContent stream content mismatch for blockchainId ${blockchainId} - there's not one sourceFile that matches all segments`
          )
        }

        // search for the copy320 record based on the sourceFile
        fileRecord = await models.File.findOne({
          attributes: ['multihash'],
          where: {
            type: 'copy320',
            sourceFile: uniqSourceFiles[0]
          },
          raw: true
        })

        // cache the fileRecord in redis for an hour so we don't have to keep making requests to discovery
        if (fileRecord) {
          redisClient.set(
            `streamFallback:::${blockchainId}`,
            JSON.stringify(fileRecord),
            'EX',
            60 * 60
          )
        }
      } catch (e) {
        req.logger.error(
          { error: e },
          `Error falling back to reconstructing data from discovery to stream`
        )
      }
    }

    if (!fileRecord || !fileRecord.multihash) {
      return sendResponse(
        req,
        res,
        errorResponseBadRequest(
          `No file found for blockchainId ${blockchainId}`
        )
      )
    }

    if (libs.identityService) {
      req.logger.info(
        `Logging listen for digital_content ${blockchainId} by ${delegateOwnerWallet}`
      )
      const signatureData = generateListenTimestampAndSignature(
        config.get('delegatePrivateKey')
      )
      // Fire and forget listen recording
      // TODO: Consider queueing these requests
      libs.identityService.logDigitalContentListen(
        blockchainId,
        delegateOwnerWallet,
        req.ip,
        signatureData
      )
    }

    req.params.CID = fileRecord.multihash
    req.params.streamable = true
    res.set('Content-Type', 'digitalcoin/mpeg')
    next()
  },
  getCID
)

module.exports = router
