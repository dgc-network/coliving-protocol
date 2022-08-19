const moment = require('moment')
const models = require('../../models')
const {
  notificationTypes,
  actionEntityTypes
} = require('../constants')

/**
 * Process agreement added to playlist notification
 * @param {Array<Object>} notifications
 * @param {*} tx The DB transaction to attach to DB requests
 */
async function processAddAgreementToPlaylistNotification (notifications, tx) {
  const validNotifications = []

  for (const notification of notifications) {
    const {
      playlist_id: playlistId,
      agreement_id: agreementId,
      agreement_owner_id: agreementOwnerId
    } = notification.metadata
    const timestamp = Date.parse(notification.timestamp.slice(0, -2))
    const momentTimestamp = moment(timestamp)
    const updatedTimestamp = momentTimestamp.add(1, 's').format('YYYY-MM-DD HH:mm:ss')

    const [addAgreementToPlaylistNotification] = await models.Notification.findOrCreate({
      where: {
        type: notificationTypes.AddAgreementToPlaylist,
        userId: agreementOwnerId,
        entityId: agreementId,
        metadata: {
          playlistOwnerId: notification.initiator,
          playlistId,
          agreementId
        },
        blocknumber: notification.blocknumber,
        timestamp: updatedTimestamp
      },
      transaction: tx
    })

    await models.NotificationAction.findOrCreate({
      where: {
        notificationId: addAgreementToPlaylistNotification.id,
        actionEntityType: actionEntityTypes.Agreement,
        actionEntityId: agreementId,
        blocknumber: notification.blocknumber
      },
      transaction: tx
    })

    validNotifications.push(addAgreementToPlaylistNotification)
  }

  return validNotifications
}

module.exports = processAddAgreementToPlaylistNotification
