const models = require('../../models')
const { notificationTypes } = require('../constants')
const { fetchNotificationMetadata } = require('../fetchNotificationMetadata')
const formatNotifications = require('./formatNotification')
const publishNotifications = require('./publishNotifications')

function getUserIdsToNotify (notifications) {
  return notifications.reduce((userIds, notification) => {
    // Add user id from notification based on notification type
    switch (notification.type) {
      case notificationTypes.Follow:
        return userIds.concat(notification.metadata.followee_user_id)
      case notificationTypes.Repost.base:
        return userIds.concat(notification.metadata.entity_owner_id)
      case notificationTypes.Favorite.base:
        return userIds.concat(notification.metadata.entity_owner_id)
      case notificationTypes.RemixCreate:
        return userIds.concat(notification.metadata.remix_parent_agreement_user_id)
      case notificationTypes.AddAgreementToContentList:
        return userIds.concat(notification.metadata.agreement_owner_id)
      case notificationTypes.ChallengeReward:
      case notificationTypes.MilestoneListen:
      case notificationTypes.TierChange:
        return userIds.concat(notification.initiator)
      case notificationTypes.Tip:
        const receiverId = notification.initiator
        return userIds.concat(receiverId)
      case notificationTypes.Reaction:
        // Specifically handle tip reactions
        if (notification.metadata.reaction_type !== 'tip') {
          return userIds
        }
        // For reactions, add the tip_sender_id in the reacted_to_entity
        return userIds.concat(notification.metadata.reacted_to_entity.tip_sender_id)
      case notificationTypes.SupporterRankUp:
        // For SupporterRankUp, need to send notifs to both supporting and supported users
        const supportingId = notification.metadata.entity_id
        const supportedId = notification.initiator
        return userIds.concat([supportingId, supportedId])
      default:
        return userIds
    }
  }, [])
}

/**
 * Given an array of user ids, get the users' mobile & browser push notification settings
 * @param {Array<number>} userIdsToNotify List of user ids to retrieve the settings for
 * @param {*} tx
 */
const getUserNotificationSettings = async (userIdsToNotify, tx) => {
  const userNotificationSettings = {}

  // Batch fetch mobile push notifications for userIds
  let mobileQuery = { where: { userId: { [models.Sequelize.Op.in]: userIdsToNotify } }, transaction: tx }
  let userNotifSettingsMobile = await models.UserNotificationMobileSettings.findAll(mobileQuery)
  userNotifSettingsMobile.forEach(settings => {
    userNotificationSettings[settings.userId] = { mobile: settings }
  })

  // Batch fetch browser push notifications for userIds
  let browserPushQuery = { where: { userId: { [models.Sequelize.Op.in]: userIdsToNotify } }, transaction: tx }
  let userNotifBrowserPushSettings = await models.UserNotificationBrowserSettings.findAll(browserPushQuery)
  userNotifBrowserPushSettings.forEach(settings => {
    userNotificationSettings[settings.userId] = { ...(userNotificationSettings[settings.userId] || {}), browser: settings }
  })
  return userNotificationSettings
}

/**
 * Fetches all users to send a push notification, gets their users' push notifications settings,
 * populates notifications with extra data from DP, and adds the notification to the queue
 * @param {Object} colivingLibs Instance of coliving libs
 * @param {Array<Object>} notifications Array of notifications from DP
 * @param {*} tx The DB transaction to add to every DB query
 * @param {*} optimizelyClient Optimizely client for feature flags
 */
async function sendNotifications (colivingLibs, notifications, tx, optimizelyClient) {
  // Parse the notification to grab the user ids that we want to notify
  const userIdsToNotify = getUserIdsToNotify(notifications)

  // Using the userIds to notify, check the DB for their notification settings
  const userNotificationSettings = await getUserNotificationSettings(userIdsToNotify, tx)

  // Format the notifications, so that the extra information needed to build the notification is in a standard format
  const { notifications: formattedNotifications, users } = await formatNotifications(notifications, userNotificationSettings, tx)

  // Get the metadata for the notifications - users/agreements/content lists from DP that are in the notification
  const metadata = await fetchNotificationMetadata(colivingLibs, users, formattedNotifications)

  // using the metadata, populate the notifications, and push them to the publish queue
  await publishNotifications(formattedNotifications, metadata, userNotificationSettings, tx, optimizelyClient)
}

module.exports = sendNotifications

module.exports.getUserIdsToNotify = getUserIdsToNotify
module.exports.getUserNotificationSettings = getUserNotificationSettings
module.exports.formatNotifications = formatNotifications
module.exports.fetchNotificationMetadata = fetchNotificationMetadata
