const path = require('path')
const ServiceCommands = require('@coliving/service-commands')
const { logger } = require('../logger.js')
const {
  uploadAgreement,
  RandomUtils
} = ServiceCommands
const {
  getRandomAgreementMetadata,
  getRandomAgreementFilePath
} = RandomUtils

const TEMP_STORAGE_PATH = path.resolve('./local-storage/tmp/')

const uploadAgreementsforUsers = async ({
  executeAll,
  executeOne,
  walletIndexToUserIdMap
}) => {
  // Issue parallel uploads for all users
  const agreementIds = await executeAll(async (libs, i) => {
    // Retrieve user id if known from walletIndexToUserIdMap
    // NOTE - It might be easier to just create a map of wallets instead of using 'index'
    const userId = walletIndexToUserIdMap[i]
    const newAgreementMetadata = getRandomAgreementMetadata(userId)
    const randomAgreementFilePath = await getRandomAgreementFilePath(TEMP_STORAGE_PATH)
    logger.info(
      `Uploading Agreement for userId:${userId} (${libs.walletAddress}), ${randomAgreementFilePath}, ${JSON.stringify(newAgreementMetadata)}`
    )
    try {
      const startTime = Date.now()
      const agreementId = await executeOne(i, (l) =>
        uploadAgreement(
          l,
          newAgreementMetadata,
          randomAgreementFilePath
        )
      )
      const duration = Date.now() - startTime
      logger.info(`Uploaded agreement for userId=${userId}, agreementId=${agreementId} in ${duration}ms`)
      return agreementId
    } catch (e) {
      logger.error(`Error uploading agreement for userId:${userId} :${e}`)
    }
  })
  return agreementIds
}

module.exports.uploadAgreementsforUsers = uploadAgreementsforUsers
