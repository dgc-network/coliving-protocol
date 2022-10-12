const assert = require('assert')
const models = require('../../src/models')
const processCreateNotifications = require('../../src/notifications/processNotifications/createNotification')
const { notificationTypes } = require('../../src/notifications/constants')

const { clearDatabase, runMigrations } = require('../lib/app')

/**
 * User id 1 creates digital_content id 1
 * User id 1 creates digital_content id 2
 * User id 1 creates digital_content id 3
 * User id 2 creates digital_content id 4
 * User id 1 creates contentList id 1 with digital_content 2
 */
const initialNotifications = [
  {
    'blocknumber': 1,
    'initiator': 1,
    'metadata': {
      'entity_id': 1,
      'entity_owner_id': 1,
      'entity_type': 'digital_content'
    },
    'timestamp': '2020-10-27T15:14:20 Z',
    'type': 'Create'
  }, {
    'blocknumber': 1,
    'initiator': 1,
    'metadata': {
      'entity_id': 2,
      'entity_owner_id': 1,
      'entity_type': 'digital_content'
    },
    'timestamp': '2020-10-27T15:14:20 Z',
    'type': 'Create'
  }, {
    'blocknumber': 1,
    'initiator': 1,
    'metadata': {
      'entity_id': 3,
      'entity_owner_id': 1,
      'entity_type': 'digital_content'
    },
    'timestamp': '2020-10-27T15:14:20 Z',
    'type': 'Create'
  }, {
    'blocknumber': 1,
    'initiator': 2,
    'metadata': {
      'entity_id': 4,
      'entity_owner_id': 2,
      'entity_type': 'digital_content'
    },
    'timestamp': '2020-10-27T15:14:20 Z',
    'type': 'Create'
  }, {
    'blocknumber': 1,
    'initiator': 1,
    'metadata': {
      'collection_content': {
        'digital_content_ids': [
          {
            'time': 1603811420,
            'digital_content': 2
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
 * User id 1 creates digital_content id 5
 * User id 2 creates digital_content id 7
 * User id 2 creates digital_content id 8
 * User id 2 creates album id 2 with digital_content 7
 */
const additionalNotifications = [
  {
    'blocknumber': 1,
    'initiator': 1,
    'metadata': {
      'entity_id': 5,
      'entity_owner_id': 1,
      'entity_type': 'digital_content'
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
      'entity_type': 'digital_content'
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
      'entity_type': 'digital_content'
    },
    'timestamp': '2020-10-27T15:14:20 Z',
    'type': 'Create'
  }, {
    'blocknumber': 1,
    'initiator': 2,
    'metadata': {
      'collection_content': {
        'digital_content_ids': [
          {
            'time': 1603811420,
            'digital_content': 7
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
    // User 11 subscribes to user 1 and gets the notification when user 1 creates digitalContents 1, 2, 3, and contentList 1 which contains digital_content 2
    const user11Notifs = await models.Notification.findAll({ where: { userId: 11 } })
    assert.deepStrictEqual(user11Notifs.length, 2)
    const user11DigitalContentNotifs = user11Notifs.find(notif => notif.type === notificationTypes.Create.digital_content)
    const user11ContentListNotif = user11Notifs.find(notif => notif.type === notificationTypes.Create.contentList)
    assert.deepStrictEqual(user11DigitalContentNotifs.entityId, 1) // For digitalContents the entity id is the creator of the digitalContents
    assert.deepStrictEqual(user11ContentListNotif.entityId, 1) // For digitalContents the entity id is the creator of the digitalContents

    // Check the notification actions of the digital_content uploads - note there were 3 digital_content uploads but one was a part of a contentList & removed
    const user11DigitalContentNotifActions = await models.NotificationAction.findAll({ where: { notificationId: user11DigitalContentNotifs.id } })
    const userDigitalContentActionDigitalContents = user11DigitalContentNotifActions.map(na => na.actionEntityId)
    userDigitalContentActionDigitalContents.sort()
    assert.deepStrictEqual(userDigitalContentActionDigitalContents, [1, 3])

    // Check the notification actions of the digital_content uploads - note there were 3 digital_content uploads but one was a part of a contentList & removed
    const user11ContentListNotifActions = await models.NotificationAction.findAll({ where: { notificationId: user11ContentListNotif.id } })
    assert.deepStrictEqual(user11ContentListNotifActions.length, 1)
    assert.deepStrictEqual(user11ContentListNotifActions[0].actionEntityId, 1)

    // User 10 subscriber to user 1 and user 2
    const user10Notifs = await models.Notification.findAll({ where: { userId: 10 } })
    assert.deepStrictEqual(user10Notifs.length, 3)
    const user10DigitalContentNotifs = user10Notifs.find(notif => notif.type === notificationTypes.Create.digital_content && notif.entityId === 2)

    // Check the notification actions of the digital_content uploads - note there were 3 digital_content uploads but one was a part of a contentList & removed
    const user10DigitalContentNotifActions = await models.NotificationAction.findAll({ where: { notificationId: user10DigitalContentNotifs.id } })
    assert.deepStrictEqual(user10DigitalContentNotifActions.length, 1)
    assert.deepStrictEqual(user10DigitalContentNotifActions[0].actionEntityId, 4) // DigitalContent ID 4 was created

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

    // User 11 viewed their notifications, so there should be 1 new digital_content notification (digitalContentId 5 made by user 1)
    const user11newNotifs = await models.Notification.findAll({ where: { userId: 11 } })
    assert.deepStrictEqual(user11newNotifs.length, 3)
    const user11NewDigitalContentNotif = user11newNotifs.find(notif => notif.type === notificationTypes.Create.digital_content && notif.isViewed === false)
    assert.deepStrictEqual(user11NewDigitalContentNotif.entityId, 1) // For digitalContents the entity id is the creator of the digitalContents

    // Check the notification actions of the new digital_content notif is digital_content ID 5
    const user11NewDigitalContentNotifActions = await models.NotificationAction.findAll({ where: { notificationId: user11NewDigitalContentNotif.id } })
    assert.deepStrictEqual(user11NewDigitalContentNotifActions.length, 1)
    assert.deepStrictEqual(user11NewDigitalContentNotifActions[0].actionEntityId, 5)

    // User 12 is not view the notification, so the new digital_content should tack onto the existing notification via an action
    const user12UpdatedNotifs = await models.Notification.findAll({ where: { userId: 12 } })
    assert.deepStrictEqual(user12UpdatedNotifs.length, 2)
    const user12UpdatedDigitalContentNotif = user12UpdatedNotifs.find(notif => notif.type === notificationTypes.Create.digital_content)

    // Check the notification actions of the new digital_content notif is digital_content ID 5
    const user12NewDigitalContentNotifActions = await models.NotificationAction.findAll({ where: { notificationId: user12UpdatedDigitalContentNotif.id } })
    const updatedNotifDigitalContentIds = user12NewDigitalContentNotifActions.map(na => na.actionEntityId)
    updatedNotifDigitalContentIds.sort()
    assert.deepStrictEqual(updatedNotifDigitalContentIds, [1, 3, 5])

    // User 10 subscribes to user 1 & 2 but did not view any notifications, so the only new notification should be user 12 album upload
    const updatedUser10Notifs = await models.Notification.findAll({ where: { userId: 10 } })
    assert.deepStrictEqual(updatedUser10Notifs.length, 4) // user 1 digital_content & contentList upload & user 2 digital_content & album upload
    const user10DigitalContentNotifs2 = updatedUser10Notifs.find(notif => notif.type === notificationTypes.Create.digital_content && notif.entityId === 2)
    const user10AlbumNotif = updatedUser10Notifs.find(notif => notif.type === notificationTypes.Create.album)
    assert.deepStrictEqual(user10AlbumNotif.entityId, 2)

    // Check the notification actions of the digital_content uploads - note there were 3 digital_content uploads but one was a part of a contentList & removed
    const user10DigitalContentNotif2Actions = await models.NotificationAction.findAll({ where: { notificationId: user10DigitalContentNotifs2.id } })
    const user10Sub2DigitalContents = user10DigitalContentNotif2Actions.map(na => na.actionEntityId)
    user10Sub2DigitalContents.sort()
    assert.deepStrictEqual(user10Sub2DigitalContents, [4, 8])

    const user10AlbumActions = await models.NotificationAction.findAll({ where: { notificationId: user10AlbumNotif.id } })
    assert.deepStrictEqual(user10AlbumActions.length, 1)
    assert.deepStrictEqual(user10AlbumActions[0].actionEntityId, 2)
  })
})
