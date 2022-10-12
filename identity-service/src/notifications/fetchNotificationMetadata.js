const moment = require('moment')
const axios = require('axios')
const models = require('../models')
const { notificationTypes: NotificationType } = require('../notifications/constants')
const Entity = require('../routes/notifications').Entity
const mergeColivingAnnoucements = require('../routes/notifications').mergeColivingAnnoucements
const { formatEmailNotificationProps } = require('./formatNotificationMetadata')

const config = require('../config.js')
const { logger } = require('../logging')

const USER_NODE_IPFS_GATEWAY = config.get('environment').includes('staging') ? 'https://usermetadata.staging.coliving.lol/ipfs/' : 'https://usermetadata.coliving.lol/ipfs/'

const DEFAULT_IMAGE_URL = 'https://download.coliving.lol/static-resources/email/imageProfilePicEmpty.png'
const DEFAULT_AGREEMENT_IMAGE_URL = 'https://download.coliving.lol/static-resources/email/imageDigitalContentEmpty.jpg'

// The number of users to fetch / display per notification (The displayed number of users)
const USER_FETCH_LIMIT = 10

/* Merges the notifications with the user announcements in time sorted order (Most recent first).
 *
 * @param {ColivingLibs} coliving                   Coliving Libs instance
 * @param {number} userId                       The blockchain user id of the recipient of the user
 * @param {Array<Announcement>} announcements   Announcements set on the app
 * @param {moment Time} fromTime                The moment time object from which to get notifications
 * @param {number?} limit                       The max number of notification to attach in the email
 *
 * @return {Promise<Object>}
 */

const EXCLUDED_EMAIL_SOLANA_NOTIF_TYPES = [NotificationType.TipSend]

const getLastWeek = () => moment().subtract(7, 'days')
async function getEmailNotifications (coliving, userId, announcements = [], fromTime = getLastWeek(), limit = 5) {
  try {
    const user = await models.User.findOne({
      where: { blockchainUserId: userId },
      attributes: ['createdAt']
    })

    const { rows: notifications } = await models.Notification.findAndCountAll({
      where: {
        userId,
        isViewed: false,
        isRead: false,
        isHidden: false,
        timestamp: {
          [models.Sequelize.Op.gt]: fromTime.toDate()
        }
      },
      order: [
        ['timestamp', 'DESC'],
        ['entityId', 'ASC'],
        [{ model: models.NotificationAction, as: 'actions' }, 'createdAt', 'DESC']
      ],
      include: [{
        model: models.NotificationAction,
        required: true,
        as: 'actions'
      }],
      limit
    })

    const { rows: solanaNotifications } = await models.SolanaNotification.findAndCountAll({
      where: {
        userId,
        isViewed: false,
        isRead: false,
        isHidden: false,
        createdAt: {
          [models.Sequelize.Op.gt]: fromTime.toDate()
        },
        type: {
          [models.Sequelize.Op.notIn]: EXCLUDED_EMAIL_SOLANA_NOTIF_TYPES
        }
      },
      order: [
        ['createdAt', 'DESC'],
        ['entityId', 'ASC'],
        [{ model: models.SolanaNotificationAction, as: 'actions' }, 'createdAt', 'DESC']
      ],
      include: [{
        model: models.SolanaNotificationAction,
        as: 'actions'
      }],
      limit
    })

    let notifCountQuery = await models.Notification.findAll({
      where: {
        userId,
        isViewed: false,
        isRead: false,
        isHidden: false,
        timestamp: {
          [models.Sequelize.Op.gt]: fromTime.toDate()
        }
      },
      include: [{ model: models.NotificationAction, as: 'actions', required: true, attributes: [] }],
      attributes: [[models.Sequelize.fn('COUNT', models.Sequelize.col('Notification.id')), 'total']],
      group: ['Notification.id']
    })

    const solanaNotifCountQuery = await models.SolanaNotification.findAll({
      where: {
        userId,
        isViewed: false,
        isRead: false,
        isHidden: false,
        createdAt: {
          [models.Sequelize.Op.gt]: fromTime.toDate()
        },
        type: {
          [models.Sequelize.Op.notIn]: EXCLUDED_EMAIL_SOLANA_NOTIF_TYPES
        }
      },
      include: [{ model: models.SolanaNotificationAction, as: 'actions', attributes: [] }],
      attributes: [[models.Sequelize.fn('COUNT', models.Sequelize.col('SolanaNotification.id')), 'total']],
      group: ['SolanaNotification.id']
    })

    const notificationCount = notifCountQuery.length + solanaNotifCountQuery.length
    const announcementIds = new Set(announcements.map(({ entityId }) => entityId))
    const filteredNotifications = notifications.concat(solanaNotifications).filter(({ id }) => !announcementIds.has(id))

    let tenDaysAgo = moment().subtract(10, 'days')

    // An announcement is valid if it's
    // 1.) created after the user
    // 2.) created after "fromTime" which represent the time the last email was sent
    // 3.) created within the last 10 days
    const validUserAnnouncements = announcements
      .filter(a => (
        moment(a.datePublished).isAfter(user.createdAt) &&
        moment(a.datePublished).isAfter(fromTime) &&
        moment(a.datePublished).isAfter(tenDaysAgo)
      ))

    const userNotifications = mergeColivingAnnoucements(validUserAnnouncements, filteredNotifications)
    let unreadAnnouncementCount = 0
    userNotifications.forEach((notif) => {
      if (notif.type === NotificationType.Announcement) {
        unreadAnnouncementCount += 1
      }
    })

    if (userNotifications.length === 0) {
      return [{}, 0]
    }

    const finalUserNotifications = userNotifications.slice(0, limit)

    const fethNotificationsTime = Date.now()
    const metadata = await fetchNotificationMetadata(coliving, [userId], finalUserNotifications, true, true)
    const fetchDataDuration = (Date.now() - fethNotificationsTime) / 1000
    logger.info({ job: 'fetchNotificationMetadata', duration: fetchDataDuration }, `fetchNotificationMetadata | get metadata ${fetchDataDuration} sec`)
    const notificationsEmailProps = formatEmailNotificationProps(finalUserNotifications, metadata)
    return [notificationsEmailProps, notificationCount + unreadAnnouncementCount]
  } catch (err) {
    logger.error(err)
  }
}

