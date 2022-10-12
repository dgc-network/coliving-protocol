const axios = require('axios')
const moment = require('moment')
const { sampleSize, isEqual } = require('lodash')

const models = require('../models')
const { logger } = require('../logging')
const {
  deviceType,
  notificationTypes
} = require('./constants')
const { publish } = require('./notificationQueue')
const {
  decodeHashId,
  shouldNotifyUser
} = require('./utils')
const { fetchNotificationMetadata } = require('./fetchNotificationMetadata')
const {
  notificationResponseMap,
  notificationResponseTitleMap,
  pushNotificationMessagesMap
} = require('./formatNotificationMetadata')
const colivingLibsWrapper = require('../colivingLibsInstance')
const { getRemoteVar, REMOTE_VARS } = require('../remoteConfig')

const TRENDING_TIME = Object.freeze({
  DAY: 'day',
  WEEK: 'week',
  MONTH: 'month',
  YEAR: 'year'
})

const TRENDING_GENRE = Object.freeze({
  ALL: 'all'
})

const getTimeGenreActionType = (time, genre) => `${time}:${genre}`

// The minimum time in hrs between notifications
const TRENDING_INTERVAL_HOURS = 3

// The highest rank for which a notification will be sent
const MAX_TOP_AGREEMENT_RANK = 10

// The number of discovery nodes to test and verify that trending
// is consistent
const NUM_DISCOVERY_NODES_FOR_CONSENSUS = 3

let SELECTED_DISCOVERY_NODES = null
setInterval(async () => {
  SELECTED_DISCOVERY_NODES = await getDiscoveryNodes()
}, 5 * 60 * 60 /* re-run on the 5-minute */)

const getDiscoveryNodes = async () => {
  const libs = await colivingLibsWrapper.getColivingLibsAsync()
  const discoveryNodes = await libs.discoveryNode.serviceSelector.findAll()
  logger.debug(`Updating discovery nodes for trendingAgreementProcessing to ${discoveryNodes}`)
  return sampleSize(discoveryNodes, NUM_DISCOVERY_NODES_FOR_CONSENSUS)
}

async function getTrendingAgreements (trendingExperiment, discoveryNodes) {
  const results = await Promise.all(discoveryNodes.map(async discoveryNode => {
    try {
      // The owner info is then used to target listenCount milestone notifications
      let params = new URLSearchParams()
      params.append('time', TRENDING_TIME.WEEK)
      params.append('limit', MAX_TOP_AGREEMENT_RANK)

      const baseUrl = `${discoveryNode}/v1/full/agreements/trending`
      const url = trendingExperiment
        ? `${baseUrl}/${trendingExperiment}`
        : `${baseUrl}`

      const trendingAgreementsResponse = await axios({
        method: 'get',
        url,
        params,
        timeout: 10000
      })
      const trendingAgreements = trendingAgreementsResponse.data.data.map((digital_content, idx) => ({
        agreementId: decodeHashId(digital_content.id),
        rank: idx + 1,
        userId: decodeHashId(digital_content.user.id)
      }))
      const blocknumber = trendingAgreementsResponse.data.latest_indexed_block
      return { trendingAgreements, blocknumber }
    } catch (err) {
      logger.error(`Unable to fetch trending agreements: ${err}`)
      return null
    }
  }))

  // Make sure we had no errors
  if (results.some(res => res === null)) {
    logger.error(`Unable to fetch trending agreements from all nodes`)
    return null
  }

  // Make sure trending is consistent between nodes
  const { trendingAgreements, blocknumber } = results[0]
  for (const result of results.slice(1)) {
    const {
      trendingAgreements: otherTrendingAgreements
    } = result
    if (!isEqual(trendingAgreements, otherTrendingAgreements)) {
      const ids = trendingAgreements.map(t => t.agreementId)
      const otherIds = otherTrendingAgreements.map(t => t.agreementId)
      logger.error(`Trending results diverged ${ids} versus ${otherIds}`)
      return null
    }
  }

  logger.debug(`Trending results converged with ${trendingAgreements.map(t => t.agreementId)}`)
  return { trendingAgreements, blocknumber }
}

/**
 * For each of the trending agreements
 * check if the digital_content meets the constraints to become a notification
 *   - If the trending digital_content was not already created in the past 3 hrs
 *   - The trending digital_content should be new or move up in rank ie. from rank 4 => rank 1
 * Insert the notification and notificationAction into the DB
 * Check the user's notification settings, and if enabled, send a push notification
 * @param {ColivingLibs} colivingLibs Coliving Libs instance
 * @param {number} blocknumber Blocknumber of the discovery node
 * @param {Array<{ agreementId: number, rank: number, userId: number }>} trendingAgreements Array of the trending agreements
 * @param {*} tx DB transaction
 */
