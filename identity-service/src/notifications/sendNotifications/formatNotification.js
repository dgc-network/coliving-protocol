const models = require('../../models')
const { logger } = require('../../logging')
const {
  notificationTypes,
  actionEntityTypes
} = require('../constants')
const notificationUtils = require('./utils')

const shouldNotifyUser = (userId, prop, settings) => {
  const userNotification = { notifyMobile: false, notifyBrowserPush: false }
  if (!(userId in settings)) return userNotification
  if ('mobile' in settings[userId]) {
    userNotification['mobile'] = settings[userId]['mobile'][prop]
  }
  if ('browser' in settings[userId]) {
    userNotification['browser'] = settings[userId]['browser'][prop]
  }
  return userNotification
}

const getRepostType = (type) => {
  switch (type) {
    case 'digital_content':
      return notificationTypes.Repost.digital_content
    case 'album':
      return notificationTypes.Repost.album
    case 'contentList':
      return notificationTypes.Repost.contentList
    default:
      return ''
  }
}

const getFavoriteType = (type) => {
  switch (type) {
    case 'digital_content':
      return notificationTypes.Favorite.digital_content
    case 'album':
      return notificationTypes.Favorite.album
    case 'contentList':
      return notificationTypes.Favorite.contentList
    default:
      return ''
  }
}

let subscriberPushNotifications = []

