const { logger } = require('../../logging')
const moment = require('moment-timezone')
const models = require('../../models')
const { sequelize, Sequelize } = require('../../models')

const logPrefix = 'notifications content list updates -'

/**
 * Process content list update notifications
 * upsert lastUpdated and userLastViewed in the DB for each subscriber of a content list
 * @param {Array<Object>} notifications
 * @param {*} tx The DB transaction to attach to DB requests
 */
async function processContentListUpdateNotifications (notifications, tx) {
  /**
     * keep agreement of last content list updates for each user that favorited content lists
     * e.g. { user1: { content list1: <timestamp1>, content list2: <timestamp2>, ... }, ... }
     */
  const startTime = Date.now()
  logger.info(`${logPrefix} num notifications: ${notifications.length}, start: ${startTime}`)
  const userContentListUpdatesMap = {}
  notifications.forEach(notification => {
    const { metadata } = notification
    const {
      entity_id: content listId,
      content list_update_timestamp: content listUpdatedAt,
      content list_update_users: userIds
    } = metadata
    userIds.forEach(userId => {
      if (userContentListUpdatesMap[userId]) {
        userContentListUpdatesMap[userId][content listId] = content listUpdatedAt
      } else {
        userContentListUpdatesMap[userId] = { [content listId]: content listUpdatedAt }
      }
    })
  })

  const userIds = Object.keys(userContentListUpdatesMap)
  logger.info(`${logPrefix} parsed notifications, num user ids: ${userIds.length}, time: ${Date.now() - startTime}ms`)

  // get wallets for all user ids and map each blockchain user id to their wallet
  const userIdsAndWallets = await models.User.findAll({
    attributes: ['blockchainUserId', 'walletAddress'],
    where: {
      blockchainUserId: userIds,
      walletAddress: { [models.Sequelize.Op.ne]: null }
    },
    transaction: tx
  })
  logger.info(`${logPrefix} selected wallets, num wallets: ${userIdsAndWallets.length}, time: ${Date.now() - startTime}ms`)

  const userIdToWalletsMap = {}
  for (const { blockchainUserId, walletAddress } of userIdsAndWallets) {
    userIdToWalletsMap[blockchainUserId] = walletAddress
  }

  logger.info(`${logPrefix} made wallet map, time: ${Date.now() - startTime}ms`)

  // get content list updates for all wallets and map each wallet to its content list updates
  const userWalletsAndContentListUpdates = await models.UserEvents.findAll({
    attributes: ['walletAddress', 'content listUpdates'],
    where: {
      walletAddress: Object.values(userIdToWalletsMap)
    },
    transaction: tx
  })

  logger.info(`${logPrefix} found updates, time: ${Date.now() - startTime}ms`)

  const userWalletToContentListUpdatesMap = {}
  for (const { walletAddress, content listUpdates } of userWalletsAndContentListUpdates) {
    userWalletToContentListUpdatesMap[walletAddress] = content listUpdates
  }

  logger.info(`${logPrefix} mapped updates, num updates: ${userWalletsAndContentListUpdates.length}, time: ${Date.now() - startTime}ms`)

  const newUserEvents = userIds
    .map(userId => {
      const walletAddress = userIdToWalletsMap[userId]
      if (!walletAddress) return null

      const dbContentListUpdates = userWalletToContentListUpdatesMap[walletAddress] || {}
      const fetchedContentListUpdates = userContentListUpdatesMap[userId]
      Object.keys(fetchedContentListUpdates).forEach(content listId => {
        const fetchedLastUpdated = moment(fetchedContentListUpdates[content listId]).utc()
        dbContentListUpdates[content listId] = {
          // in case user favorited this agreement before and has no UserEvent record of it
          userLastViewed: fetchedLastUpdated.subtract(1, 'seconds').valueOf(),
          ...dbContentListUpdates[content listId],
          lastUpdated: fetchedLastUpdated.valueOf()
        }
      })

      return [walletAddress, JSON.stringify(dbContentListUpdates)]
    })
    .filter(Boolean)

  logger.info(`${logPrefix} mapped events, time: ${Date.now() - startTime}ms`)

  const results = await sequelize.query(`
    INSERT INTO "UserEvents" ("walletAddress", "content listUpdates", "createdAt", "updatedAt")
    VALUES ${newUserEvents.map(_ => '(?,now(),now())').join(',')}
    ON CONFLICT ("walletAddress") DO UPDATE
      SET "content listUpdates" = "excluded"."content listUpdates"
  `, {
    replacements: newUserEvents,
    type: Sequelize.QueryTypes.INSERT
  })

  logger.info(`${logPrefix} bulk upserted updates, rows: ${results}, time: ${Date.now() - startTime}ms`)
  return notifications
}

module.exports = processContentListUpdateNotifications
