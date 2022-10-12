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
async function processAddAgreementToContentListNotification (notifications, tx) {
  const validNotifications = []

  for (const notification of notifications) {
    const {
      content_list_id: contentListId,
      digital_content_id: agreementId,
      digital_content_owner_id: agreementOwnerId
    } = notification.metadata
    const timestamp = Date.parse(notification.timestamp.slice(0, -2))
    const momentTimestamp = moment(timestamp)
    const updatedTimestamp = momentTimestamp.add(1, 's').format('YYYY-MM-DD HH:mm:ss')

    const [addAgreementToContentListNotification] = await models.Notification.findOrCreate({
      where: {
        type: notificationTypes.AddAgreementToContentList,
        userId: agreementOwnerId,
        entityId: agreementId,
        metadata: {
          contentListOwnerId: notification.initiator,
          contentListId,
          agreementId
        },
        blocknumber: notification.blocknumber,
        timestamp: updatedTimestamp
      },
      transaction: tx
    })

    await models.NotificationAction.findOrCreate({
      where: {
        notificationId: addAgreementToContentListNotification.id,
        actionEntityType: actionEntityTypes.DigitalContent,
        actionEntityId: agreementId,
        blocknumber: notification.blocknumber
      },
      transaction: tx
    })

    validNotifications.push(addAgreementToContentListNotification)
  }

  return validNotifications
}

module.exports = processAddAgreementToContentListNotification