async function processTrendingAgreements (colivingLibs, blocknumber, trendingAgreements, tx) {
  const now = moment()
  for (let idx = 0; idx < trendingAgreements.length; idx += 1) {
    const { rank, agreementId, userId } = trendingAgreements[idx]
    const { notifyMobile, notifyBrowserPush } = await shouldNotifyUser(userId, 'milestonesAndAchievements')

    // Check if the notification was previously created
    let existingTrendingAgreements = await models.Notification.findAll({
      where: {
        userId: userId,
        type: notificationTypes.TrendingAgreement,
        entityId: agreementId
      },
      include: [{
        model: models.NotificationAction,
        as: 'actions'
      }],
      order: [['timestamp', 'DESC']],
      limit: 1,
      transaction: tx
    })
    if (existingTrendingAgreements.length > 0) {
      const previousRank = existingTrendingAgreements[0].actions[0].actionEntityId
      const previousCreated = moment(existingTrendingAgreements[0].timestamp)
      const duration = moment.duration(now.diff(previousCreated)).asHours()
      // If the user was notified of the trending digital_content within the last TRENDING_INTERVAL_HOURS skip
      // If the new rank is not less than the old rank, skip
      //   ie. Skip if digital_content moved from #2 trending to #3 trending or stayed the same
      if (duration < TRENDING_INTERVAL_HOURS || previousRank <= rank) {
        // Skip the insertion of the notification into the DB
        // This trending digital_content does not meet the constraints
        continue
      }
    }

    const actionEntityType = getTimeGenreActionType(TRENDING_TIME.WEEK, TRENDING_GENRE.ALL)
    const trendingAgreementNotification = await models.Notification.create({
      userId: userId,
      type: notificationTypes.TrendingAgreement,
      entityId: agreementId,
      blocknumber,
      timestamp: now
    }, { transaction: tx })
    const notificationId = trendingAgreementNotification.id
    await models.NotificationAction.create({
      notificationId,
      actionEntityType,
      actionEntityId: rank,
      blocknumber
    },
    { transaction: tx }
    )

    if (notifyMobile || notifyBrowserPush) {
      const notifStub = {
        userId: userId,
        type: notificationTypes.TrendingAgreement,
        entityId: agreementId,
        blocknumber,
        timestamp: now,
        actions: [{
          actionEntityType,
          actionEntityId: rank,
          blocknumber
        }]
      }

      const metadata = await fetchNotificationMetadata(colivingLibs, [], [notifStub])
      const mapNotification = notificationResponseMap[notificationTypes.TrendingAgreement]
      try {
        let msgGenNotif = {
          ...notifStub,
          ...(mapNotification(notifStub, metadata))
        }
        logger.debug('processTrendingAgreement - About to generate message for trending digital_content milestone push notification', msgGenNotif, metadata)
        const msg = pushNotificationMessagesMap[notificationTypes.TrendingAgreement](msgGenNotif)
        logger.debug(`processTrendingAgreement - message: ${msg}`)
        const title = notificationResponseTitleMap[notificationTypes.TrendingAgreement]()
        let types = []
        if (notifyMobile) types.push(deviceType.Mobile)
        if (notifyBrowserPush) types.push(deviceType.Browser)
        await publish(msg, userId, tx, true, title, types)
      } catch (e) {
        // Log on error instead of failing
        logger.error(`Error adding trending digital_content push notification to buffer: ${e}. ${JSON.stringify({ rank, agreementId, userId })}`)
      }
    }
  }
}

async function indexTrendingAgreements (colivingLibs, optimizelyClient, tx) {
  try {
    const trendingExperiment = getRemoteVar(optimizelyClient, REMOTE_VARS.TRENDING_EXPERIMENT)
    if (!SELECTED_DISCOVERY_NODES) return

    const { trendingAgreements, blocknumber } = await getTrendingAgreements(trendingExperiment, SELECTED_DISCOVERY_NODES)
    await processTrendingAgreements(colivingLibs, blocknumber, trendingAgreements, tx)
  } catch (err) {
    logger.error(`Unable to process trending digital_content notifications: ${err.message}`)
  }
}

module.exports = {
  TRENDING_TIME,
  TRENDING_GENRE,
  getTimeGenreActionType,
  indexTrendingAgreements,
  getTrendingAgreements,
  processTrendingAgreements
}
