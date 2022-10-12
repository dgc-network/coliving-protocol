const models = require('../../models')
const {
  notificationTypes,
  actionEntityTypes
} = require('../constants')

const getNotifType = (entityType) => {
  switch (entityType) {
    case 'digital_content':
      return {
        createType: notificationTypes.Create.digital_content,
        actionEntityType: actionEntityTypes.DigitalContent
      }
    case 'album':
      return {
        createType: notificationTypes.Create.album,
        actionEntityType: actionEntityTypes.User
      }
    case 'contentList':
      return {
        createType: notificationTypes.Create.contentList,
        actionEntityType: actionEntityTypes.User
      }
    default:
      return {}
  }
}

/**
 * Batch process create notifications, by bulk insertion in the DB for each
 * set of subscribers and dedpupe digitalContents in collections.
 * @param {Array<Object>} notifications
 * @param {*} tx The DB transcation to attach to DB requests
 */
async function processCreateNotifications (notifications, tx) {
  const validNotifications = []
  for (const notification of notifications) {
    const blocknumber = notification.blocknumber
    const timestamp = Date.parse(notification.timestamp.slice(0, -2))
    const {
      createType,
      actionEntityType
    } = getNotifType(notification.metadata.entity_type)

    // Query user IDs from subscriptions table
    // Notifications go to all users subscribing to this content uploader
    let subscribers = await models.Subscription.findAll({
      where: {
        userId: notification.initiator
      },
      transaction: tx
    })

    // No operation if no users subscribe to this creator
    if (subscribers.length === 0) continue

    // The notification entity id is the uploader id for digitalContents
    // Each digital_content will added to the notification actions table
    // For contentList/albums, the notification entity id is the collection id itself
    let notificationEntityId =
      actionEntityType === actionEntityTypes.DigitalContent
        ? notification.initiator
        : notification.metadata.entity_id

    // Action table entity is digitalContentId for CreateDigitalContent notifications
    // Allowing multiple digital_content creates to be associated w/ a single notification for your subscription
    // For collections, the entity is the owner id, producing a distinct notification for each
    let createdActionEntityId =
      actionEntityType === actionEntityTypes.DigitalContent
        ? notification.metadata.entity_id
        : notification.metadata.entity_owner_id

    // Query all subscribers for a un-viewed notification - is no un-view notification exists a new one is created
    const subscriberIds = subscribers.map(s => s.subscriberId)
    let unreadSubscribers = await models.Notification.findAll({
      where: {
        isViewed: false,
        userId: { [models.Sequelize.Op.in]: subscriberIds },
        type: createType,
        entityId: notificationEntityId
      },
      transaction: tx
    })
    let notificationIds = unreadSubscribers.map(notif => notif.id)
    const unreadSubscribersUserIds = new Set(unreadSubscribers.map(s => s.userId))
    const subscriberIdsWithoutNotification = subscriberIds.filter(s => !unreadSubscribersUserIds.has(s))
    if (subscriberIdsWithoutNotification.length > 0) {
      // Bulk create notifications for users that do not have a un-viewed notification
      const createDigitalContentNotifTx = await models.Notification.bulkCreate(subscriberIdsWithoutNotification.map(id => ({
        isViewed: false,
        isRead: false,
        isHidden: false,
        userId: id,
        type: createType,
        entityId: notificationEntityId,
        blocknumber,
        timestamp
      }), { transaction: tx }))
      notificationIds.push(...createDigitalContentNotifTx.map(notif => notif.id))
    }

    await Promise.all(notificationIds.map(async (notificationId) => {
      // Action entity id can be one of album/contentList/digital_content
      let notifActionCreateTx = await models.NotificationAction.findOrCreate({
        where: {
          notificationId,
          actionEntityType: actionEntityType,
          actionEntityId: createdActionEntityId,
          blocknumber
        },
        transaction: tx
      })

      // Update Notification table timestamp
      let updatePerformed = notifActionCreateTx[1]
      if (updatePerformed) {
        await models.Notification.update({
          timestamp
        }, {
          where: { id: notificationId },
          returning: true,
          plain: true,
          transaction: tx
        })
      }
    }))

    // Dedupe album /contentList notification
    if (createType === notificationTypes.Create.album ||
        createType === notificationTypes.Create.contentList) {
      let digitalContentIdObjectList = notification.metadata.collection_content.digital_content_ids
      if (digitalContentIdObjectList.length > 0) {
        // Clear duplicate notifications from identity database
        for (var entry of digitalContentIdObjectList) {
          let digitalContentId = entry.digital_content
          await models.NotificationAction.destroy({
            where: {
              actionEntityType: actionEntityTypes.DigitalContent,
              actionEntityId: digitalContentId
            },
            transaction: tx
          })
        }
      }
    }
    validNotifications.push(notification)
  }
  return validNotifications
}

module.exports = processCreateNotifications