async function formatNotifications (notifications, notificationSettings, tx) {
  // Loop through notifications to get the formatted notification
  const formattedNotifications = []

  for (let notif of notifications) {
    // blocknumber parsed for all notification types
    let blocknumber = notif.blocknumber

    // Handle the 'follow' notification type
    if (notif.type === notificationTypes.Follow) {
      let notificationTarget = notif.metadata.followee_user_id
      const shouldNotify = shouldNotifyUser(notificationTarget, 'followers', notificationSettings)
      if (shouldNotify.mobile || shouldNotify.browser) {
        const formattedFollow = {
          ...notif,
          actions: [{
            actionEntityType: actionEntityTypes.User,
            actionEntityId: notif.metadata.follower_user_id,
            blocknumber
          }]
        }
        formattedNotifications.push(formattedFollow)
      }
    }

    // Handle the 'repost' notification type
    // digital_content/album/contentList
    if (notif.type === notificationTypes.Repost.base) {
      let notificationTarget = notif.metadata.entity_owner_id
      const shouldNotify = shouldNotifyUser(notificationTarget, 'reposts', notificationSettings)
      if (shouldNotify.mobile || shouldNotify.browser) {
        const formattedRepost = {
          ...notif,
          actions: [{
            actionEntityType: actionEntityTypes.User,
            actionEntityId: notif.initiator,
            blocknumber
          }],
          entityId: notif.metadata.entity_id,
          // we're going to overwrite this property so fetchNotificationMetadata can use it
          type: getRepostType(notif.metadata.entity_type)
        }
        formattedNotifications.push(formattedRepost)
      }
    }

    // Handle the 'favorite' notification type, digital_content/album/contentList
    if (notif.type === notificationTypes.Favorite.base) {
      let notificationTarget = notif.metadata.entity_owner_id
      const shouldNotify = shouldNotifyUser(notificationTarget, 'favorites', notificationSettings)
      if (shouldNotify.mobile || shouldNotify.browser) {
        const formattedFavorite = {
          ...notif,
          actions: [{
            actionEntityType: actionEntityTypes.User,
            actionEntityId: notif.initiator,
            blocknumber
          }],
          entityId: notif.metadata.entity_id,
          // we're going to overwrite this property so fetchNotificationMetadata can use it
          type: getFavoriteType(notif.metadata.entity_type)
        }
        formattedNotifications.push(formattedFavorite)
      }
    }

    // Handle the 'remix create' notification type
    if (notif.type === notificationTypes.RemixCreate) {
      let notificationTarget = notif.metadata.remix_parent_digital_content_user_id
      const shouldNotify = shouldNotifyUser(notificationTarget, 'remixes', notificationSettings)
      if (shouldNotify.mobile || shouldNotify.browser) {
        const formattedRemixCreate = {
          ...notif,
          actions: [{
            actionEntityType: actionEntityTypes.User,
            actionEntityId: notif.metadata.remix_parent_digital_content_user_id,
            blocknumber
          }, {
            actionEntityType: actionEntityTypes.DigitalContent,
            actionEntityId: notif.metadata.entity_id,
            blocknumber
          }, {
            actionEntityType: actionEntityTypes.DigitalContent,
            actionEntityId: notif.metadata.remix_parent_digital_content_id,
            blocknumber
          }],
          entityId: notif.metadata.entity_id,
          type: notificationTypes.RemixCreate
        }
        formattedNotifications.push(formattedRemixCreate)
      }
    }

    // Handle the remix cosign notification type
    if (notif.type === notificationTypes.RemixCosign) {
      const formattedRemixCosign = {
        ...notif,
        entityId: notif.metadata.entity_id,
        actions: [{
          actionEntityType: actionEntityTypes.User,
          actionEntityId: notif.initiator,
          blocknumber
        }, {
          actionEntityType: actionEntityTypes.DigitalContent,
          actionEntityId: notif.metadata.entity_id,
          blocknumber
        }],
        type: notificationTypes.RemixCosign
      }
      formattedNotifications.push(formattedRemixCosign)
    }

    // Handle 'challenge reward' notification type
    if (notif.type === notificationTypes.ChallengeReward) {
      const formattedRewardNotification = {
        ...notif,
        challengeId: notif.metadata.challenge_id,
        actions: [{
          actionEntityType: notif.metadata.challenge_id,
          actionEntityId: notif.initiator,
          slot: notif.slot
        }],
        type: notificationTypes.ChallengeReward
      }
      formattedNotifications.push(formattedRewardNotification)
    }

    // Handle 'listen milestone' notification type
    if (notif.type === notificationTypes.MilestoneListen) {
      let notificationTarget = notif.initiator
      const shouldNotify = shouldNotifyUser(notificationTarget, 'milestonesAndAchievements', notificationSettings)
      if (shouldNotify.mobile || shouldNotify.browser) {
        const formattedListenMilstoneNotification = {
          ...notif,
          entityId: notif.metadata.entity_id,
          type: notificationTypes.MilestoneListen,
          actions: [{
            actionEntityType: actionEntityTypes.DigitalContent,
            actionEntityId: notif.metadata.threshold
          }]
        }
        formattedNotifications.push(formattedListenMilstoneNotification)
      }
    }

    // Handle 'tier change' notification type
    if (notif.type === notificationTypes.TierChange) {
      const formattedTierChangeNotification = {
        ...notif,
        tier: notif.metadata.tier,
        actions: [{
          actionEntityType: actionEntityTypes.User,
          actionEntityId: notif.initiator,
          blocknumber
        }],
        type: notificationTypes.TierChange
      }
      formattedNotifications.push(formattedTierChangeNotification)
    }

    // Handle the 'create' notification type, digital_content/album/contentList
    if (notif.type === notificationTypes.Create.base) {
      await _processCreateNotifications(notif, tx)
    }

    // Handle the 'digital_content added to contentList' notification type
    if (notif.type === notificationTypes.AddDigitalContentToContentList) {
      const formattedAddDigitalContentToContentListNotification = {
        ...notif,
        actions: [{
          actionEntityType: actionEntityTypes.DigitalContent,
          actionDigitalContentId: notif.metadata.digital_content_id,
          blocknumber
        }],
        metadata: {
          digitalContentOwnerId: notif.metadata.digital_content_owner_id,
          contentListOwnerId: notif.initiator,
          contentListId: notif.metadata.content_list_id
        },
        entityId: notif.metadata.digital_content_id,
        type: notificationTypes.AddDigitalContentToContentList
      }
      formattedNotifications.push(formattedAddDigitalContentToContentListNotification)
    }

    if (notif.type === notificationTypes.Reaction) {
      const formattedReactionNotification = {
        ...notif
      }
      formattedNotifications.push(formattedReactionNotification)
    }

    if (notif.type === notificationTypes.SupporterRankUp) {
      // Need to create two notifs
      const supportingRankUp = {
        ...notif,
        type: notificationTypes.SupportingRankUp
      }
      const supporterRankUp = {
        ...notif,
        type: notificationTypes.SupporterRankUp
      }

      formattedNotifications.push(supportingRankUp)
      formattedNotifications.push(supporterRankUp)
    }

    if (notif.type === notificationTypes.Tip) {
      // For tip, need sender userId, and amount
      const formattedTipNotification = {
        ...notif,
        type: notificationTypes.TipReceive
      }
      formattedNotifications.push(formattedTipNotification)
    }
  }
  const [formattedCreateNotifications, users] = await _processSubscriberPushNotifications()
  formattedNotifications.push(...formattedCreateNotifications)
  return { notifications: formattedNotifications, users: [...users] }
}

