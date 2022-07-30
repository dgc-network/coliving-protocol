const { logger } = require('../../logging')
const moment = require('moment-timezone')
const models = require('../../models')
const { sequelize, Sequelize } = require('../../models')

const logPrefix = 'notifications playlist updates -'

/**
 * Process playlist update notifications
 * upsert lastUpdated and userLastViewed in the DB for each subscriber of a playlist
 * @param {Array<Object>} notifications
 * @param {*} tx The DB transaction to attach to DB requests
 */
async function processPlaylistUpdateNotifications (notifications, tx) {
  /**
     * keep track of last playlist updates for each user that favorited playlists
     * e.g. { user1: { playlist1: <timestamp1>, playlist2: <timestamp2>, ... }, ... }
     */
  const startTime = Date.now()
  logger.info(`${logPrefix} num notifications: ${notifications.length}, start: ${startTime}`)
  const userPlaylistUpdatesMap = {}
  notifications.forEach(notification => {
    const { metadata } = notification
    const {
      entity_id: playlistId,
      playlist_update_timestamp: playlistUpdatedAt,
      playlist_update_users: userIds
    } = metadata
    userIds.forEach(userId => {
      if (userPlaylistUpdatesMap[userId]) {
        userPlaylistUpdatesMap[userId][playlistId] = playlistUpdatedAt
      } else {
        userPlaylistUpdatesMap[userId] = { [playlistId]: playlistUpdatedAt }
      }
    })
  })

  const userIds = Object.keys(userPlaylistUpdatesMap)
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

  // get playlist updates for all wallets and map each wallet to its playlist updates
  const userWalletsAndPlaylistUpdates = await models.UserEvents.findAll({
    attributes: ['walletAddress', 'playlistUpdates'],
    where: {
      walletAddress: Object.values(userIdToWalletsMap)
    },
    transaction: tx
  })

  logger.info(`${logPrefix} found updates, time: ${Date.now() - startTime}ms`)

  const userWalletToPlaylistUpdatesMap = {}
  for (const { walletAddress, playlistUpdates } of userWalletsAndPlaylistUpdates) {
    userWalletToPlaylistUpdatesMap[walletAddress] = playlistUpdates
  }

  logger.info(`${logPrefix} mapped updates, num updates: ${userWalletsAndPlaylistUpdates.length}, time: ${Date.now() - startTime}ms`)

  const newUserEvents = userIds
    .map(userId => {
      const walletAddress = userIdToWalletsMap[userId]
      if (!walletAddress) return null

      const dbPlaylistUpdates = userWalletToPlaylistUpdatesMap[walletAddress] || {}
      const fetchedPlaylistUpdates = userPlaylistUpdatesMap[userId]
      Object.keys(fetchedPlaylistUpdates).forEach(playlistId => {
        const fetchedLastUpdated = moment(fetchedPlaylistUpdates[playlistId]).utc()
        dbPlaylistUpdates[playlistId] = {
          // in case user favorited this track before and has no UserEvent record of it
          userLastViewed: fetchedLastUpdated.subtract(1, 'seconds').valueOf(),
          ...dbPlaylistUpdates[playlistId],
          lastUpdated: fetchedLastUpdated.valueOf()
        }
      })

      return [walletAddress, JSON.stringify(dbPlaylistUpdates)]
    })
    .filter(Boolean)

  logger.info(`${logPrefix} mapped events, time: ${Date.now() - startTime}ms`)

  const results = await sequelize.query(`
    INSERT INTO "UserEvents" ("walletAddress", "playlistUpdates", "createdAt", "updatedAt")
    VALUES ${newUserEvents.map(_ => '(?,now(),now())').join(',')}
    ON CONFLICT ("walletAddress") DO UPDATE
      SET "playlistUpdates" = "excluded"."playlistUpdates"
  `, {
    replacements: newUserEvents,
    type: Sequelize.QueryTypes.INSERT
  })

  logger.info(`${logPrefix} bulk upserted updates, rows: ${results}, time: ${Date.now() - startTime}ms`)
  return notifications
}

module.exports = processPlaylistUpdateNotifications
