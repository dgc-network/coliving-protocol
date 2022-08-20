const models = require('../models')
const { logger } = require('../logging')

const {
  deviceType,
  notificationTypes,
  actionEntityTypes
} = require('./constants')
const { publish } = require('./notificationQueue')
const { shouldNotifyUser } = require('./utils')
const { fetchNotificationMetadata } = require('./fetchNotificationMetadata')
const {
  notificationResponseMap,
  notificationResponseTitleMap,
  pushNotificationMessagesMap
} = require('./formatNotificationMetadata')

// Base milestone list shared across all types
// Each type can be configured as needed
const baseMilestoneList = [10, 25, 50, 100, 250, 500, 1000, 5000, 10000, 20000, 50000, 100000, 1000000]
const followerMilestoneList = baseMilestoneList
// Repost milestone list shared across agreements/albums/contentLists
const repostMilestoneList = baseMilestoneList
// Favorite milestone list shared across agreements/albums/contentLists
const favoriteMilestoneList = baseMilestoneList
// Agreement listen milestone list
const agreementListenMilestoneList = baseMilestoneList

async function indexMilestones (milestones, owners, metadata, listenCounts, colivingLibs, tx) {
  // Index follower milestones into notifications table
  let timestamp = new Date()
  let blocknumber = metadata.max_block_number

  // Index follower milestones
  await updateFollowerMilestones(milestones.follower_counts, blocknumber, timestamp, colivingLibs, tx)

  // Index repost milestones
  await updateRepostMilestones(milestones.repost_counts, owners, blocknumber, timestamp, colivingLibs, tx)

  // Index favorite milestones
  await updateFavoriteMilestones(milestones.favorite_counts, owners, blocknumber, timestamp, colivingLibs, tx)
}

/**
 *
 * Follower Milestones
 *
 */
async function updateFollowerMilestones (followerCounts, blocknumber, timestamp, colivingLibs, tx) {
  let followersAddedDictionary = followerCounts
  let usersWithNewFollowers = Object.keys(followersAddedDictionary)
  const followerMilestoneNotificationType = notificationTypes.MilestoneFollow
  // Parse follower milestones
  for (var targetUser of usersWithNewFollowers) {
    if (followersAddedDictionary.hasOwnProperty(targetUser)) {
      let currentFollowerCount = followersAddedDictionary[targetUser]
      for (var i = followerMilestoneList.length; i >= 0; i--) {
        let milestoneValue = followerMilestoneList[i]
        if (currentFollowerCount === milestoneValue) {
          // MilestoneFollow
          // userId=user achieving milestone
          // entityId=milestoneValue, number of followers
          // actionEntityType=User
          // actionEntityId=milestoneValue, number of followers
          await _processMilestone(
            followerMilestoneNotificationType,
            targetUser,
            milestoneValue,
            actionEntityTypes.User,
            milestoneValue,
            blocknumber,
            timestamp,
            colivingLibs,
            tx)
          break
        }
      }
    }
  }
}

/**
 *
 * Repost Milestones
 *
 */
async function updateRepostMilestones (repostCounts, owners, blocknumber, timestamp, colivingLibs, tx) {
  let agreementsReposted = Object.keys(repostCounts.agreements)
  let albumsReposted = Object.keys(repostCounts.albums)
  let contentListsReposted = Object.keys(repostCounts.contentLists)
  const repostMilestoneNotificationType = notificationTypes.MilestoneRepost

  for (var repostedAgreementId of agreementsReposted) {
    let agreementOwnerId = owners.agreements[repostedAgreementId]
    let agreementRepostCount = repostCounts.agreements[repostedAgreementId]
    for (var i = repostMilestoneList.length; i >= 0; i--) {
      let milestoneValue = repostMilestoneList[i]
      if (agreementRepostCount === milestoneValue) {
        await _processMilestone(
          repostMilestoneNotificationType,
          agreementOwnerId,
          repostedAgreementId,
          actionEntityTypes.Agreement,
          milestoneValue,
          blocknumber,
          timestamp,
          colivingLibs,
          tx
        )
        break
      }
    }
  }

  for (var repostedAlbumId of albumsReposted) {
    let albumOwnerId = owners.albums[repostedAlbumId]
    let albumRepostCount = repostCounts.albums[repostedAlbumId]
    for (var j = repostMilestoneList.length; j >= 0; j--) {
      let milestoneValue = repostMilestoneList[j]
      if (albumRepostCount === milestoneValue) {
        await _processMilestone(
          repostMilestoneNotificationType,
          albumOwnerId,
          repostedAlbumId,
          actionEntityTypes.Album,
          milestoneValue,
          blocknumber,
          timestamp,
          colivingLibs,
          tx
        )
        break
      }
    }
  }

  for (var repostedContentListId of contentListsReposted) {
    let contentListOwnerId = owners.contentLists[repostedContentListId]
    let contentListRepostCount = repostCounts.contentLists[repostedContentListId]
    for (var k = repostMilestoneList.length; k >= 0; k--) {
      let milestoneValue = repostMilestoneList[k]
      if (contentListRepostCount === milestoneValue) {
        await _processMilestone(
          repostMilestoneNotificationType,
          contentListOwnerId,
          repostedContentListId,
          actionEntityTypes.ContentList,
          milestoneValue,
          blocknumber,
          timestamp,
          colivingLibs,
          tx
        )
        break
      }
    }
  }
}

