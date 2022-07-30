const axios = require('axios')
const moment = require('moment-timezone')
const Hashids = require('hashids/cjs')

const { dayInHours, weekInHours } = require('./constants')
const models = require('../models')
const config = require('../config')
const { logger } = require('../logging')
const colivingLibsWrapper = require('../colivingLibsInstance')

// default configs
const startBlock = config.get('notificationStartBlock')
const startSlot = config.get('solanaNotificationStartSlot')
// Number of tracks to fetch for new listens on each poll
const trackListenMilestonePollCount = 100

/**
 * For any users missing blockchain id, here we query the values from discprov and fill them in
 */
async function updateBlockchainIds () {
  const { discoveryProvider } = colivingLibsWrapper.getAudiusLibs()

  let usersWithoutBlockchainId = await models.User.findAll({
    attributes: ['walletAddress', 'handle'],
    where: { blockchainUserId: null }
  })
  for (let updateUser of usersWithoutBlockchainId) {
    try {
      let walletAddress = updateUser.walletAddress
      logger.info(`Updating user with wallet ${walletAddress}`)
      const response = await axios({
        method: 'get',
        url: `${discoveryProvider.discoveryProviderEndpoint}/users`,
        params: {
          wallet: walletAddress
        }
      })
      if (response.data.data.length === 1) {
        let respUser = response.data.data[0]
        let missingUserId = respUser.user_id
        let missingHandle = respUser.handle
        let updateObject = { blockchainUserId: missingUserId }

        if (updateUser.handle === null) {
          updateObject['handle'] = missingHandle
        }
        await models.User.update(
          updateObject,
          { where: { walletAddress } }
        )
        logger.info(`Updated wallet ${walletAddress} to blockchainUserId: ${missingUserId}, ${updateUser.handle}`)
        continue
      }
      for (let respUser of response.data.data) {
        // Only update if handles match
        if (respUser.handle === updateUser.handle) {
          let missingUserId = respUser.user_id
          await models.User.update(
            { blockchainUserId: missingUserId },
            { where: { walletAddress, handle: updateUser.handle } }
          )
          logger.info(`Updated wallet ${walletAddress} to blockchainUserId: ${missingUserId}, ${updateUser.handle}`)
          await models.UserNotificationSettings.findOrCreate({ where: { userId: missingUserId } })
        }
      }
    } catch (e) {
      logger.error('Error in updateBlockchainIds', e)
    }
  }
}

/**
 * Queries the discovery provider and returns n most listened to tracks, with the
 * total listen count for each of those tracks
 * This includes track listens writen to Solana
 *
 * @returns Array [{trackId, listenCount}, trackId, listenCount]
 */
async function calculateTrackListenMilestonesFromDiscovery (discoveryProvider) {
  // Pull listen count notification data from discovery provider
  const timeout = 2 /* min */ * 60 /* sec */ * 1000 /* ms */
  const trackListenMilestones = await discoveryProvider.getTrackListenMilestones(timeout)
  const listenCountBody = trackListenMilestones.data
  let parsedListenCounts = []
  for (let key in listenCountBody) {
    parsedListenCounts.push({
      trackId: key,
      listenCount: listenCountBody[key]
    })
  }
  return parsedListenCounts
}

/**
 * For the n most recently listened to tracks, return the all time listen counts for those tracks
 * where n is `trackListenMilestonePollCount
 *
 * @returns Array [{trackId, listenCount}, trackId, listenCount}]
 */
async function calculateTrackListenMilestones () {
  let recentListenCountQuery = {
    attributes: [[models.Sequelize.col('trackId'), 'trackId'],
      [models.Sequelize.fn('max', models.Sequelize.col('hour')), 'hour']],
    order: [[models.Sequelize.col('hour'), 'DESC']],
    group: ['trackId'],
    limit: trackListenMilestonePollCount
  }

  // Distinct tracks
  let res = await models.TrackListenCount.findAll(recentListenCountQuery)
  let tracksListenedTo = res.map((listenEntry) => listenEntry.trackId)

  // Total listens query
  let totalListens = {
    attributes: [
      [models.Sequelize.col('trackId'), 'trackId'],
      [
        models.Sequelize.fn('date_trunc', 'millennium', models.Sequelize.col('hour')),
        'date'
      ],
      [models.Sequelize.fn('sum', models.Sequelize.col('listens')), 'listens']
    ],
    group: ['trackId', 'date'],
    order: [[models.Sequelize.col('listens'), 'DESC']],
    where: {
      trackId: { [models.Sequelize.Op.in]: tracksListenedTo }
    }
  }

  // Map of listens
  let totalListenQuery = await models.TrackListenCount.findAll(totalListens)
  let processedTotalListens = totalListenQuery.map((x) => {
    return { trackId: x.trackId, listenCount: x.listens }
  })

  return processedTotalListens
}

