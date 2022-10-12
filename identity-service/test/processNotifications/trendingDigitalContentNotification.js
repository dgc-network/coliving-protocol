const assert = require('assert')
const moment = require('moment')
const nock = require('nock')
const models = require('../../src/models')
const {
  processTrendingDigitalContents,
  getTimeGenreActionType,
  TRENDING_TIME,
  TRENDING_GENRE,
  getTrendingDigitalContents
} = require('../../src/notifications/trendingDigitalContentProcessing')
const {
  notificationTypes
} = require('../../src/notifications/constants')

const { clearDatabase, runMigrations } = require('../lib/app')
const { encodeHashId } = require('../../src/notifications/utils')

/**
 * DigitalContent id 100 owned by user id 1 is #1 trending
 * DigitalContent id 101 owned by user id 1 is #2 trending
 * DigitalContent id 102 owned by user id 2 is #3 trending
 * DigitalContent id 103 owned by user id 3 is #4 trending
 * DigitalContent id 104 owned by user id 4 is #5 trending
 */
const initialNotifications = [
  {
    'digitalContentId': 100,
    'userId': 1,
    'rank': 1,
    'type': notificationTypes.TrendingDigitalContent
  }, {
    'digitalContentId': 101,
    'userId': 1,
    'rank': 2,
    'type': notificationTypes.TrendingDigitalContent
  }, {
    'digitalContentId': 102,
    'userId': 2,
    'rank': 3,
    'type': notificationTypes.TrendingDigitalContent
  }, {
    'digitalContentId': 103,
    'userId': 3,
    'rank': 4,
    'type': notificationTypes.TrendingDigitalContent
  }, {
    'digitalContentId': 104,
    'userId': 4,
    'rank': 5,
    'type': notificationTypes.TrendingDigitalContent
  }
]

/**
 * DigitalContent id 103 owned by user id 3 is #1 trending <= increase
 * DigitalContent id 104 owned by user id 4 is #2 trending <= increase
 * DigitalContent id 100 owned by user id 1 is #3 trending <= decrease
 * DigitalContent id 110 owned by user id 10 is #4 trending <= new
 * DigitalContent id 101 owned by user id 1 is #5 trending <= decrease
 */
const additionalNotifications = [
  {
    'digitalContentId': 103,
    'userId': 3,
    'rank': 1,
    'type': notificationTypes.TrendingDigitalContent
  }, {
    'digitalContentId': 104,
    'userId': 4,
    'rank': 2,
    'type': notificationTypes.TrendingDigitalContent
  }, {
    'digitalContentId': 100,
    'userId': 1,
    'rank': 3,
    'type': notificationTypes.TrendingDigitalContent
  }, {
    'digitalContentId': 110,
    'userId': 10,
    'rank': 4,
    'type': notificationTypes.TrendingDigitalContent
  }, {
    'digitalContentId': 101,
    'userId': 1,
    'rank': 5,
    'type': notificationTypes.TrendingDigitalContent
  }
]

const makeTrendingResponse = (ids) => {
  const data = ids.map(id => ({
    title: `DigitalContent ${id}`,
    description: `DigitalContent description ${id}`,
    genre: 'Electronic',
    id: encodeHashId(id),
    user: {
      id: encodeHashId(id)
    }
  }))
  return ({
    data,
    latest_indexed_block: 100
  })
}