async function fetchNotificationMetadata (
  coliving,
  userIds = [],
  notifications,
  fetchThumbnails = false,
  // the structure of the notification data from the database will be different
  // in the email flow compared to that which is fetched from the discovery node
  isEmailNotif = false
) {
  let userIdsToFetch = [...userIds]
  let digitalContentIdsToFetch = []
  let collectionIdsToFetch = []
  let fetchDigitalContentRemixParents = []

  for (let notification of notifications) {
    switch (notification.type) {
      case NotificationType.Follow:
      case NotificationType.ChallengeReward:
      case NotificationType.TierChange: {
        userIdsToFetch.push(
          ...notification.actions
            .map(({ actionEntityId }) => actionEntityId).slice(0, USER_FETCH_LIMIT)
        )
        break
      }
      case NotificationType.Favorite.digital_content:
      case NotificationType.Repost.digital_content: {
        userIdsToFetch.push(
          ...notification.actions
            .map(({ actionEntityId }) => actionEntityId).slice(0, USER_FETCH_LIMIT)
        )
        digitalContentIdsToFetch.push(notification.entityId)
        break
      }
      case NotificationType.Favorite.contentList:
      case NotificationType.Favorite.album:
      case NotificationType.Repost.contentList:
      case NotificationType.Repost.album: {
        userIdsToFetch.push(...notification.actions.map(({ actionEntityId }) => actionEntityId).slice(0, USER_FETCH_LIMIT))
        collectionIdsToFetch.push(notification.entityId)
        break
      }
      case NotificationType.Create.album:
      case NotificationType.Create.contentList: {
        collectionIdsToFetch.push(notification.entityId)
        break
      }
      case NotificationType.MilestoneRepost:
      case NotificationType.MilestoneFavorite:
      case NotificationType.MilestoneListen: {
        if (notification.actions[0].actionEntityType === Entity.DigitalContent) {
          digitalContentIdsToFetch.push(notification.entityId)
        } else {
          collectionIdsToFetch.push(notification.entityId)
        }
        break
      }
      case NotificationType.Create.digital_content: {
        digitalContentIdsToFetch.push(...notification.actions.map(({ actionEntityId }) => actionEntityId))
        break
      }
      case NotificationType.RemixCreate: {
        digitalContentIdsToFetch.push(notification.entityId)
        for (const action of notification.actions) {
          if (action.actionEntityType === Entity.DigitalContent) {
            digitalContentIdsToFetch.push(action.actionEntityId)
          } else if (action.actionEntityType === Entity.User) {
            userIdsToFetch.push(action.actionEntityId)
          }
        }
        break
      }
      case NotificationType.RemixCosign: {
        digitalContentIdsToFetch.push(notification.entityId)
        fetchDigitalContentRemixParents.push(notification.entityId)
        for (const action of notification.actions) {
          if (action.actionEntityType === Entity.DigitalContent) {
            digitalContentIdsToFetch.push(action.actionEntityId)
          } else if (action.actionEntityType === Entity.User) {
            userIdsToFetch.push(action.actionEntityId)
          }
        }
        break
      }
      case NotificationType.TrendingDigitalContent: {
        digitalContentIdsToFetch.push(notification.entityId)
        break
      }
      case NotificationType.AddDigitalContentToContentList: {
        digitalContentIdsToFetch.push(notification.entityId)
        userIdsToFetch.push(notification.metadata.contentListOwnerId)
        collectionIdsToFetch.push(notification.metadata.contentListId)
        break
      }
      case NotificationType.Reaction: {
        userIdsToFetch.push(notification.initiator)
        if (isEmailNotif) {
          userIdsToFetch.push(notification.userId)
          userIdsToFetch.push(notification.entityId)
        }
        break
      }
      case NotificationType.SupporterRankUp: {
        // Tip sender needed for SupporterRankUp
        userIdsToFetch.push(notification.metadata.entity_id)
        if (isEmailNotif) {
          userIdsToFetch.push(notification.userId)
          userIdsToFetch.push(notification.metadata.supportingUserId)
        }
        break
      }
      case NotificationType.SupportingRankUp: {
        // Tip recipient needed for SupportingRankUp
        userIdsToFetch.push(notification.initiator)
        if (isEmailNotif) {
          userIdsToFetch.push(notification.userId)
          userIdsToFetch.push(notification.metadata.supportedUserId)
        }
        break
      }
      case NotificationType.TipReceive: {
        // Fetch the sender of the tip
        userIdsToFetch.push(notification.metadata.entity_id)
        if (isEmailNotif) {
          userIdsToFetch.push(notification.userId)
          userIdsToFetch.push(notification.entityId)
        }
        break
      }
    }
  }

  const uniqueDigitalContentIds = [...new Set(digitalContentIdsToFetch)]

  const digitalContents = []
  // Batch digital_content fetches to avoid large request lines
  const digitalContentBatchSize = 100 // use default limit
  for (let digitalContentBatchOffset = 0; digitalContentBatchOffset < uniqueDigitalContentIds.length; digitalContentBatchOffset += digitalContentBatchSize) {
    const digitalContentBatch = uniqueDigitalContentIds.slice(digitalContentBatchOffset, digitalContentBatchOffset + digitalContentBatchSize)
    const digitalContentsResponse = await coliving.DigitalContent.getDigitalContents(
      /** limit */ digitalContentBatch.length,
      /** offset */ 0,
      /** idsArray */ digitalContentBatch
    )
    digitalContents.push(...digitalContentsResponse)
  }

  if (!Array.isArray(digitalContents)) {
    logger.error(`fetchNotificationMetadata | Unable to fetch digital_content ids ${uniqueDigitalContentIds.join(',')}`)
  }

  const digitalContentMap = digitalContents.reduce((tm, digital_content) => {
    tm[digital_content.digital_content_id] = digital_content
    return tm
  }, {})

  // Fetch the parents of the remix digitalContents & add to the digitalContents map
  if (fetchDigitalContentRemixParents.length > 0) {
    const digitalContentParentIds = fetchDigitalContentRemixParents.reduce((parentDigitalContentIds, remixDigitalContentId) => {
      const digital_content = digitalContentMap[remixDigitalContentId]
      const parentIds = (digital_content.remix_of && Array.isArray(digital_content.remix_of.digitalContents))
        ? digital_content.remix_of.digitalContents.map(t => t.parent_digital_content_id)
        : []
      return parentDigitalContentIds.concat(parentIds)
    }, [])

    const uniqueParentDigitalContentIds = [...new Set(digitalContentParentIds)]
    let parentDigitalContents = await coliving.DigitalContent.getDigitalContents(
      /** limit */ uniqueParentDigitalContentIds.length,
      /** offset */ 0,
      /** idsArray */ uniqueParentDigitalContentIds
    )
    if (!Array.isArray(parentDigitalContents)) {
      logger.error(`fetchNotificationMetadata | Unable to fetch parent digital_content ids ${uniqueParentDigitalContentIds.join(',')}`)
    }

    parentDigitalContents.forEach(digital_content => {
      digitalContentMap[digital_content.digital_content_id] = digital_content
    })
  }

  const uniqueCollectionIds = [...new Set(collectionIdsToFetch)]
  const collections = await coliving.ContentList.getContentLists(
    /** limit */ uniqueCollectionIds.length,
    /** offset */ 0,
    /** idsArray */ uniqueCollectionIds
  )

  if (!Array.isArray(collections)) {
    logger.error(`fetchNotificationMetadata | Unable to fetch collection ids ${uniqueCollectionIds.join(',')}`)
  }

  userIdsToFetch.push(
    ...digitalContents.map(({ owner_id: id }) => id),
    ...collections.map(({ content_list_owner_id: id }) => id)
  )
  const uniqueUserIds = [...new Set(userIdsToFetch)]

  let users = await coliving.User.getUsers(
    /** limit */ uniqueUserIds.length,
    /** offset */ 0,
    /** idsArray */ uniqueUserIds
  )

  if (!Array.isArray(users)) {
    logger.error(`fetchNotificationMetadata | Unable to fetch user ids ${uniqueUserIds.join(',')}`)
  }

  // Fetch all the social handles and attach to the users - For twitter sharing
  const socialHandles = await models.SocialHandles.findAll({
    where: {
      handle: users.map(({ handle }) => handle)
    }
  })
  const twitterHandleMap = socialHandles.reduce((handleMapping, socialHandle) => {
    if (socialHandle.twitterHandle) handleMapping[socialHandle.handle] = socialHandle.twitterHandle
    return handleMapping
  }, {})

  users = await Promise.all(users.map(async (user) => {
    if (fetchThumbnails) {
      user.thumbnail = await getUserImage(user)
    }
    if (twitterHandleMap[user.handle]) {
      user.twitterHandle = twitterHandleMap[user.handle]
    }
    return user
  }))

  const collectionMap = collections.reduce((cm, collection) => {
    cm[collection.content_list_id] = collection
    return cm
  }, {})

  const userMap = users.reduce((um, user) => {
    um[user.user_id] = user
    return um
  }, {})

  if (fetchThumbnails) {
    for (let digitalContentId of Object.keys(digitalContentMap)) {
      const digital_content = digitalContentMap[digitalContentId]
      digital_content.thumbnail = await getDigitalContentImage(digital_content, userMap)
    }
  }

  return {
    digitalContents: digitalContentMap,
    collections: collectionMap,
    users: userMap
  }
}

