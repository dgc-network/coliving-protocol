const assert = require('assert')
const models = require('../../src/models')
const processCreateNotifications = require('../../src/notifications/processNotifications/createNotification')
const { notificationTypes } = require('../../src/notifications/constants')

const { clearDatabase, runMigrations } = require('../lib/app')

/**
 * User id 1 creates agreement id 1
 * User id 1 creates agreement id 2
 * User id 1 creates agreement id 3
 * User id 2 creates agreement id 4
 * User id 1 creates contentList id 1 with agreement 2
 */
const initialNotifications = [
  {
    'blocknumber': 1,
    'initiator': 1,
    'metadata': {
      'entity_id': 1,
      'entity_owner_id': 1,
      'entity_type': 'agreement'
    },
    'timestamp': '2020-10-27T15:14:20 Z',
    'type': 'Create'
  }, {
    'blocknumber': 1,
    'initiator': 1,
    'metadata': {
      'entity_id': 2,
      'entity_owner_id': 1,
      'entity_type': 'agreement'
    },
    'timestamp': '2020-10-27T15:14:20 Z',
    'type': 'Create'
  }, {
    'blocknumber': 1,
    'initiator': 1,
    'metadata': {
      'entity_id': 3,
      'entity_owner_id': 1,
      'entity_type': 'agreement'
    },
    'timestamp': '2020-10-27T15:14:20 Z',
    'type': 'Create'
  }, {
    'blocknumber': 1,
    'initiator': 2,
    'metadata': {
      'entity_id': 4,
      'entity_owner_id': 2,
      'entity_type': 'agreement'
    },
    'timestamp': '2020-10-27T15:14:20 Z',
    'type': 'Create'
  }, {
    'blocknumber': 1,
    'initiator': 1,
    'metadata': {
      'collection_content': {
        'agreement_ids': [
          {
            'time': 1603811420,
            'agreement': 2
          }
        ]
      },
      'entity_id': 1,
      'entity_owner_id': 1,
      'entity_type': 'contentList'
    },
    'timestamp': '2020-10-27T15:10:20 Z',
    'type': 'Create'
  }
]

/**
 * User id 1 creates agreement id 5
 * User id 2 creates agreement id 7
 * User id 2 creates agreement id 8
 * User id 2 creates album id 2 with agreement 7
 */
const additionalNotifications = [
  {
    'blocknumber': 1,
    'initiator': 1,
    'metadata': {
      'entity_id': 5,
      'entity_owner_id': 1,
      'entity_type': 'agreement'
    },
    'timestamp': '2020-10-27T15:14:20 Z',
    'type': 'Create'
  },
  {
    'blocknumber': 1,
    'initiator': 2,
    'metadata': {
      'entity_id': 7,
      'entity_owner_id': 1,
      'entity_type': 'agreement'
    },
    'timestamp': '2020-10-27T15:14:20 Z',
    'type': 'Create'
  },
  {
    'blocknumber': 1,
    'initiator': 2,
    'metadata': {
      'entity_id': 8,
      'entity_owner_id': 1,
      'entity_type': 'agreement'
    },
    'timestamp': '2020-10-27T15:14:20 Z',
    'type': 'Create'
  }, {
    'blocknumber': 1,
    'initiator': 2,
    'metadata': {
      'collection_content': {
        'agreement_ids': [
          {
            'time': 1603811420,
            'agreement': 7
          }
        ]
      },
      'entity_id': 2,
      'entity_owner_id': 2,
      'entity_type': 'album'
    },
    'timestamp': '2020-10-27T15:10:20 Z',
    'type': 'Create'
  }
]

