const express = require('express')
const fs = require('fs')
const { promisify } = require('util')

const models = require('../models')
const { saveFileFromBufferToDisk } = require('../fileManager')
const {
  handleResponse,
  successResponse,
  errorResponseBadRequest,
  errorResponseServerError
} = require('../apiHelpers')
const { validateStateForImageDirCIDAndReturnFileUUID } = require('../utils')
const { validateMetadata } = require('../utils/index.js')
const {
  authMiddleware,
  ensurePrimaryMiddleware,
  ensureStorageMiddleware,
  issueAndWaitForSecondarySyncRequests
} = require('../middlewares')
const DBManager = require('../dbManager')

const readFile = promisify(fs.readFile)

const router = express.Router()

/**
 * Create ContentList from provided metadata, and make metadata available to network
 */
router.post(
  '/content lists/metadata',
  authMiddleware,
  ensurePrimaryMiddleware,
  ensureStorageMiddleware,
  handleResponse(async (req, res) => {
    const metadataJSON = req.body.metadata
    const metadataBuffer = Buffer.from(JSON.stringify(metadataJSON))
    const cnodeUserUUID = req.session.cnodeUserUUID
    const isValidMetadata = validateMetadata(req, metadataJSON)
    if (!isValidMetadata) {
      return errorResponseBadRequest('Invalid ContentList Metadata')
    }

    // Save file from buffer to disk
    let multihash, dstPath
    try {
      const resp = await saveFileFromBufferToDisk(req, metadataBuffer)
      multihash = resp.cid
      dstPath = resp.dstPath
    } catch (e) {
      return errorResponseServerError(
        `saveFileFromBufferToDisk op failed: ${e}`
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
        type: 'metadata'
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
      return errorResponseServerError(
        `Could not save content list metadata to db: ${e}`
      )
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
 * Given content list blockchainId, blockNumber, and metadataFileUUID, creates/updates ContentList DB entry
 * and associates image file entries with content list. Ends content list creation/update process.
 */
router.post(
  '/content lists',
  authMiddleware,
  ensurePrimaryMiddleware,
  ensureStorageMiddleware,
  handleResponse(async (req, res) => {
    const { blockchainId, blockNumber, metadataFileUUID } = req.body

    if (!blockchainId || !blockNumber || !metadataFileUUID) {
      return errorResponseBadRequest(
        'Must include blockchainId, blockNumber, and metadataFileUUID.'
      )
    }

    const cnodeUser = req.session.cnodeUser
    if (blockNumber < cnodeUser.latestBlockNumber) {
      return errorResponseBadRequest(
        `Invalid blockNumber param ${blockNumber}. Must be greater or equal to previously processed blocknumber ${cnodeUser.latestBlockNumber}.`
      )
    }

    const cnodeUserUUID = req.session.cnodeUserUUID

    // Fetch metadataJSON for metadataFileUUID.
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
    } catch (e) {
      return errorResponseServerError(
        `No file stored on disk for metadataFileUUID ${metadataFileUUID} at storagePath ${file.storagePath}: ${e}.`
      )
    }

    // Get content listImageFileUUID for multihashes in metadata object, if present.
    let contentListImageFileUUID
    try {
      contentListImageFileUUID =
        await validateStateForImageDirCIDAndReturnFileUUID(
          req,
          metadataJSON.content_list_image_sizes_multihash
        )
    } catch (e) {
      return errorResponseBadRequest(e.message)
    }

    // Record ContentList entry + update CNodeUser entry in DB
    const transaction = await models.sequelize.transaction()
    try {
      const createContentListQueryObj = {
        metadataFileUUID,
        metadataJSON,
        blockchainId,
        contentListImageFileUUID
      }
      await DBManager.createNewDataRecord(
        createContentListQueryObj,
        cnodeUserUUID,
        models.ContentList,
        transaction
      )

      // Update cnodeUser.latestBlockNumber
      await cnodeUser.update(
        { latestBlockNumber: blockNumber },
        { transaction }
      )

      await transaction.commit()

      // Discovery only indexes metadata and not files, so we eagerly replicate data but don't await it
      issueAndWaitForSecondarySyncRequests(req, true)

      return successResponse()
    } catch (e) {
      await transaction.rollback()
      return errorResponseServerError(e.message)
    }
  })
)

module.exports = router