describe('Test Trending DigitalContent Notification', () => {
  beforeEach(async () => {
    await clearDatabase()
    await runMigrations()
  })

  it('should query discovery nodes for consensus', async () => {
    const endpoints = [
      'https://discoverya.com',
      'https://discoveryb.com',
      'https://discoveryc.com'
    ]
    nock(endpoints[0])
      .get('/v1/full/digital_contents/trending?time=week&limit=10')
      .reply(200, makeTrendingResponse([1, 8, 6, 4, 5, 3, 2, 9, 10, 7]))
    nock(endpoints[1])
      .get('/v1/full/digital_contents/trending?time=week&limit=10')
      .reply(200, makeTrendingResponse([1, 8, 6, 4, 5, 3, 2, 9, 10, 7]))
    nock(endpoints[2])
      .get('/v1/full/digital_contents/trending?time=week&limit=10')
      .reply(200, makeTrendingResponse([1, 8, 6, 4, 5, 3, 2, 9, 10, 7]))

    const { trendingDigitalContents, blocknumber } = await getTrendingDigitalContents('', endpoints)
    assert.deepStrictEqual(blocknumber, 100)
    assert.deepStrictEqual(trendingDigitalContents, [
      { digitalContentId: 1, rank: 1, userId: 1 },
      { digitalContentId: 8, rank: 2, userId: 8 },
      { digitalContentId: 6, rank: 3, userId: 6 },
      { digitalContentId: 4, rank: 4, userId: 4 },
      { digitalContentId: 5, rank: 5, userId: 5 },
      { digitalContentId: 3, rank: 6, userId: 3 },
      { digitalContentId: 2, rank: 7, userId: 2 },
      { digitalContentId: 9, rank: 8, userId: 9 },
      { digitalContentId: 10, rank: 9, userId: 10 },
      { digitalContentId: 7, rank: 10, userId: 7 }
    ])
  })

  it('should fail to notify when not reaching consensus', async () => {
    const endpoints = [
      'https://discoverya.com',
      'https://discoveryb.com',
      'https://discoveryc.com'
    ]
    nock(endpoints[0])
      .get('/v1/full/digital_contents/trending?time=week&limit=10')
      .reply(200, makeTrendingResponse([1, 8, 6, 4, 5, 3, 2, 9, 10, 7]))
    nock(endpoints[1])
      .get('/v1/full/digital_contents/trending?time=week&limit=10')
      // Note: items 2 & 3 are flipped here
      .reply(200, makeTrendingResponse([1, 8, 6, 4, 5, 2, 3, 9, 10, 7]))
    nock(endpoints[2])
      .get('/v1/full/digital_contents/trending?time=week&limit=10')
      .reply(200, makeTrendingResponse([1, 8, 6, 4, 5, 3, 2, 9, 10, 7]))

    const result = await getTrendingDigitalContents('', endpoints)
    assert.deepStrictEqual(result, null)
  })

  it('should insert rows into notifications and notifications actions tables', async () => {
    // ======================================= Process initial Notifications =======================================
    const tx1 = await models.sequelize.transaction()
    await processTrendingDigitalContents(null, 1, initialNotifications, tx1)
    await tx1.commit()

    // ======================================= Run checks against the Notifications =======================================
    // User 20 Should have 2 notifications
    // 1.) users 1 & 2 liked digital_content 10 (owned by user 20)
    // 2) user 2 liked digital_content 11 (owned by user 20)
    const user1Notifs = await models.Notification.findAll({ where: { userId: 1 } })
    assert.deepStrictEqual(user1Notifs.length, 2)
    const digitalContent100Notification = user1Notifs.find(notif => notif.entityId === 100)
    assert.ok(digitalContent100Notification)
    const digitalContent101Notification = user1Notifs.find(notif => notif.entityId === 101)
    assert.ok(digitalContent101Notification)

    // For the digital_content 100 rank 1 check that the notification action is correct
    const digitalContent100NotificationActions = await models.NotificationAction.findAll({ where: { notificationId: digitalContent100Notification.id } })
    assert.deepStrictEqual(digitalContent100NotificationActions.length, 1)
    assert.deepStrictEqual(digitalContent100NotificationActions[0].actionEntityId, 1)
    assert.deepStrictEqual(digitalContent100NotificationActions[0].actionEntityType, getTimeGenreActionType(TRENDING_TIME.WEEK, TRENDING_GENRE.ALL))

    // For the digital_content 100 rank 1 check that the notification action is correct
    const digitalContent101NotificationActions = await models.NotificationAction.findAll({ where: { notificationId: digitalContent101Notification.id } })
    assert.deepStrictEqual(digitalContent101NotificationActions.length, 1)
    assert.deepStrictEqual(digitalContent101NotificationActions[0].actionEntityId, 2)
    assert.deepStrictEqual(digitalContent101NotificationActions[0].actionEntityType, getTimeGenreActionType(TRENDING_TIME.WEEK, TRENDING_GENRE.ALL))

    const allNotifs = await models.Notification.findAll()
    assert.deepStrictEqual(allNotifs.length, 5)
    const allNotifActions = await models.NotificationAction.findAll()
    assert.deepStrictEqual(allNotifActions.length, 5)

    // increase time

    // ======================================= Process the same trending digitalContents =======================================
    const tx2 = await models.sequelize.transaction()
    await processTrendingDigitalContents(null, 2, initialNotifications, tx2)
    await tx2.commit()

    // Check that there are the same number of notifications
    const allNotifsAfter = await models.Notification.findAll()
    assert.deepStrictEqual(allNotifsAfter.length, 5)
    const allNotifActionsAfter = await models.NotificationAction.findAll()
    assert.deepStrictEqual(allNotifActionsAfter.length, 5)

    // Do some more checks
    const threeHrsAgo = moment(Date.now()).subtract(1, 'h')
    await models.Notification.update({ timestamp: threeHrsAgo }, { where: {} })

    // ======================================= Process the new trending digitalContents =======================================
    const tx3 = await models.sequelize.transaction()
    await processTrendingDigitalContents(null, 3, additionalNotifications, tx3)
    await tx3.commit()

    // Check that there is one more notification
    const allNotifsAfterUpdated = await models.Notification.findAll()
    console.log({ allNotifsAfterUpdated: allNotifsAfterUpdated.map(n => ({ userId: n.userId, digital_content: n.entityId })) })
    assert.deepStrictEqual(allNotifsAfterUpdated.length, 6)

    const user10Notifs = await models.Notification.findAll({ where: { userId: 10 } })
    assert.deepStrictEqual(user10Notifs.length, 1)
    const digitalContent110Notification = user10Notifs.find(notif => notif.entityId === 110)
    assert.ok(digitalContent110Notification)

    // Do some more checks
    const sevenHrsAgo = moment(Date.now()).subtract(7, 'h')
    await models.Notification.update({ timestamp: sevenHrsAgo }, { where: {} })

    // ======================================= Process the new trending digitalContents =======================================
    const tx4 = await models.sequelize.transaction()
    await processTrendingDigitalContents(null, 4, additionalNotifications, tx4)
    await tx4.commit()

    // Check that there is one more notification
    const allNotifsAfterAll = await models.Notification.findAll()
    assert.deepStrictEqual(allNotifsAfterAll.length, 8)

    const user4Notifs = await models.Notification.findAll({ where: { userId: 4 } })
    assert.deepStrictEqual(user4Notifs.length, 2)

    const user3Notifs = await models.Notification.findAll({ where: { userId: 3 } })
    assert.deepStrictEqual(user3Notifs.length, 2)
  })
})