/**
 *
 * Favorites Milestones
 *
 */
async function updateFavoriteMilestones (favoriteCounts, owners, blocknumber, timestamp, colivingLibs, tx) {
  let agreementsFavorited = Object.keys(favoriteCounts.agreements)
  let albumsFavorited = Object.keys(favoriteCounts.albums)
  let contentListsFavorited = Object.keys(favoriteCounts.contentLists)
  const favoriteMilestoneNotificationType = notificationTypes.MilestoneFavorite

  for (var favoritedAgreementId of agreementsFavorited) {
    let agreementOwnerId = owners.agreements[favoritedAgreementId]
    let agreementFavoriteCount = favoriteCounts.agreements[favoritedAgreementId]
    for (var i = favoriteMilestoneList.length; i >= 0; i--) {
      let milestoneValue = favoriteMilestoneList[i]
      if (agreementFavoriteCount === milestoneValue) {
        await _processMilestone(
          favoriteMilestoneNotificationType,
          agreementOwnerId,
          favoritedAgreementId,
          actionEntityTypes.Agreement,
          milestoneValue,
          blocknumber,
          timestamp,
          colivingLibs,
          tx
        )
        break
      }
    }
  }

  for (var favoritedAlbumId of albumsFavorited) {
    let albumOwnerId = owners.albums[favoritedAlbumId]
    let albumFavoriteCount = favoriteCounts.albums[favoritedAlbumId]
    for (var j = favoriteMilestoneList.length; j >= 0; j--) {
      let milestoneValue = favoriteMilestoneList[j]
      if (albumFavoriteCount === milestoneValue) {
        await _processMilestone(
          favoriteMilestoneNotificationType,
          albumOwnerId,
          favoritedAlbumId,
          actionEntityTypes.Album,
          milestoneValue,
          blocknumber,
          timestamp,
          colivingLibs,
          tx
        )
        break
      }
    }
  }

  for (var favoritedContentListId of contentListsFavorited) {
    let contentListOwnerId = owners.contentLists[favoritedContentListId]
    let contentListFavoriteCount = favoriteCounts.contentLists[favoritedContentListId]
    for (var k = favoriteMilestoneList.length; k >= 0; k--) {
      let milestoneValue = favoriteMilestoneList[k]
      if (contentListFavoriteCount === milestoneValue) {
        await _processMilestone(
          favoriteMilestoneNotificationType,
          contentListOwnerId,
          favoritedContentListId,
          actionEntityTypes.ContentList,
          milestoneValue,
          blocknumber,
          timestamp,
          colivingLibs,
          tx
        )
        break
      }
    }
  }
}

/**
 *
 * Listens Milestones
 *
 */
async function updateAgreementListenMilestones (listenCounts, blocknumber, timestamp, colivingLibs, tx) { // eslint-disable-line no-unused-vars
  const listensMilestoneNotificationType = notificationTypes.MilestoneListen

  for (var entry of listenCounts) {
    let agreementListenCount = Number.parseInt(entry.listenCount)
    for (var i = agreementListenMilestoneList.length; i >= 0; i--) {
      let milestoneValue = agreementListenMilestoneList[i]
      if (agreementListenCount === milestoneValue || (agreementListenCount >= milestoneValue && agreementListenCount <= milestoneValue * 1.1)) {
        let agreementId = entry.agreementId
        let ownerId = entry.owner
        await _processMilestone(
          listensMilestoneNotificationType,
          ownerId,
          agreementId,
          actionEntityTypes.Agreement,
          milestoneValue,
          blocknumber,
          timestamp,
          colivingLibs,
          tx
        )
        break
      }
    }
  }
}

