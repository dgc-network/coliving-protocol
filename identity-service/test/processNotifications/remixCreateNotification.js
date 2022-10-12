const assert = require('assert')
const models = require('../../src/models')
const processRemixCreateNotifications = require('../../src/notifications/processNotifications/remixCreateNotification')

const { clearDatabase, runMigrations } = require('../lib/app')

/**
 * User id 50 creates digital_content 10 which remixes digital_content 9 owned by user 40
 * User id 52 creates digital_content 12 which remixes digital_content 15 owned by user 40
 */
const initialNotifications = [
  {
    'blocknumber': 1,
    'initiator': 50,
    'metadata': {
      'entity_id': 10,
      'entity_owner_id': 50,
      'entity_type': 'digital_content',
      'remix_parent_digital_content_id': 9,
      'remix_parent_digital_content_user_id': 40
    },
    'timestamp': '2020-10-24T11:45:10 Z',
    'type': 'RemixCreate'
  }, {
    'blocknumber': 1,
    'initiator': 52,
    'metadata': {
      'entity_id': 12,
      'entity_owner_id': 52,
      'entity_type': 'digital_content',
      'remix_parent_digital_content_id': 15,
      'remix_parent_digital_content_user_id': 40
    },
    'timestamp': '2020-10-24T11:45:10 Z',
    'type': 'RemixCreate'
  }
]

/**
 * User id 52 creates digital_content 13 which remixes digital_content 9 owned by user 40
 */
const additionalNotifications = [
  {
    'blocknumber': 1,
    'initiator': 52,
    'metadata': {
      'entity_id': 13,
      'entity_owner_id': 52,
      'entity_type': 'digital_content',
      'remix_parent_digital_content_id': 9,
      'remix_parent_digital_content_user_id': 40
    },
    'timestamp': '2020-10-24T11:45:10 Z',
    'type': 'RemixCreate'
  }
]

describe('Test Remix Create Notification', function () {
  beforeEach(async () => {
    await clearDatabase()
    await runMigrations()
  })

  it('should insert rows into notifications and notifications actions tables', async function () {
    // ======================================= Process initial Notifications =======================================
    const tx1 = await models.sequelize.transaction()
    await processRemixCreateNotifications(initialNotifications, tx1)
    await tx1.commit()

    // ======================================= Run checks against the Notifications =======================================
    // User 40 should have 2 notifications
    // 1.) user 50 remixing digital_content 40 (owned by user 9)
    // 2.) user 52 remixing digital_content 40 (owned by user 9)
    const userNotifs = await models.Notification.findAll({ where: { userId: 40 } })
    const digitalContent10Remix = userNotifs.find(notif => notif.entityId === 10)
    const digitalContent12Remix = userNotifs.find(notif => notif.entityId === 12)

    const digitalContent10NotificationActions = await models.NotificationAction.findAll({ where: { notificationId: digitalContent10Remix.id } })
    assert.deepStrictEqual(digitalContent10NotificationActions.length, 1)
    assert.deepStrictEqual(digitalContent10NotificationActions[0].actionEntityId, 9)

    const digitalContent12NotificationActions = await models.NotificationAction.findAll({ where: { notificationId: digitalContent12Remix.id } })
    assert.deepStrictEqual(digitalContent12NotificationActions.length, 1)
    assert.deepStrictEqual(digitalContent12NotificationActions[0].actionEntityId, 15)

    // ======================================= Mark some Notifications as viewed =======================================
    digitalContent10Remix.isViewed = true
    await digitalContent10Remix.save()

    // ======================================= Process additional notifications =======================================
    const tx2 = await models.sequelize.transaction()
    await processRemixCreateNotifications(additionalNotifications, tx2)
    await tx2.commit()

    // User 40 should have 3 notifications
    // 1.) user 50 remixing digital_content 40 (owned by user 9)
    // 2.) user 52 remixing digital_content 40 (owned by user 9)
    // 2.) user 52 remixing digital_content 40 (owned by user 9)
    const updatedUserNotifs = await models.Notification.findAll({ where: { userId: 40 } })
    assert.deepStrictEqual(updatedUserNotifs.length, 3)
    const digitalContent13 = updatedUserNotifs.find(notif => notif.entityId === 13)

    const digitalContent13Actions = await models.NotificationAction.findAll({ where: { notificationId: digitalContent13.id } })
    assert.deepStrictEqual(digitalContent13Actions.length, 1)
    assert.deepStrictEqual(digitalContent13Actions[0].actionEntityId, 9)
  })
})
