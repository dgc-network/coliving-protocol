const assert = require('assert')
const sinon = require('sinon')

const models = require('../../src/models')
const processNotifications = require('../../src/notifications/processNotifications/index.js')
const { challengeInfoMap } = require('../../src/notifications/formatNotificationMetadata.js')
const sendNotifications = require('../../src/notifications/sendNotifications/index.js')
const { processTrendingDigitalContents } = require('../../src/notifications/trendingDigitalContentProcessing')
const { pushNotificationQueue } = require('../../src/notifications/notificationQueue')
const { clearDatabase, runMigrations } = require('../lib/app')
const notificationUtils = require('../../src/notifications/sendNotifications/utils')

// Mock Notifications
const remixCreate = require('./mockNotifications/remixCreate.json')
const remixCosign = require('./mockNotifications/remixCosign.json')
const follow = require('./mockNotifications/follow.json')
const repost = require('./mockNotifications/repost.json')
const favorite = require('./mockNotifications/favorite.json')
const create = require('./mockNotifications/create.json')
const trendingDigitalContent = require('./mockNotifications/trendingDigitalContent.json')
const challengeReward = require('./mockNotifications/challengeReward.json')

const mockColivingLibs = require('./mockLibs')
const { deviceType } = require('../../src/notifications/constants')

