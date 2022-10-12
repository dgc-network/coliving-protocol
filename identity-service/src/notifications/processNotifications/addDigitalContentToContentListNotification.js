const moment = require('moment')
const models = require('../../models')
const {
  notificationTypes,
  actionEntityTypes
} = require('../constants')

/**
 * Process digital_content added to contentList notification
 * @param {Array<Object>} notifications
 * @param {*} tx The DB transaction to attach to DB requests
 */
async function processAddDigitalContentToContentListNotification (notifications, tx) {
  const validNotifications = []

  for (const notification of notifications) {
    const {
      content_list_id: contentListId,
      digital_content_id: digitalContentId,
      digital_content_owner_id: digitalContentOwnerId
    } = notification.metadata
    const timestamp = Date.parse(notification.timestamp.slice(0, -2))
    const momentTimestamp = moment(timestamp)
    const updatedTimestamp = momentTimestamp.add(1, 's').format('YYYY-MM-DD HH:mm:ss')

    const [addDigitalContentToContentListNotification] = await models.Notification.findOrCreate({
      where: {
        type: notificationTypes.AddDigitalContentToContentList,
        userId: digitalContentOwnerId,
        entityId: digitalContentId,
        metadata: {
          contentListOwnerId: notification.initiator,
          contentListId,
          digitalContentId
        },
        blocknumber: notification.blocknumber,
        timestamp: updatedTimestamp
      },
      transaction: tx
    })

    await models.NotificationAction.findOrCreate({
      where: {
        notificationId: addDigitalContentToContentListNotification.id,
        actionEntityType: actionEntityTypes.DigitalContent,
        actionEntityId: digitalContentId,
        blocknumber: notification.blocknumber
      },
      transaction: tx
    })

    validNotifications.push(addDigitalContentToContentListNotification)
  }

  return validNotifications
}

module.exports = processAddDigitalContentToContentListNotification