/**
 * Get max block from the NotificationAction table
 * @returns Integer highestBlockNumber
 */
async function getHighestBlockNumber () {
  let highestBlockNumber = await models.NotificationAction.max('blocknumber')
  if (!highestBlockNumber) {
    highestBlockNumber = startBlock
  }
  let date = new Date()
  logger.info(`Highest block: ${highestBlockNumber} - ${date}`)
  return highestBlockNumber
}

/**
 * Get max slot from the SolanaNotificationAction table
 * @returns Integer highestSlot
 */
async function getHighestSlot () {
  let highestSlot = await models.SolanaNotificationAction.max('slot')
  if (!highestSlot) highestSlot = startSlot

  let date = new Date()
  logger.info(`Highest slot: ${highestSlot} - ${date}`)
  return highestSlot
}

/**
 * Checks the user notification settings for both regular and push notifications and
 * returns if they should be notified according to their settings
 *
 * @param {Integer} notificationTarget userId that we want to send a notification to
 * @param {String} prop property name in the settings object
 * @param {Object} tx sequelize tx (optional)
 * @returns Object { notifyWeb: Boolean, notifyMobile: Boolean}
 */
async function shouldNotifyUser (notificationTarget, prop, tx = null) {
  // mobile
  let mobileQuery = { where: { userId: notificationTarget } }
  if (tx) mobileQuery.transaction = tx
  let userNotifSettingsMobile = await models.UserNotificationMobileSettings.findOne(mobileQuery)
  const notifyMobile = (userNotifSettingsMobile && userNotifSettingsMobile[prop]) || false

  // browser push notifications
  let browserPushQuery = { where: { userId: notificationTarget } }
  if (tx) browserPushQuery.transaction = tx
  let userNotifBrowserPushSettings = await models.UserNotificationBrowserSettings.findOne(browserPushQuery)
  const notifyBrowserPush = (userNotifBrowserPushSettings && userNotifBrowserPushSettings[prop]) || false

  return { notifyMobile, notifyBrowserPush }
}

/* We use a JS implementation of the the HashIds protocol (http://hashids.org)
 * to obfuscate our monotonically increasing int IDs as
 * strings in our consumable API.
 *
 * Discovery provider uses a python implementation of the same protocol
 * to encode and decode IDs.
 */
const HASH_SALT = 'azowernasdfoia'
const MIN_LENGTH = 5
const hashids = new Hashids(HASH_SALT, MIN_LENGTH)

/** Encodes an int ID into a string. */
function encodeHashId (id) {
  return hashids.encode([id])
}

/** Decodes a string id into an int. Returns null if an invalid ID. */
function decodeHashId (id) {
  const ids = hashids.decode(id)
  if (!ids.length) return null
  return ids[0]
}

const EmailFrequency = Object.freeze({
  OFF: 'off',
  LIVE: 'live',
  DAILY: 'daily',
  WEEKLY: 'weekly'
})

const MAX_HOUR_TIME_DIFFERENCE = 2

/**
 * Checks if the user should recieve an email base on notification settings and time
 * If setting is live then send email
 * If email was never sent to user then send email
 * If ~1 day has passed for daily frequency, or ~1 week has passed for weekly frequency then send email
 * @param {EmailFrequency} frequency live | daily | weekly
 * @param {moment} currentUtcTime moment datetime
 * @param {moment} lastSentTimestamp moment datetime
 * @param {number} hrsSinceStartOfDay
 * @returns boolean
 */
const shouldSendEmail = (frequency, currentUtcTime, lastSentTimestamp, hrsSinceStartOfDay) => {
  if (frequency === EmailFrequency.OFF) return false
  if (frequency === EmailFrequency.LIVE) return true

  // If this is the first email, then it should render
  if (!lastSentTimestamp) return true

  const isValidFrequency = [EmailFrequency.DAILY, EmailFrequency.WEEKLY].includes(frequency)
  const timeSinceEmail = moment.duration(currentUtcTime.diff(lastSentTimestamp)).asHours()
  const timeThreshold = (frequency === 'daily' ? dayInHours : weekInHours) - 1
  const hasValidTimeDifference = hrsSinceStartOfDay < MAX_HOUR_TIME_DIFFERENCE
  return hasValidTimeDifference && isValidFrequency && timeSinceEmail >= timeThreshold
}

module.exports = {
  encodeHashId,
  decodeHashId,
  updateBlockchainIds,
  calculateTrackListenMilestones,
  calculateTrackListenMilestonesFromDiscovery,
  getHighestBlockNumber,
  getHighestSlot,
  shouldNotifyUser,
  EmailFrequency,
  shouldSendEmail,
  MAX_HOUR_TIME_DIFFERENCE
}
