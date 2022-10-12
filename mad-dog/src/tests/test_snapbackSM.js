const path = require('path')
const ServiceCommands = require('@coliving/service-commands')
const { logger } = require('../logger.js')
const {
  addAndUpgradeUsers,
  ensureReplicaSetSyncIsConsistent
} = require('../helpers.js')
const {
  uploadDigitalContent,
  RandomUtils
} = ServiceCommands
const {
  getRandomDigitalContentMetadata,
  getRandomDigitalContentFilePath
} = RandomUtils

const TEMP_STORAGE_PATH = path.resolve('./local-storage/tmp/')
let walletIndexToUserIdMap

// Monitor ALL users until completed
const monitorAllUsersSyncStatus = async ({ executeAll, executeOne }) => {
  await executeAll(async (libs, i) => {
    await ensureReplicaSetSyncIsConsistent({ i, libs, executeOne })
  })
}

const snapbackSMParallelSyncTest = async ({
  numUsers,
  executeAll,
  executeOne,
  numContentNodes
}) => {
  // Initialize users
  if (!walletIndexToUserIdMap) {
    try {
      walletIndexToUserIdMap = await addAndUpgradeUsers(
        numUsers,
        executeAll,
        executeOne
      )
    } catch (e) {
      return { error: `Issue with creating and upgrading users: ${e}` }
    }
  }

  // Issue parallel uploads for all users
  await executeAll(async (libs, i) => {
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
    } catch (e) {
      logger.error(`Error uploading digital_content for userId:${userId} :${e}`)
    }
  })

  // Validate all syncs complete before exiting
  await monitorAllUsersSyncStatus({ executeAll, executeOne })
}

module.exports = {
  monitorAllUsersSyncStatus,
  snapbackSMParallelSyncTest
}