describe('Test Send Notifications', function () {
  before(() => {
    sinon.stub(notificationUtils, 'getPendingCreateDedupeMs')
      .returns(5 * 1000) // 5 second dedupe
  })

  beforeEach(async () => {
    await clearDatabase()
    await runMigrations()
    // Clear the notifications buffer
    pushNotificationQueue.PUSH_NOTIFICATIONS_BUFFER = []
  })

  it('should have the correct remix create notifications', async function () {
    // Create a mobile notification setting, defaults to true for remixes
    await models.UserNotificationMobileSettings.create({ userId: 100 })
    await models.UserNotificationMobileSettings.create({ userId: 101, remixes: false })
    await models.UserNotificationBrowserSettings.create({ userId: 101, remixes: true })

    const tx1 = await models.sequelize.transaction()
    await processNotifications(remixCreate, tx1)
    await sendNotifications(mockColivingLibs, remixCreate, tx1)
    await tx1.commit()
    let pushNotifications = pushNotificationQueue.PUSH_NOTIFICATIONS_BUFFER

    for (const notification of pushNotifications) {
      assert.deepStrictEqual(notification.notificationParams.title, 'New Remix Of Your DigitalContent ♻️')
    }
    const user100Notifs = pushNotifications.filter(n => n.userId === 100)
    assert.deepStrictEqual(user100Notifs.length, 2)

    const user101Notifs = pushNotifications.filter(n => n.userId === 101)
    assert.deepStrictEqual(user101Notifs.length, 1)

    for (const notification of user100Notifs) {
      assert.deepStrictEqual(notification.types, ['mobile'])
    }

    for (const notification of user101Notifs) {
      assert.deepStrictEqual(notification.types, ['browser'])
    }
  })

  it('should have the correct remix cosign notifications', async function () {
    // NOTE: remix cosign will attempt to send to mobile and browser
    // 'should have the correct remix cosign notifications'
    const tx1 = await models.sequelize.transaction()
    await processNotifications(remixCosign, tx1)
    await sendNotifications(mockColivingLibs, remixCosign, tx1)
    await tx1.commit()

    const pushNotifications = pushNotificationQueue.PUSH_NOTIFICATIONS_BUFFER

    for (const notification of pushNotifications) {
      assert.deepStrictEqual(notification.notificationParams.title, 'New DigitalContent Co-Sign! 🔥')
      assert.deepStrictEqual(notification.types, ['mobile', 'browser'])
    }
    const user2Notifs = pushNotifications.filter(n => n.userId === 2)
    assert.deepStrictEqual(user2Notifs.length, 1)
    assert.deepStrictEqual(user2Notifs[0].notificationParams.message, 'user 1 Co-Signed your Remix of Title, DigitalContent id: 10')

    const user3Notifs = pushNotifications.filter(n => n.userId === 3)
    assert.deepStrictEqual(user3Notifs.length, 1)
    assert.deepStrictEqual(user3Notifs[0].notificationParams.message, 'user 1 Co-Signed your Remix of Title, DigitalContent id: 11')
  })

  it('should have the correct follow notifications', async function () {
    await models.UserNotificationMobileSettings.create({ userId: 2 })
    await models.UserNotificationBrowserSettings.create({ userId: 3 })

    const tx1 = await models.sequelize.transaction()
    await processNotifications(follow, tx1)
    await sendNotifications(mockColivingLibs, follow, tx1)
    await tx1.commit()

    const pushNotifications = pushNotificationQueue.PUSH_NOTIFICATIONS_BUFFER
    assert.deepStrictEqual(pushNotifications.length, 3)

    for (const notification of pushNotifications) {
      assert.deepStrictEqual(notification.notificationParams.title, 'New Follower')
    }

    const user2Notifs = pushNotifications.filter(n => n.userId === 2)
    assert.deepStrictEqual(user2Notifs.length, 1)
    assert.deepStrictEqual(user2Notifs[0].notificationParams.message, 'user 1 followed you')
    assert.deepStrictEqual(user2Notifs[0].types, ['mobile'])

    const user3Notifs = pushNotifications.filter(n => n.userId === 3)
    assert.deepStrictEqual(user3Notifs.length, 2)
    assert.deepStrictEqual(user3Notifs[0].notificationParams.message, 'user 1 followed you')
    assert.deepStrictEqual(user3Notifs[0].types, ['browser'])
    assert.deepStrictEqual(user3Notifs[1].notificationParams.message, 'user 2 followed you')
    assert.deepStrictEqual(user3Notifs[1].types, ['browser'])

    // NOTE: No notifications for user 4 who has no settings set.
  })

  it('should have the correct repost notifications', async function () {
    await models.UserNotificationMobileSettings.bulkCreate([1, 2, 7].map(userId => ({ userId })))

    const tx1 = await models.sequelize.transaction()
    await processNotifications(repost, tx1)
    await sendNotifications(mockColivingLibs, repost, tx1)
    await tx1.commit()

    const pushNotifications = pushNotificationQueue.PUSH_NOTIFICATIONS_BUFFER

    assert.deepStrictEqual(pushNotifications.length, 4)

    for (const notification of pushNotifications) {
      assert.deepStrictEqual(notification.notificationParams.title, 'New Repost')
      assert.deepStrictEqual(notification.types, ['mobile'])
    }

    const user2Notifs = pushNotifications.filter(n => n.userId === 2)
    assert.deepStrictEqual(user2Notifs.length, 3)
    assert.deepStrictEqual(user2Notifs[0].notificationParams.message, 'user 1 reposted your digital_content Title, DigitalContent id: 100')
    assert.deepStrictEqual(user2Notifs[1].notificationParams.message, 'user 2 reposted your digital_content Title, DigitalContent id: 101')
    assert.deepStrictEqual(user2Notifs[2].notificationParams.message, 'user 3 reposted your contentList PLaylist id: 100')

    const user7Notifs = pushNotifications.filter(n => n.userId === 7)
    assert.deepStrictEqual(user7Notifs.length, 1)
    assert.deepStrictEqual(user7Notifs[0].notificationParams.message, 'user 4 reposted your album PLaylist id: 104')

    // NOTE: No notifications for user 4 who has no settings set.
  })

  it('should have the correct favorite notifications', async function () {
    await models.UserNotificationMobileSettings.bulkCreate([1, 2, 7].map(userId => ({ userId })))

    const tx1 = await models.sequelize.transaction()
    await processNotifications(favorite, tx1)
    await sendNotifications(mockColivingLibs, favorite, tx1)
    await tx1.commit()

    const pushNotifications = pushNotificationQueue.PUSH_NOTIFICATIONS_BUFFER

    assert.deepStrictEqual(pushNotifications.length, 4)

    for (const notification of pushNotifications) {
      assert.deepStrictEqual(notification.notificationParams.title, 'New Favorite')
      assert.deepStrictEqual(notification.types, ['mobile'])
    }

    const user2Notifs = pushNotifications.filter(n => n.userId === 2)
    assert.deepStrictEqual(user2Notifs.length, 3)
    assert.deepStrictEqual(user2Notifs[0].notificationParams.message, 'user 1 favorited your digital_content Title, DigitalContent id: 100')
    assert.deepStrictEqual(user2Notifs[1].notificationParams.message, 'user 2 favorited your digital_content Title, DigitalContent id: 101')
    assert.deepStrictEqual(user2Notifs[2].notificationParams.message, 'user 3 favorited your contentList PLaylist id: 100')

    const user7Notifs = pushNotifications.filter(n => n.userId === 7)
    assert.deepStrictEqual(user7Notifs.length, 1)
    assert.deepStrictEqual(user7Notifs[0].notificationParams.message, 'user 4 favorited your album PLaylist id: 104')

    // NOTE: No notifications for user 4 who has no settings set.
  })

  it('should have the correct trending digital_content notifications', async function () {
    await models.UserNotificationMobileSettings.bulkCreate([1, 2, 3].map(userId => ({ userId })))
    await models.UserNotificationMobileSettings.update(
      { milestonesAndAchievements: false },
      { where: { userId: 3 } }
    )

    const tx1 = await models.sequelize.transaction()
    await processTrendingDigitalContents(mockColivingLibs, 1, trendingDigitalContent, tx1)
    await tx1.commit()

    const pushNotifications = pushNotificationQueue.PUSH_NOTIFICATIONS_BUFFER

    assert.deepStrictEqual(pushNotifications.length, 3)

    for (const notification of pushNotifications) {
      assert.deepStrictEqual(notification.notificationParams.title, 'Congrats - You’re Trending! 📈')
      assert.deepStrictEqual(notification.types, ['mobile'])
    }

    const user1Notifs = pushNotifications.filter(n => n.userId === 1)
    assert.deepStrictEqual(user1Notifs.length, 2)
    assert.deepStrictEqual(user1Notifs[0].notificationParams.message, `Your DigitalContent Title, DigitalContent id: 100 is 1st on Trending Right Now! 🍾`)
    assert.deepStrictEqual(user1Notifs[1].notificationParams.message, `Your DigitalContent Title, DigitalContent id: 101 is 2nd on Trending Right Now! 🍾`)

    const user2Notifs = pushNotifications.filter(n => n.userId === 2)
    assert.deepStrictEqual(user2Notifs.length, 1)
    assert.deepStrictEqual(user2Notifs[0].notificationParams.message, `Your DigitalContent Title, DigitalContent id: 102 is 3rd on Trending Right Now! 🍾`)
  })

  it('should have the correct create notifications', async function () {
    // User 1 creates digitalContents 1, 2, 3, 4
    // User 2 creates digital_content 5
    // User 1 creates contentList 1 w/ digitalContents 1
    // User 1 creates album 2 w/ digitalContents 2

    // ======================================= Set subscribers for create notifications =======================================
    await models.Subscription.bulkCreate([
      { subscriberId: 3, userId: 1 }, // User 3 subscribes to user 1
      { subscriberId: 4, userId: 1 }, // User 4 subscribes to user 1
      { subscriberId: 4, userId: 2 } // User 4 subscribes to user 1
    ])

    const tx1 = await models.sequelize.transaction()
    await processNotifications(create, tx1)
    await sendNotifications(mockColivingLibs, create, tx1)
    await tx1.commit()

    let pushNotifications = pushNotificationQueue.PUSH_NOTIFICATIONS_BUFFER

    assert.deepStrictEqual(pushNotifications.length, 0)

    // Wait 60 seconds to debounce digitalContents / album notifications
    await new Promise(resolve => setTimeout(resolve, 5 * 1000))
    const tx2 = await models.sequelize.transaction()
    await sendNotifications(mockColivingLibs, [], tx2)
    await tx2.commit()

    pushNotifications = pushNotificationQueue.PUSH_NOTIFICATIONS_BUFFER
    assert.deepStrictEqual(pushNotifications.length, 9)

    for (const notification of pushNotifications) {
      assert.deepStrictEqual(notification.notificationParams.title, 'New Author Update')
      assert.deepStrictEqual(notification.types, ['mobile', 'browser'])
    }

    const user3Messages = [
      'user 1 released a new digital_content Title, DigitalContent id: 3',
      'user 1 released a new digital_content Title, DigitalContent id: 4',
      'user 1 released a new contentList PLaylist id: 1',
      'user 1 released a new album PLaylist id: 2'
    ]

    const user3Notifs = pushNotifications.filter(n => n.userId === 3)
    assert.deepStrictEqual(user3Notifs.length, 4)
    for (let message of user3Messages) {
      assert.deepStrictEqual(user3Notifs.some(n => n.notificationParams.message === message), true)
    }

    const user4Messages = user3Messages.concat('user 2 released a new digital_content Title, DigitalContent id: 5')
    const user4Notifs = pushNotifications.filter(n => n.userId === 4)
    assert.deepStrictEqual(user4Notifs.length, 5)
    for (let message of user4Messages) {
      assert.deepStrictEqual(user4Notifs.some(n => n.notificationParams.message === message), true)
    }
  })

  it('should have the correct reward notifications', async function () {
    const tx1 = await models.sequelize.transaction()
    await processNotifications(challengeReward, tx1)
    await sendNotifications(mockColivingLibs, challengeReward, tx1)
    await tx1.commit()

    let pushNotifications = pushNotificationQueue.PUSH_SOLANA_NOTIFICATIONS_BUFFER
    console.log(pushNotifications)
    assert.deepStrictEqual(pushNotifications.length, 8)

    const notifs = [
      {
        title: challengeInfoMap['referred'].title,
        msg: `You’ve received ${challengeInfoMap['referred'].amount} $DGC for being referred! Invite your friends to join to earn more!`
      },
      ...([
        'profile-completion', 'listen-streak', 'digital-content-upload', 'referrals', 'ref-v', 'connect-verified', 'mobile-install'
      ].map(id => ({
        title: challengeInfoMap[id].title,
        msg: `You’ve earned ${challengeInfoMap[id].amount} $DGC for completing this challenge!`
      })))
    ]

    for (const n of notifs) {
      assert.deepStrictEqual(pushNotifications.some(queueNotif =>
        queueNotif.notificationParams.title === n.title && queueNotif.notificationParams.message === n.msg), true)
    }
    assert.ok(pushNotifications.every(queueNotif => {
      return queueNotif.types.length === 2 &&
        queueNotif.types.some(t => t === deviceType.Browser) &&
        queueNotif.types.some(t => t === deviceType.Mobile)
    }))
  })

  it('should batch digital_content metadata fetches', async function () {
    // User 1 creates 500 digitalContents

    // ======================================= Set subscribers for create notifications =======================================
    await models.Subscription.bulkCreate([
      { subscriberId: 3, userId: 1 } // User 3 subscribes to user 1
    ])

    const tx1 = await models.sequelize.transaction()

    let mockNotifications = []
    for (let i = 1; i <= 500; i++) {
      const mockNotification = {
        'blocknumber': 1,
        'initiator': 1,
        'metadata': {
          'entity_id': i,
          'entity_owner_id': 1,
          'entity_type': 'digital_content'
        },
        'timestamp': '2020-10-27T15:14:20 Z',
        'type': 'Create'
      }
      mockNotifications.push(mockNotification)
    }
    await processNotifications(mockNotifications, tx1)
    await sendNotifications(mockColivingLibs, mockNotifications, tx1)
    await tx1.commit()

    let pushNotifications = pushNotificationQueue.PUSH_NOTIFICATIONS_BUFFER

    assert.deepStrictEqual(pushNotifications.length, 0)

    // Wait 60 seconds to debounce digitalContents / album notifications
    await new Promise(resolve => setTimeout(resolve, 5 * 1000))
    const tx2 = await models.sequelize.transaction()
    await sendNotifications(mockColivingLibs, [], tx2)
    await tx2.commit()

    pushNotifications = pushNotificationQueue.PUSH_NOTIFICATIONS_BUFFER
    assert.deepStrictEqual(pushNotifications.length, mockNotifications.length)

    for (const notification of pushNotifications) {
      assert.deepStrictEqual(notification.notificationParams.title, 'New Author Update')
      assert.deepStrictEqual(notification.types, ['mobile', 'browser'])
    }

    const user3Message = 'user 1 released a new digital_content Title, DigitalContent id: '

    const user3Notifs = pushNotifications.filter(n => n.userId === 3)
    assert.deepStrictEqual(user3Notifs.length, mockNotifications.length)
    for (let i = 1; i <= mockNotifications.length; i++) {
      assert.deepStrictEqual(user3Notifs.some(n => n.notificationParams.message === user3Message + i), true)
    }
  })
})
