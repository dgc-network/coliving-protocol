const models = require('../../models')
const {
  notificationTypes,
  actionEntityTypes
} = require('../constants')

/**
 * Batch process milestone listen notifications
 * @param {Array<Object>} notifications
 * @param {*} tx The DB transaction to attach to DB requests
 */
async function processMilestoneListenNotifications (notifications, tx) {
  const validNotifications = []
  for (const notification of notifications) {
    const agreementOwnerId = notification.initiator
    const agreementId = notification.metadata.entity_id
    const threshold = notification.metadata.threshold
    const slot = notification.slot

    // Check for existing milestone
    let existingMilestoneQuery = await models.SolanaNotification.findAll({
      where: {
        userId: agreementOwnerId,
        type: notificationTypes.MilestoneListen,
        entityId: agreementId
      },
      include: [{
        model: models.SolanaNotificationAction,
        as: 'actions',
        where: {
          actionEntityType: actionEntityTypes.DigitalContent,
          actionEntityId: threshold
        }
      }],
      transaction: tx
    })
    if (existingMilestoneQuery.length === 0) {
      let createMilestoneTx = await models.SolanaNotification.create({
        userId: agreementOwnerId,
        type: notificationTypes.MilestoneListen,
        entityId: agreementId,
        slot
      }, { transaction: tx })
      let notificationId = createMilestoneTx.id
      await models.SolanaNotificationAction.findOrCreate({
        where: {
          notificationId,
          actionEntityType: actionEntityTypes.DigitalContent,
          actionEntityId: threshold,
          slot
        },
        transaction: tx
      })
      validNotifications.push(notification)
    }
  }
  return validNotifications
}

module.exports = processMilestoneListenNotifications