describe('Test Favorite Notification', function () {
  beforeEach(async () => {
    await clearDatabase()
    await runMigrations()
  })

  it('should insert rows into notifications and notifications actions tables', async function () {
    // ======================================= Set subscribers for create notifications =======================================
    await models.Subscription.bulkCreate([
      { subscriberId: 10, userId: 1 }, // User 10 subscribes to user 1
      { subscriberId: 11, userId: 1 },
      { subscriberId: 12, userId: 1 },
      { subscriberId: 10, userId: 2 }
    ])

    // ======================================= Process initial Notifications =======================================
    const tx1 = await models.sequelize.transaction()
    await processCreateNotifications(initialNotifications, tx1)
    await tx1.commit()

    // ======================================= Run checks against the Notifications =======================================
    // User 11 subscribes to user 1 and gets the notification when user 1 creates agreements 1, 2, 3, and contentList 1 which contains agreement 2
    const user11Notifs = await models.Notification.findAll({ where: { userId: 11 } })
    assert.deepStrictEqual(user11Notifs.length, 2)
    const user11AgreementNotifs = user11Notifs.find(notif => notif.type === notificationTypes.Create.agreement)
    const user11ContentListNotif = user11Notifs.find(notif => notif.type === notificationTypes.Create.contentList)
    assert.deepStrictEqual(user11AgreementNotifs.entityId, 1) // For agreements the entity id is the creator of the agreements
    assert.deepStrictEqual(user11ContentListNotif.entityId, 1) // For agreements the entity id is the creator of the agreements

    // Check the notification actions of the agreement uploads - note there were 3 agreement uploads but one was a part of a contentList & removed
    const user11AgreementNotifActions = await models.NotificationAction.findAll({ where: { notificationId: user11AgreementNotifs.id } })
    const userAgreementActionAgreements = user11AgreementNotifActions.map(na => na.actionEntityId)
    userAgreementActionAgreements.sort()
    assert.deepStrictEqual(userAgreementActionAgreements, [1, 3])

    // Check the notification actions of the agreement uploads - note there were 3 agreement uploads but one was a part of a contentList & removed
    const user11ContentListNotifActions = await models.NotificationAction.findAll({ where: { notificationId: user11ContentListNotif.id } })
    assert.deepStrictEqual(user11ContentListNotifActions.length, 1)
    assert.deepStrictEqual(user11ContentListNotifActions[0].actionEntityId, 1)

    // User 10 subscriber to user 1 and user 2
    const user10Notifs = await models.Notification.findAll({ where: { userId: 10 } })
    assert.deepStrictEqual(user10Notifs.length, 3)
    const user10AgreementNotifs = user10Notifs.find(notif => notif.type === notificationTypes.Create.agreement && notif.entityId === 2)

    // Check the notification actions of the agreement uploads - note there were 3 agreement uploads but one was a part of a contentList & removed
    const user10AgreementNotifActions = await models.NotificationAction.findAll({ where: { notificationId: user10AgreementNotifs.id } })
    assert.deepStrictEqual(user10AgreementNotifActions.length, 1)
    assert.deepStrictEqual(user10AgreementNotifActions[0].actionEntityId, 4) // Agreement ID 4 was created

    // Check that user 12 also has 2 notifications, should be the same as user 11
    const user12Notifs = await models.Notification.findAll({ where: { userId: 12 } })
    assert.deepStrictEqual(user12Notifs.length, 2)

    // ======================================= Mark some Notifications as viewed =======================================
    user11Notifs[0].isViewed = true
    await user11Notifs[0].save()

    user11Notifs[1].isViewed = true
    await user11Notifs[1].save()

    // ======================================= Process additional notifications =======================================
    const tx2 = await models.sequelize.transaction()
    await processCreateNotifications(additionalNotifications, tx2)
    await tx2.commit()

    // User 11 viewed their notifications, so there should be 1 new agreement notification (agreementId 5 made by user 1)
    const user11newNotifs = await models.Notification.findAll({ where: { userId: 11 } })
    assert.deepStrictEqual(user11newNotifs.length, 3)
    const user11NewAgreementNotif = user11newNotifs.find(notif => notif.type === notificationTypes.Create.agreement && notif.isViewed === false)
    assert.deepStrictEqual(user11NewAgreementNotif.entityId, 1) // For agreements the entity id is the creator of the agreements

    // Check the notification actions of the new agreement notif is agreement ID 5
    const user11NewAgreementNotifActions = await models.NotificationAction.findAll({ where: { notificationId: user11NewAgreementNotif.id } })
    assert.deepStrictEqual(user11NewAgreementNotifActions.length, 1)
    assert.deepStrictEqual(user11NewAgreementNotifActions[0].actionEntityId, 5)

    // User 12 is not view the notification, so the new agreement should tack onto the existing notification via an action
    const user12UpdatedNotifs = await models.Notification.findAll({ where: { userId: 12 } })
    assert.deepStrictEqual(user12UpdatedNotifs.length, 2)
    const user12UpdatedAgreementNotif = user12UpdatedNotifs.find(notif => notif.type === notificationTypes.Create.agreement)

    // Check the notification actions of the new agreement notif is agreement ID 5
    const user12NewAgreementNotifActions = await models.NotificationAction.findAll({ where: { notificationId: user12UpdatedAgreementNotif.id } })
    const updatedNotifAgreementIds = user12NewAgreementNotifActions.map(na => na.actionEntityId)
    updatedNotifAgreementIds.sort()
    assert.deepStrictEqual(updatedNotifAgreementIds, [1, 3, 5])

    // User 10 subscribes to user 1 & 2 but did not view any notifications, so the only new notification should be user 12 album upload
    const updatedUser10Notifs = await models.Notification.findAll({ where: { userId: 10 } })
    assert.deepStrictEqual(updatedUser10Notifs.length, 4) // user 1 agreement & contentList upload & user 2 agreement & album upload
    const user10AgreementNotifs2 = updatedUser10Notifs.find(notif => notif.type === notificationTypes.Create.agreement && notif.entityId === 2)
    const user10AlbumNotif = updatedUser10Notifs.find(notif => notif.type === notificationTypes.Create.album)
    assert.deepStrictEqual(user10AlbumNotif.entityId, 2)

    // Check the notification actions of the agreement uploads - note there were 3 agreement uploads but one was a part of a contentList & removed
    const user10AgreementNotif2Actions = await models.NotificationAction.findAll({ where: { notificationId: user10AgreementNotifs2.id } })
    const user10Sub2Agreements = user10AgreementNotif2Actions.map(na => na.actionEntityId)
    user10Sub2Agreements.sort()
    assert.deepStrictEqual(user10Sub2Agreements, [4, 8])

    const user10AlbumActions = await models.NotificationAction.findAll({ where: { notificationId: user10AlbumNotif.id } })
    assert.deepStrictEqual(user10AlbumActions.length, 1)
    assert.deepStrictEqual(user10AlbumActions[0].actionEntityId, 2)
  })
})
