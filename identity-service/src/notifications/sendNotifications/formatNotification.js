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
    case 'agreement':
      return notificationTypes.Repost.agreement
    case 'album':
      return notificationTypes.Repost.album
    case 'content list':
      return notificationTypes.Repost.content list
    default:
      return ''
  }
}

const getFavoriteType = (type) => {
  switch (type) {
    case 'agreement':
      return notificationTypes.Favorite.agreement
    case 'album':
      return notificationTypes.Favorite.album
    case 'content list':
      return notificationTypes.Favorite.content list
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
    // agreement/album/content list
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

    // Handle the 'favorite' notification type, agreement/album/content list
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
      let notificationTarget = notif.metadata.remix_parent_agreement_user_id
      const shouldNotify = shouldNotifyUser(notificationTarget, 'remixes', notificationSettings)
      if (shouldNotify.mobile || shouldNotify.browser) {
        const formattedRemixCreate = {
          ...notif,
          actions: [{
            actionEntityType: actionEntityTypes.User,
            actionEntityId: notif.metadata.remix_parent_agreement_user_id,
            blocknumber
          }, {
            actionEntityType: actionEntityTypes.Agreement,
            actionEntityId: notif.metadata.entity_id,
            blocknumber
          }, {
            actionEntityType: actionEntityTypes.Agreement,
            actionEntityId: notif.metadata.remix_parent_agreement_id,
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
          actionEntityType: actionEntityTypes.Agreement,
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
            actionEntityType: actionEntityTypes.Agreement,
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

    // Handle the 'create' notification type, agreement/album/content list
    if (notif.type === notificationTypes.Create.base) {
      await _processCreateNotifications(notif, tx)
    }

    // Handle the 'agreement added to content list' notification type
    if (notif.type === notificationTypes.AddAgreementToContentList) {
      const formattedAddAgreementToContentListNotification = {
        ...notif,
        actions: [{
          actionEntityType: actionEntityTypes.Agreement,
          actionAgreementId: notif.metadata.agreement_id,
          blocknumber
        }],
        metadata: {
          agreementOwnerId: notif.metadata.agreement_owner_id,
          content listOwnerId: notif.initiator,
          content listId: notif.metadata.content list_id
        },
        entityId: notif.metadata.agreement_id,
        type: notificationTypes.AddAgreementToContentList
      }
      formattedNotifications.push(formattedAddAgreementToContentListNotification)
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
    case 'agreement':
      createType = notificationTypes.Create.agreement
      actionEntityType = actionEntityTypes.Agreement
      break
    case 'album':
      createType = notificationTypes.Create.album
      actionEntityType = actionEntityTypes.User
      break
    case 'content list':
      createType = notificationTypes.Create.content list
      actionEntityType = actionEntityTypes.User
      break
    default:
      throw new Error('Invalid create type')
  }

  // Query user IDs from subscriptions table
  // Notifications go to all users subscribing to this agreement uploader
  let subscribers = await models.Subscription.findAll({
    where: {
      userId: notif.initiator
    },
    transaction: tx
  })

  // No operation if no users subscribe to this creator
  if (subscribers.length === 0) { return [] }

  // The notification entity id is the uploader id for agreements
  // Each agreement will added to the notification actions table
  // For content list/albums, the notification entity id is the collection id itself
  let notificationEntityId =
    actionEntityType === actionEntityTypes.Agreement
      ? notif.initiator
      : notif.metadata.entity_id

  // Action table entity is agreementId for CreateAgreement notifications
  // Allowing multiple agreement creates to be associated w/ a single notif for your subscription
  // For collections, the entity is the owner id, producing a distinct notif for each
  let createdActionEntityId =
    actionEntityType === actionEntityTypes.Agreement
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
      // Add notification for this user indicating the uploader has added a agreement
      subscriberId: s.subscriberId,
      // we're going to overwrite this property so fetchNotificationMetadata can use it
      type: createType
    }
  })
  subscriberPushNotifications.push(...formattedNotifications)

  // Dedupe album /content list notification
  if (createType === notificationTypes.Create.album ||
      createType === notificationTypes.Create.content list) {
    let agreementIdObjectList = notif.metadata.collection_content.agreement_ids
    let agreementIdsArray = agreementIdObjectList.map(x => x.agreement)

    if (agreementIdObjectList.length > 0) {
      // Clear duplicate push notifications in local queue
      let dupeFound = false
      for (let i = 0; i < subscriberPushNotifications.length; i++) {
        let pushNotif = subscriberPushNotifications[i]
        let type = pushNotif.type
        if (type === notificationTypes.Create.agreement) {
          let pushActionEntityId = pushNotif.metadata.entity_id
          // Check if this pending notification includes a duplicate agreement
          if (agreementIdsArray.includes(pushActionEntityId)) {
            logger.debug(`Found dupe push notif ${type}, agreementId: ${pushActionEntityId}`)
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
