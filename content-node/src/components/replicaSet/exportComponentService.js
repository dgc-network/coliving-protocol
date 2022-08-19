const _ = require('lodash')

const models = require('../../models')
const { Transaction } = require('sequelize')
const DBManager = require('../../dbManager')

/**
 * Exports all db data (not files) associated with walletPublicKey[] as JSON.
 *
 * @return {
 *  cnodeUsersDict - Map Object containing all db data keyed on cnodeUserUUID
 * }
 */
const exportComponentService = async ({
  walletPublicKeys,
  requestedClockRangeMin,
  requestedClockRangeMax,
  forceExport = false,
  logger
}) => {
  const transaction = await models.sequelize.transaction({
    isolationLevel: Transaction.ISOLATION_LEVELS.REPEATABLE_READ
  })

  const cnodeUsersDict = {}
  try {
    // Fetch cnodeUser for each walletPublicKey.
    const cnodeUsers = await models.CNodeUser.findAll({
      where: { walletPublicKey: walletPublicKeys },
      transaction,
      raw: true
    })
    const cnodeUserUUIDs = cnodeUsers.map(
      (cnodeUser) => cnodeUser.cnodeUserUUID
    )

    // Fetch all data for cnodeUserUUIDs: colivingUsers, agreements, files, clockRecords.

    const [colivingUsers, agreements, files, clockRecords] = await Promise.all([
      models.ColivingUser.findAll({
        where: {
          cnodeUserUUID: cnodeUserUUIDs,
          clock: {
            [models.Sequelize.Op.gte]: requestedClockRangeMin,
            [models.Sequelize.Op.lte]: requestedClockRangeMax
          }
        },
        order: [['clock', 'ASC']],
        transaction,
        raw: true
      }),
      models.Agreement.findAll({
        where: {
          cnodeUserUUID: cnodeUserUUIDs,
          clock: {
            [models.Sequelize.Op.gte]: requestedClockRangeMin,
            [models.Sequelize.Op.lte]: requestedClockRangeMax
          }
        },
        order: [['clock', 'ASC']],
        transaction,
        raw: true
      }),
      models.File.findAll({
        where: {
          cnodeUserUUID: cnodeUserUUIDs,
          clock: {
            [models.Sequelize.Op.gte]: requestedClockRangeMin,
            [models.Sequelize.Op.lte]: requestedClockRangeMax
          }
        },
        order: [['clock', 'ASC']],
        transaction,
        raw: true
      }),
      models.ClockRecord.findAll({
        where: {
          cnodeUserUUID: cnodeUserUUIDs,
          clock: {
            [models.Sequelize.Op.gte]: requestedClockRangeMin,
            [models.Sequelize.Op.lte]: requestedClockRangeMax
          }
        },
        order: [['clock', 'ASC']],
        transaction,
        raw: true
      })
    ])

    /** Bundle all data into cnodeUser objects to maximize import speed. */
    for (const cnodeUser of cnodeUsers) {
      // Add cnodeUserUUID data fields
      cnodeUser.colivingUsers = []
      cnodeUser.agreements = []
      cnodeUser.files = []
      cnodeUser.clockRecords = []

      cnodeUsersDict[cnodeUser.cnodeUserUUID] = cnodeUser
      const curCnodeUserClockVal = cnodeUser.clock

      // Resets cnodeUser clock value to requestedClockRangeMax to ensure consistency with clockRecords data
      // Also ensures secondary knows there is more data to sync
      if (cnodeUser.clock > requestedClockRangeMax) {
        // since clockRecords are returned by clock ASC, clock val at last index is largest clock val
        cnodeUser.clock = requestedClockRangeMax
        logger.info(
          `nodeSync.js#export - cnodeUser clock val ${curCnodeUserClockVal} is higher than requestedClockRangeMax, reset to ${requestedClockRangeMax}`
        )
      }

      // Validate clock values or throw an error
      const maxClockRecord = Math.max(
        ...clockRecords.map((record) => record.clock)
      )
      if (!_.isEmpty(clockRecords) && cnodeUser.clock !== maxClockRecord) {
        const errorMsg = `Cannot export - exported data is not consistent. Exported max clock val = ${cnodeUser.clock} and exported max ClockRecord val ${maxClockRecord}. Fixing and trying again...`
        logger.error(errorMsg)

        if (!forceExport) {
          throw new Error(errorMsg)
        }
      }

      cnodeUser.clockInfo = {
        requestedClockRangeMin,
        requestedClockRangeMax,
        localClockMax: cnodeUser.clock
      }
    }

    colivingUsers.forEach((colivingUser) => {
      cnodeUsersDict[colivingUser.cnodeUserUUID].colivingUsers.push(colivingUser)
    })
    agreements.forEach((agreement) => {
      cnodeUsersDict[agreement.cnodeUserUUID].agreements.push(agreement)
    })
    files.forEach((file) => {
      cnodeUsersDict[file.cnodeUserUUID].files.push(file)
    })
    clockRecords.forEach((clockRecord) => {
      cnodeUsersDict[clockRecord.cnodeUserUUID].clockRecords.push(clockRecord)
    })

    await transaction.commit()

    return cnodeUsersDict
  } catch (e) {
    await transaction.rollback()
    for (const cnodeUserUUID in cnodeUsersDict) {
      await DBManager.fixInconsistentUser(cnodeUserUUID)
    }
    throw new Error(e)
  }
}

module.exports = exportComponentService