async function _processMilestone (milestoneType, userId, entityId, entityType, milestoneValue, blocknumber, timestamp, colivingLibs, tx) {
  // Skip notification based on user configuration
  const { notifyMobile, notifyBrowserPush } = await shouldNotifyUser(userId, 'milestonesAndAchievements')

  let newMilestone = false
  let existingMilestoneQuery = await models.Notification.findAll({
    where: {
      userId: userId,
      type: milestoneType,
      entityId: entityId
    },
    include: [{
      model: models.NotificationAction,
      as: 'actions',
      where: {
        actionEntityType: entityType,
        actionEntityId: milestoneValue
      }
    }],
    transaction: tx
  })

  if (existingMilestoneQuery.length === 0) {
    newMilestone = true
    // MilestoneListen/Favorite/Repost
    // userId=user achieving milestone
    // entityId=Entity reaching milestone, one of agreement/collection
    // actionEntityType=Entity achieving milestone, can be agreement/collection
    // actionEntityId=Milestone achieved
    let createMilestoneTx = await models.Notification.create({
      userId: userId,
      type: milestoneType,
      entityId: entityId,
      blocknumber,
      timestamp
    }, { transaction: tx })
    let notificationId = createMilestoneTx.id
    await models.NotificationAction.findOrCreate({
      where: {
        notificationId,
        actionEntityType: entityType,
        actionEntityId: milestoneValue,
        blocknumber
      },
      transaction: tx
    })
    logger.info(`processMilestone - Process milestone ${userId}, type ${milestoneType}, entityId ${entityId}, type ${entityType}, milestoneValue ${milestoneValue}`)

    // Destroy any unread milestone notifications of this type + entity
    let milestonesToBeDeleted = await models.Notification.findAll({
      where: {
        userId: userId,
        type: milestoneType,
        entityId: entityId,
        isRead: false
      },
      include: [{
        model: models.NotificationAction,
        as: 'actions',
        where: {
          actionEntityType: entityType,
          actionEntityId: {
            [models.Sequelize.Op.not]: milestoneValue
          }
        }
      }]
    })

    if (milestonesToBeDeleted) {
      for (var milestoneToDelete of milestonesToBeDeleted) {
        logger.info(`Deleting milestone: ${milestoneToDelete.id}`)
        let destroyTx = await models.NotificationAction.destroy({
          where: {
            notificationId: milestoneToDelete.id
          },
          transaction: tx
        })
        logger.info(destroyTx)
        destroyTx = await models.Notification.destroy({
          where: {
            id: milestoneToDelete.id
          },
          transaction: tx
        })
        logger.info(destroyTx)
      }
    }
  }

  // Only send a milestone push notification on the first insert to the DB
  if ((notifyMobile || notifyBrowserPush) && newMilestone) {
    const notifStub = {
      userId: userId,
      type: milestoneType,
      entityId: entityId,
      blocknumber,
      timestamp,
      actions: [{
        actionEntityType: entityType,
        actionEntityId: milestoneValue,
        blocknumber
      }]
    }

    const metadata = await fetchNotificationMetadata(colivingLibs, [milestoneValue], [notifStub])
    const mapNotification = notificationResponseMap[milestoneType]
    try {
      let msgGenNotif = {
        ...notifStub,
        ...(mapNotification(notifStub, metadata))
      }
      logger.debug('processMilestone - About to generate message for milestones push notification', msgGenNotif, metadata)
      const msg = pushNotificationMessagesMap[notificationTypes.Milestone](msgGenNotif)
      logger.debug(`processMilestone - message: ${msg}`)
      const title = notificationResponseTitleMap[notificationTypes.Milestone]()
      let types = []
      if (notifyMobile) types.push(deviceType.Mobile)
      if (notifyBrowserPush) types.push(deviceType.Browser)
      await publish(msg, userId, tx, true, title, types)
    } catch (e) {
      // Log on error instead of failing
      logger.info(`Error adding push notification to buffer: ${e}. notifStub ${JSON.stringify(notifStub)}`)
    }
  }
}

module.exports = {
  indexMilestones
}
