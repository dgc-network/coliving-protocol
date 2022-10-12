const assert = require('assert')
const models = require('../../src/models')
const processRepostNotifications = require('../../src/notifications/processNotifications/repostNotification')
const {
  notificationTypes,
  actionEntityTypes
} = require('../../src/notifications/constants')

const { clearDatabase, runMigrations } = require('../lib/app')

/**
 * User id 1 reposts digital_content 10 owned by user id 20
 * User id 2 reposts digital_content 10 owned by user id 20
 * User id 2 reposts digital_content 11 owned by user id 20
 * User id 3 reposts contentList 14 owned by user id 23
 * User id 4 reposts album 10 owned by user id 25
 */
const initialNotifications = [
  {
    'blocknumber': 1,
    'initiator': 1,
    'metadata': {
      'entity_id': 10,
      'entity_owner_id': 20,
      'entity_type': 'digital_content'
    },
    'timestamp': '2020-10-24T19:39:45 Z',
    'type': 'Repost'
  }, {
    'blocknumber': 1,
    'initiator': 2,
    'metadata': {
      'entity_id': 10,
      'entity_owner_id': 20,
      'entity_type': 'digital_content'
    },
    'timestamp': '2020-10-24T19:39:45 Z',
    'type': 'Repost'
  }, {
    'blocknumber': 1,
    'initiator': 2,
    'metadata': {
      'entity_id': 11,
      'entity_owner_id': 20,
      'entity_type': 'digital_content'
    },
    'timestamp': '2020-10-24T19:39:45 Z',
    'type': 'Repost'
  }, {
    'blocknumber': 1,
    'initiator': 3,
    'metadata': {
      'entity_id': 14,
      'entity_owner_id': 23,
      'entity_type': 'contentList'
    },
    'timestamp': '2020-10-24T19:39:45 Z',
    'type': 'Repost'
  }, {
    'blocknumber': 1,
    'initiator': 4,
    'metadata': {
      'entity_id': 10,
      'entity_owner_id': 25,
      'entity_type': 'album'
    },
    'timestamp': '2020-10-24T19:39:45 Z',
    'type': 'Repost'
  }
]

/**
 * User id 5 reposts digital_content 10 owned by user id 20
 * User id 5 reposts album 11 owned by user id 20
 */
const additionalNotifications = [
  {
    'blocknumber': 2,
    'initiator': 5,
    'metadata': {
      'entity_id': 10,
      'entity_owner_id': 20,
      'entity_type': 'digital_content'
    },
    'timestamp': '2020-10-24T19:39:45 Z',
    'type': 'Repost'
  }, {
    'blocknumber': 2,
    'initiator': 5,
    'metadata': {
      'entity_id': 11,
      'entity_owner_id': 20,
      'entity_type': 'digital_content'
    },
    'timestamp': '2020-10-24T19:39:45 Z',
    'type': 'Repost'
  }
]

describe('Test Repost Notification', function () {
  beforeEach(async () => {
    await clearDatabase()
    await runMigrations()
  })

  it('should insert rows into notifications and notifications actions tables', async function () {
    // ======================================= Process initial Notifications =======================================
    const tx1 = await models.sequelize.transaction()
    await processRepostNotifications(initialNotifications, tx1)
    await tx1.commit()

    // ======================================= Run checks against the Notifications =======================================
    // User 20 Should have 2 notifications
    // 1.) users 1 & 2 liked digital_content 10 (owned by user 20)
    // 2) user 2 liked digital_content 11 (owned by user 20)
    const userNotifs = await models.Notification.findAll({ where: { userId: 20 } })
    const digitalContent10Notification = userNotifs.find(notif => notif.entityId === 10)

    // For the digital_content 10 favorites, check that there are 2 notificationa actions - users 1 & 2 favoriting it!
    const digitalContent10NotificationActions = await models.NotificationAction.findAll({ where: { notificationId: digitalContent10Notification.id } })
    assert.deepStrictEqual(digitalContent10NotificationActions.length, 2)

    const userIdsThatFavoirtedDigitalContent10 = digitalContent10NotificationActions.map(na => na.actionEntityId)
    assert.deepStrictEqual(userIdsThatFavoirtedDigitalContent10, [1, 2])

    // User 23 Should have 1 notifications
    // 1.) users 3 liked contentList 14 (owned by user 23)
    const user23Notifs = await models.Notification.findAll({ where: { userId: 23 } })
    assert.deepStrictEqual(user23Notifs.length, 1)
    assert.deepStrictEqual(user23Notifs[0].type, notificationTypes.Repost.contentList)

    const user23NotifAction = await models.NotificationAction.findAll({ where: { notificationId: user23Notifs[0].id } })
    assert.deepStrictEqual(user23NotifAction.length, 1)
    assert.deepStrictEqual(user23NotifAction[0].actionEntityType, actionEntityTypes.User)
    assert.deepStrictEqual(user23NotifAction[0].actionEntityId, 3)

    // User 25 Should have 1 notifications
    // 1.) users 4 liked album 10 (owned by user 25)
    const user25Notifs = await models.Notification.findAll({ where: { userId: 25 } })
    assert.deepStrictEqual(user25Notifs.length, 1)
    assert.deepStrictEqual(user25Notifs[0].type, notificationTypes.Repost.album)

    const user25NotifAction = await models.NotificationAction.findAll({ where: { notificationId: user25Notifs[0].id } })
    assert.deepStrictEqual(user25NotifAction.length, 1)
    assert.deepStrictEqual(user25NotifAction[0].actionEntityType, actionEntityTypes.User)
    assert.deepStrictEqual(user25NotifAction[0].actionEntityId, 4)

    // ======================================= Mark some Notifications as viewed =======================================
    digitalContent10Notification.isViewed = true
    await digitalContent10Notification.save()

    // ======================================= Process additional notifications =======================================
    const tx2 = await models.sequelize.transaction()
    await processRepostNotifications(additionalNotifications, tx2)
    await tx2.commit()

    // User 20 Should have 3 notifications
    // 1) users 1 & 2 liked digital_content 10 (owned by user 20)
    // 1) user 5 liked digital_content 10 (owned by user 20)
    // 2) user 2 & 5 liked digital_content 11 (owned by user 20)
    const updatedUserNotifs = await models.Notification.findAll({ where: { userId: 20 } })
    const digitalContent10Prev = updatedUserNotifs.find(notif => notif.entityId === 10 && notif.isViewed === true)
    const digitalContent10New = updatedUserNotifs.find(notif => notif.entityId === 10 && notif.isViewed === false)
    const digitalContent11 = updatedUserNotifs.find(notif => notif.entityId === 11)
    assert.deepStrictEqual(updatedUserNotifs.length, 3)

    const digitalContent10PrevActions = await models.NotificationAction.findAll({ where: { notificationId: digitalContent10Prev.id } })
    assert.deepStrictEqual(digitalContent10PrevActions.length, 2)

    const digitalContent10NewActions = await models.NotificationAction.findAll({ where: { notificationId: digitalContent10New.id } })
    assert.deepStrictEqual(digitalContent10NewActions.length, 1)
    assert.deepStrictEqual(digitalContent10NewActions[0].actionEntityId, 5)

    const digitalContent11Actions = await models.NotificationAction.findAll({ where: { notificationId: digitalContent11.id } })
    assert.deepStrictEqual(digitalContent11Actions.length, 2)
  })
})