const formatGateway = (contentNodeEndpoint) =>
  contentNodeEndpoint
    ? `${contentNodeEndpoint.split(',')[0]}/ipfs/`
    : USER_NODE_IPFS_GATEWAY

const getImageUrl = (cid, gateway, defaultImg) =>
  cid
    ? `${gateway}${cid}`
    : defaultImg

async function getUserImage (user) {
  const gateway = formatGateway(user.content_node_endpoint)
  const profilePicture = user.profile_picture_sizes
    ? `${user.profile_picture_sizes}/1000x1000.jpg`
    : user.profile_picture

  let imageUrl = getImageUrl(profilePicture, gateway, DEFAULT_IMAGE_URL)
  if (imageUrl === DEFAULT_IMAGE_URL) { return imageUrl }

  try {
    await axios({
      method: 'head',
      url: imageUrl,
      timeout: 5000
    })
    return imageUrl
  } catch (e) {
    return DEFAULT_IMAGE_URL
  }
}

async function getDigitalContentImage (digital_content, usersMap) {
  const digitalContentOwnerId = digital_content.owner_id
  const digitalContentOwner = usersMap[digitalContentOwnerId]
  const gateway = formatGateway(digitalContentOwner.content_node_endpoint)
  const digitalContentCoverArt = digital_content.cover_art_sizes
    ? `${digital_content.cover_art_sizes}/480x480.jpg`
    : digital_content.cover_art

  let imageUrl = getImageUrl(digitalContentCoverArt, gateway, DEFAULT_AGREEMENT_IMAGE_URL)
  if (imageUrl === DEFAULT_AGREEMENT_IMAGE_URL) { return imageUrl }

  try {
    await axios({
      method: 'head',
      url: imageUrl,
      timeout: 5000
    })
    return imageUrl
  } catch (e) {
    return DEFAULT_AGREEMENT_IMAGE_URL
  }
}

module.exports = getEmailNotifications
module.exports.fetchNotificationMetadata = fetchNotificationMetadata
