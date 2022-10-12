const path = require('path')
const ServiceCommands = require('@coliving/service-commands')
const { logger } = require('../logger.js')
const {
  uploadDigitalContent,
  RandomUtils
} = ServiceCommands
const {
  getRandomDigitalContentMetadata,
  getRandomDigitalContentFilePath
} = RandomUtils

const TEMP_STORAGE_PATH = path.resolve('./local-storage/tmp/')

const uploadDigitalContentsforUsers = async ({
  executeAll,
  executeOne,
  walletIndexToUserIdMap
}) => {
  // Issue parallel uploads for all users
  const digitalContentIds = await executeAll(async (libs, i) => {
    // Retrieve user id if known from walletIndexToUserIdMap
    // NOTE - It might be easier to just create a map of wallets instead of using 'index'
    const userId = walletIndexToUserIdMap[i]
    const newDigitalContentMetadata = getRandomDigitalContentMetadata(userId)
    const randomDigitalContentFilePath = await getRandomDigitalContentFilePath(TEMP_STORAGE_PATH)
    logger.info(
      `Uploading DigitalContent for userId:${userId} (${libs.walletAddress}), ${randomDigitalContentFilePath}, ${JSON.stringify(newDigitalContentMetadata)}`
    )
    try {
      const startTime = Date.now()
      const digitalContentId = await executeOne(i, (l) =>
        uploadDigitalContent(
          l,
          newDigitalContentMetadata,
          randomDigitalContentFilePath
        )
      )
      const duration = Date.now() - startTime
      logger.info(`Uploaded digital_content for userId=${userId}, digitalContentId=${digitalContentId} in ${duration}ms`)
      return digitalContentId
    } catch (e) {
      logger.error(`Error uploading digital_content for userId:${userId} :${e}`)
    }
  })
  return digitalContentIds
}

module.exports.uploadDigitalContentsforUsers = uploadDigitalContentsforUsers
