const assert = require('assert')
const models = require('../../src/models')
const processRepostNotifications = require('../../src/notifications/processNotifications/repostNotification')
const {
  notificationTypes,
  actionEntityTypes
} = require('../../src/notifications/constants')

const { clearDatabase, runMigrations } = require('../lib/app')

/**
 * User id 1 reposts agreement 10 owned by user id 20
 * User id 2 reposts agreement 10 owned by user id 20
 * User id 2 reposts agreement 11 owned by user id 20
 * User id 3 reposts content list 14 owned by user id 23
 * User id 4 reposts album 10 owned by user id 25
 */
const initialNotifications = [
  {
    'blocknumber': 1,
    'initiator': 1,
    'metadata': {
      'entity_id': 10,
      'entity_owner_id': 20,
      'entity_type': 'agreement'
    },
    'timestamp': '2020-10-24T19:39:45 Z',
    'type': 'Repost'
  }, {
    'blocknumber': 1,
    'initiator': 2,
    'metadata': {
      'entity_id': 10,
      'entity_owner_id': 20,
      'entity_type': 'agreement'
    },
    'timestamp': '2020-10-24T19:39:45 Z',
    'type': 'Repost'
  }, {
    'blocknumber': 1,
    'initiator': 2,
    'metadata': {
      'entity_id': 11,
      'entity_owner_id': 20,
      'entity_type': 'agreement'
    },
    'timestamp': '2020-10-24T19:39:45 Z',
    'type': 'Repost'
  }, {
    'blocknumber': 1,
    'initiator': 3,
    'metadata': {
      'entity_id': 14,
      'entity_owner_id': 23,
      'entity_type': 'content list'
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
 * User id 5 reposts agreement 10 owned by user id 20
 * User id 5 reposts album 11 owned by user id 20
 */
const additionalNotifications = [
  {
    'blocknumber': 2,
    'initiator': 5,
    'metadata': {
      'entity_id': 10,
      'entity_owner_id': 20,
      'entity_type': 'agreement'
    },
    'timestamp': '2020-10-24T19:39:45 Z',
    'type': 'Repost'
  }, {
    'blocknumber': 2,
    'initiator': 5,
    'metadata': {
      'entity_id': 11,
      'entity_owner_id': 20,
      'entity_type': 'agreement'
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
    // 1.) users 1 & 2 liked agreement 10 (owned by user 20)
    // 2) user 2 liked agreement 11 (owned by user 20)
    const userNotifs = await models.Notification.findAll({ where: { userId: 20 } })
    const agreement10Notification = userNotifs.find(notif => notif.entityId === 10)

    // For the agreement 10 favorites, check that there are 2 notificationa actions - users 1 & 2 favoriting it!
    const agreement10NotificationActions = await models.NotificationAction.findAll({ where: { notificationId: agreement10Notification.id } })
    assert.deepStrictEqual(agreement10NotificationActions.length, 2)

    const userIdsThatFavoirtedAgreement10 = agreement10NotificationActions.map(na => na.actionEntityId)
    assert.deepStrictEqual(userIdsThatFavoirtedAgreement10, [1, 2])

    // User 23 Should have 1 notifications
    // 1.) users 3 liked content list 14 (owned by user 23)
    const user23Notifs = await models.Notification.findAll({ where: { userId: 23 } })
    assert.deepStrictEqual(user23Notifs.length, 1)
    assert.deepStrictEqual(user23Notifs[0].type, notificationTypes.Repost.content list)

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
    agreement10Notification.isViewed = true
    await agreement10Notification.save()

    // ======================================= Process additional notifications =======================================
    const tx2 = await models.sequelize.transaction()
    await processRepostNotifications(additionalNotifications, tx2)
    await tx2.commit()

    // User 20 Should have 3 notifications
    // 1) users 1 & 2 liked agreement 10 (owned by user 20)
    // 1) user 5 liked agreement 10 (owned by user 20)
    // 2) user 2 & 5 liked agreement 11 (owned by user 20)
    const updatedUserNotifs = await models.Notification.findAll({ where: { userId: 20 } })
    const agreement10Prev = updatedUserNotifs.find(notif => notif.entityId === 10 && notif.isViewed === true)
    const agreement10New = updatedUserNotifs.find(notif => notif.entityId === 10 && notif.isViewed === false)
    const agreement11 = updatedUserNotifs.find(notif => notif.entityId === 11)
    assert.deepStrictEqual(updatedUserNotifs.length, 3)

    const agreement10PrevActions = await models.NotificationAction.findAll({ where: { notificationId: agreement10Prev.id } })
    assert.deepStrictEqual(agreement10PrevActions.length, 2)

    const agreement10NewActions = await models.NotificationAction.findAll({ where: { notificationId: agreement10New.id } })
    assert.deepStrictEqual(agreement10NewActions.length, 1)
    assert.deepStrictEqual(agreement10NewActions[0].actionEntityId, 5)

    const agreement11Actions = await models.NotificationAction.findAll({ where: { notificationId: agreement11.id } })
    assert.deepStrictEqual(agreement11Actions.length, 2)
  })
})