async function _processSubscriberPushNotifications () {
  const filteredFormattedCreateNotifications = []
  const users = []
  let currentTime = Date.now()
  for (var i = 0; i < subscriberPushNotifications.length; i++) {
    let entry = subscriberPushNotifications[i]
    let timeSince = currentTime - entry.time
    if (timeSince > notificationUtils.getPendingCreateDedupeMs()) {
      filteredFormattedCreateNotifications.push(entry)
      users.push(entry.initiator)
      entry.pending = false
    }
  }

  subscriberPushNotifications = subscriberPushNotifications.filter(x => x.pending)
  return [filteredFormattedCreateNotifications, users]
}

async function _processCreateNotifications (notif, tx) {
  let blocknumber = notif.blocknumber
  let createType = null
  let actionEntityType = null
  switch (notif.metadata.entity_type) {
    case 'digital_content':
      createType = notificationTypes.Create.digital_content
      actionEntityType = actionEntityTypes.DigitalContent
      break
    case 'album':
      createType = notificationTypes.Create.album
      actionEntityType = actionEntityTypes.User
      break
    case 'contentList':
      createType = notificationTypes.Create.contentList
      actionEntityType = actionEntityTypes.User
      break
    default:
      throw new Error('Invalid create type')
  }

  // Query user IDs from subscriptions table
  // Notifications go to all users subscribing to this digital_content uploader
  let subscribers = await models.Subscription.findAll({
    where: {
      userId: notif.initiator
    },
    transaction: tx
  })

  // No operation if no users subscribe to this creator
  if (subscribers.length === 0) { return [] }

  // The notification entity id is the uploader id for digitalContents
  // Each digital_content will added to the notification actions table
  // For contentList/albums, the notification entity id is the collection id itself
  let notificationEntityId =
    actionEntityType === actionEntityTypes.DigitalContent
      ? notif.initiator
      : notif.metadata.entity_id

  // Action table entity is digitalContentId for CreateDigitalContent notifications
  // Allowing multiple digital_content creates to be associated w/ a single notif for your subscription
  // For collections, the entity is the owner id, producing a distinct notif for each
  let createdActionEntityId =
    actionEntityType === actionEntityTypes.DigitalContent
      ? notif.metadata.entity_id
      : notif.metadata.entity_owner_id

  // Create notification for each subscriber
  const formattedNotifications = subscribers.map((s) => {
    // send push notification to each subscriber
    return {
      ...notif,
      actions: [{
        actionEntityType: actionEntityType,
        actionEntityId: createdActionEntityId,
        blocknumber
      }],
      entityId: notificationEntityId,
      time: Date.now(),
      pending: true,
      // Add notification for this user indicating the uploader has added a digital_content
      subscriberId: s.subscriberId,
      // we're going to overwrite this property so fetchNotificationMetadata can use it
      type: createType
    }
  })
  subscriberPushNotifications.push(...formattedNotifications)

  // Dedupe album /contentList notification
  if (createType === notificationTypes.Create.album ||
      createType === notificationTypes.Create.contentList) {
    let digitalContentIdObjectList = notif.metadata.collection_content.digital_content_ids
    let digitalContentIdsArray = digitalContentIdObjectList.map(x => x.digital_content)

    if (digitalContentIdObjectList.length > 0) {
      // Clear duplicate push notifications in local queue
      let dupeFound = false
      for (let i = 0; i < subscriberPushNotifications.length; i++) {
        let pushNotif = subscriberPushNotifications[i]
        let type = pushNotif.type
        if (type === notificationTypes.Create.digital_content) {
          let pushActionEntityId = pushNotif.metadata.entity_id
          // Check if this pending notification includes a duplicate digital_content
          if (digitalContentIdsArray.includes(pushActionEntityId)) {
            logger.debug(`Found dupe push notif ${type}, digitalContentId: ${pushActionEntityId}`)
            dupeFound = true
            subscriberPushNotifications[i].pending = false
          }
        }
      }

      if (dupeFound) {
        subscriberPushNotifications = subscriberPushNotifications.filter(x => x.pending)
      }
    }
  }
}

module.exports = formatNotifications
