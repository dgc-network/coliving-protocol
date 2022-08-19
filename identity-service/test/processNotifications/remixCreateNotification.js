const assert = require('assert')
const models = require('../../src/models')
const processRemixCreateNotifications = require('../../src/notifications/processNotifications/remixCreateNotification')

const { clearDatabase, runMigrations } = require('../lib/app')

/**
 * User id 50 creates agreement 10 which remixes agreement 9 owned by user 40
 * User id 52 creates agreement 12 which remixes agreement 15 owned by user 40
 */
const initialNotifications = [
  {
    'blocknumber': 1,
    'initiator': 50,
    'metadata': {
      'entity_id': 10,
      'entity_owner_id': 50,
      'entity_type': 'agreement',
      'remix_parent_agreement_id': 9,
      'remix_parent_agreement_user_id': 40
    },
    'timestamp': '2020-10-24T11:45:10 Z',
    'type': 'RemixCreate'
  }, {
    'blocknumber': 1,
    'initiator': 52,
    'metadata': {
      'entity_id': 12,
      'entity_owner_id': 52,
      'entity_type': 'agreement',
      'remix_parent_agreement_id': 15,
      'remix_parent_agreement_user_id': 40
    },
    'timestamp': '2020-10-24T11:45:10 Z',
    'type': 'RemixCreate'
  }
]

/**
 * User id 52 creates agreement 13 which remixes agreement 9 owned by user 40
 */
const additionalNotifications = [
  {
    'blocknumber': 1,
    'initiator': 52,
    'metadata': {
      'entity_id': 13,
      'entity_owner_id': 52,
      'entity_type': 'agreement',
      'remix_parent_agreement_id': 9,
      'remix_parent_agreement_user_id': 40
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
    // 1.) user 50 remixing agreement 40 (owned by user 9)
    // 2.) user 52 remixing agreement 40 (owned by user 9)
    const userNotifs = await models.Notification.findAll({ where: { userId: 40 } })
    const agreement10Remix = userNotifs.find(notif => notif.entityId === 10)
    const agreement12Remix = userNotifs.find(notif => notif.entityId === 12)

    const agreement10NotificationActions = await models.NotificationAction.findAll({ where: { notificationId: agreement10Remix.id } })
    assert.deepStrictEqual(agreement10NotificationActions.length, 1)
    assert.deepStrictEqual(agreement10NotificationActions[0].actionEntityId, 9)

    const agreement12NotificationActions = await models.NotificationAction.findAll({ where: { notificationId: agreement12Remix.id } })
    assert.deepStrictEqual(agreement12NotificationActions.length, 1)
    assert.deepStrictEqual(agreement12NotificationActions[0].actionEntityId, 15)

    // ======================================= Mark some Notifications as viewed =======================================
    agreement10Remix.isViewed = true
    await agreement10Remix.save()

    // ======================================= Process additional notifications =======================================
    const tx2 = await models.sequelize.transaction()
    await processRemixCreateNotifications(additionalNotifications, tx2)
    await tx2.commit()

    // User 40 should have 3 notifications
    // 1.) user 50 remixing agreement 40 (owned by user 9)
    // 2.) user 52 remixing agreement 40 (owned by user 9)
    // 2.) user 52 remixing agreement 40 (owned by user 9)
    const updatedUserNotifs = await models.Notification.findAll({ where: { userId: 40 } })
    assert.deepStrictEqual(updatedUserNotifs.length, 3)
    const agreement13 = updatedUserNotifs.find(notif => notif.entityId === 13)

    const agreement13Actions = await models.NotificationAction.findAll({ where: { notificationId: agreement13.id } })
    assert.deepStrictEqual(agreement13Actions.length, 1)
    assert.deepStrictEqual(agreement13Actions[0].actionEntityId, 9)
  })
})
