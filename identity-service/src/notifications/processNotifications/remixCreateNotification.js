
const moment = require('moment')
const models = require('../../models')
const {
  notificationTypes,
  actionEntityTypes
} = require('../constants')

/**
 * Process remix create notifications, note these notifications do not "stack" meaning that
 * a notification action will never reference a previously created notification
 * @param {Array<Object>} notifications
 * @param {*} tx The DB transaction to attach to DB requests
 */
async function processRemixCreateNotifications (notifications, tx) {
  for (const notification of notifications) {
    const {
      entity_id: childAgreementId,
      remix_parent_agreement_user_id: parentAgreementUserId,
      remix_parent_agreement_id: parentAgreementId
    } = notification.metadata

    // Create/Find a Notification and NotificationAction for this remix create event
    // NOTE: RemixCreate Notifications do NOT stack. A new notification is created for each remix creation
    const blocknumber = notification.blocknumber
    const timestamp = Date.parse(notification.timestamp.slice(0, -2))
    const momentTimestamp = moment(timestamp)
    const updatedTimestamp = momentTimestamp.add(1, 's').format('YYYY-MM-DD HH:mm:ss')

    const [notificationObj] = await models.Notification.findOrCreate({
      where: {
        type: notificationTypes.RemixCreate,
        userId: parentAgreementUserId,
        entityId: childAgreementId,
        blocknumber,
        timestamp: updatedTimestamp
      },
      transaction: tx
    })

    await models.NotificationAction.findOrCreate({
      where: {
        notificationId: notificationObj.id,
        actionEntityType: actionEntityTypes.Agreement,
        actionEntityId: parentAgreementId,
        blocknumber
      },
      transaction: tx
    })
  }
  return notifications
}

module.exports = processRemixCreateNotifications
