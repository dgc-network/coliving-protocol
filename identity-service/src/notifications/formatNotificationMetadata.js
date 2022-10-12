const { notificationTypes: NotificationType } = require('../notifications/constants')
const Entity = require('../routes/notifications').Entity
const mapMilestone = require('../routes/notifications').mapMilestone
const { actionEntityTypes, notificationTypes } = require('./constants')
const { formatWei, capitalize } = require('./processNotifications/utils')
const BN = require('bn.js')

const getRankSuffix = (num) => {
  if (num === 1) return 'st'
  else if (num === 2) return 'nd'
  else if (num === 3) return 'rd'
  return 'th'
}

const formatFavorite = (notification, metadata, entity) => {
  return {
    type: NotificationType.Favorite.base,
    users: notification.actions.map(action => {
      const userId = action.actionEntityId
      const user = metadata.users[userId]
      if (!user) return null
      return { id: user.id, handle: user.handle, name: user.name, image: user.thumbnail }
    }),
    entity
  }
}

const formatRepost = (notification, metadata, entity) => {
  return {
    type: NotificationType.Repost.base,
    users: notification.actions.map(action => {
      const userId = action.actionEntityId
      const user = metadata.users[userId]
      if (!user) return null
      return { id: user.user_id, handle: user.handle, name: user.name, image: user.thumbnail }
    }),
    entity
  }
}

const formatUserSubscription = (notification, metadata, entity, users) => {
  return {
    type: NotificationType.UserSubscription,
    users,
    entity
  }
}

const formatMilestone = (achievement) => (notification, metadata) => {
  return {
    type: NotificationType.Milestone,
    ...mapMilestone[notification.type],
    entity: getMilestoneEntity(notification, metadata),
    value: notification.actions[0].actionEntityId,
    achievement
  }
}

function formatTrendingDigitalContent (notification, metadata) {
  const digitalContentId = notification.entityId
  const digital_content = metadata.digitalContents[digitalContentId]
  if (!notification.actions.length === 1) return null
  const rank = notification.actions[0].actionEntityId
  const type = notification.actions[0].actionEntityType
  const [time, genre] = type.split(':')
  return {
    type: NotificationType.TrendingDigitalContent,
    entity: digital_content,
    rank,
    time,
    genre
  }
}

function getMilestoneEntity (notification, metadata) {
  if (notification.type === NotificationType.MilestoneFollow) return undefined
  const type = notification.actions[0].actionEntityType
  const entityId = notification.entityId
  const name = (type === Entity.DigitalContent)
    ? metadata.digitalContents[entityId].title
    : metadata.collections[entityId].content_list_name
  return { type, name }
}

function formatFollow (notification, metadata) {
  return {
    type: NotificationType.Follow,
    users: notification.actions.map(action => {
      const userId = action.actionEntityId
      const user = metadata.users[userId]
      if (!user) return null
      return { id: userId, handle: user.handle, name: user.name, image: user.thumbnail }
    })
  }
}

function formatAnnouncement (notification) {
  return {
    type: NotificationType.Announcement,
    text: notification.shortDescription,
    hasReadMore: !!notification.longDescription
  }
}

function formatRemixCreate (notification, metadata) {
  const digitalContentId = notification.entityId
  const parentDigitalContentAction = notification.actions.find(action =>
    action.actionEntityType === actionEntityTypes.DigitalContent &&
    action.actionEntityId !== digitalContentId)
  const parentDigitalContentId = parentDigitalContentAction.actionEntityId
  const remixDigitalContent = metadata.digitalContents[digitalContentId]
  const parentDigitalContent = metadata.digitalContents[parentDigitalContentId]
  const userId = remixDigitalContent.owner_id
  const parentDigitalContentUserId = parentDigitalContent.owner_id

  return {
    type: NotificationType.RemixCreate,
    remixUser: metadata.users[userId],
    remixDigitalContent,
    parentDigitalContentUser: metadata.users[parentDigitalContentUserId],
    parentDigitalContent
  }
}

function formatRemixCosign (notification, metadata) {
  const digitalContentId = notification.entityId
  const parentDigitalContentUserAction = notification.actions.find(action =>
    action.actionEntityType === actionEntityTypes.User
  )
  const parentDigitalContentUserId = parentDigitalContentUserAction.actionEntityId
  const remixDigitalContent = metadata.digitalContents[digitalContentId]
  const parentDigitalContents = remixDigitalContent.remix_of.digitalContents.map(t => metadata.digitalContents[t.parent_digital_content_id])
  return {
    type: NotificationType.RemixCosign,
    parentDigitalContentUser: metadata.users[parentDigitalContentUserId],
    parentDigitalContents,
    remixDigitalContent
  }
}

function formatChallengeReward (notification) {
  const challengeId = notification.actions[0].actionEntityType
  return {
    type: NotificationType.ChallengeReward,
    challengeId,
    rewardAmount: challengeInfoMap[challengeId].amount
  }
}

function formatAddDigitalContentToContentList (notification, metadata) {
  return {
    type: NotificationType.AddDigitalContentToContentList,
    digital_content: metadata.digitalContents[notification.entityId],
    contentList: metadata.collections[notification.metadata.contentListId],
    contentListOwner: metadata.users[notification.metadata.contentListOwnerId]
  }
}

function formatReaction (notification, metadata) {
  const userId = notification.initiator
  const user = metadata.users[userId]
  return {
    type: NotificationType.Reaction,
    reactingUser: user,
    amount: formatWei(new BN(notification.metadata.reacted_to_entity.amount))
  }
}
// This is different from the above corresponding function
// because it operates on data coming from the database
// as opposed to that coming from the DN.
function formatReactionEmail (notification, extras) {
  const { entityId, metadata: { reactedToEntity: { amount } } } = notification
  return {
    type: NotificationType.Reaction,
    reactingUser: extras.users[entityId],
    amount: formatWei(new BN(amount))
  }
}

function formatTipReceive (notification, metadata) {
  const userId = notification.metadata.entity_id
  const user = metadata.users[userId]
  return {
    type: NotificationType.TipReceive,
    sendingUser: user,
    amount: formatWei(new BN(notification.metadata.amount))
  }
}
// This is different from the above corresponding function
// because it operates on data coming from the database
// as opposed to that coming from the DN.
function formatTipReceiveEmail (notification, extras) {
  const { entityId, metadata: { amount } } = notification
  return {
    type: NotificationType.TipReceive,
    sendingUser: extras.users[entityId],
    amount: formatWei(new BN(amount))
  }
}

function formatSupporterRankUp (notification, metadata) {
  // Sending user
  const userId = notification.metadata.entity_id
  const user = metadata.users[userId]
  return {
    type: NotificationType.SupporterRankUp,
    rank: notification.metadata.rank,
    sendingUser: user
  }
}
// This is different from the above corresponding function
// because it operates on data coming from the database
// as opposed to that coming from the DN.
function formatSupporterRankUpEmail (notification, extras) {
  const { entityId: rank, metadata: { supportingUserId } } = notification
  return {
    type: NotificationType.SupporterRankUp,
    rank,
    sendingUser: extras.users[supportingUserId]
  }
}

function formatSupportingRankUp (notification, metadata) {
  // Receiving user
  const userId = notification.initiator
  const user = metadata.users[userId]
  return {
    type: NotificationType.SupportingRankUp,
    rank: notification.metadata.rank,
    receivingUser: user
  }
}
// This is different from the above corresponding function
// because it operates on data coming from the database
// as opposed to that coming from the DN.
function formatSupportingRankUpEmail (notification, extras) {
  const { entityId: rank, metadata: { supportedUserId } } = notification
  return {
    type: NotificationType.SupportingRankUp,
    rank,
    receivingUser: extras.users[supportedUserId]
  }
}

// Copied directly from ColivingClient

const notificationResponseMap = {
  [NotificationType.Follow]: formatFollow,
  [NotificationType.Favorite.digital_content]: (notification, metadata) => {
    const digital_content = metadata.digitalContents[notification.entityId]
    return formatFavorite(notification, metadata, { type: Entity.DigitalContent, name: digital_content.title })
  },
  [NotificationType.Favorite.contentList]: (notification, metadata) => {
    const collection = metadata.collections[notification.entityId]
    return formatFavorite(notification, metadata, { type: Entity.ContentList, name: collection.content_list_name })
  },
  [NotificationType.Favorite.album]: (notification, metadata) => {
    const collection = metadata.collections[notification.entityId]
    return formatFavorite(notification, metadata, { type: Entity.Album, name: collection.content_list_name })
  },
  [NotificationType.Repost.digital_content]: (notification, metadata) => {
    const digital_content = metadata.digitalContents[notification.entityId]
    return formatRepost(notification, metadata, { type: Entity.DigitalContent, name: digital_content.title })
  },
  [NotificationType.Repost.contentList]: (notification, metadata) => {
    const collection = metadata.collections[notification.entityId]
    return formatRepost(notification, metadata, { type: Entity.ContentList, name: collection.content_list_name })
  },
  [NotificationType.Repost.album]: (notification, metadata) => {
    const collection = metadata.collections[notification.entityId]
    return formatRepost(notification, metadata, { type: Entity.Album, name: collection.content_list_name })
  },
  [NotificationType.Create.digital_content]: (notification, metadata) => {
    const digitalContentId = notification.actions[0].actionEntityId
    const digital_content = metadata.digitalContents[digitalContentId]
    const count = notification.actions.length
    let user = metadata.users[notification.entityId]
    let users = [{ name: user.name, image: user.thumbnail }]
    return formatUserSubscription(notification, metadata, { type: Entity.DigitalContent, count, name: digital_content.title }, users)
  },
  [NotificationType.Create.album]: (notification, metadata) => {
    const collection = metadata.collections[notification.entityId]
    let users = notification.actions.map(action => {
      const userId = action.actionEntityId
      const user = metadata.users[userId]
      return { name: user.name, image: user.thumbnail }
    })
    return formatUserSubscription(notification, metadata, { type: Entity.Album, count: 1, name: collection.content_list_name }, users)
  },
  [NotificationType.Create.contentList]: (notification, metadata) => {
    const collection = metadata.collections[notification.entityId]
    let users = notification.actions.map(action => {
      const userId = action.actionEntityId
      const user = metadata.users[userId]
      return { name: user.name, image: user.thumbnail }
    })
    return formatUserSubscription(notification, metadata, { type: Entity.ContentList, count: 1, name: collection.content_list_name }, users)
  },
  [NotificationType.RemixCreate]: formatRemixCreate,
  [NotificationType.RemixCosign]: formatRemixCosign,
  [NotificationType.TrendingDigitalContent]: formatTrendingDigitalContent,
  [NotificationType.ChallengeReward]: formatChallengeReward,
  [NotificationType.Reaction]: formatReaction,
  [NotificationType.TipReceive]: formatTipReceive,
  [NotificationType.SupporterRankUp]: formatSupporterRankUp,
  [NotificationType.SupportingRankUp]: formatSupportingRankUp,
  [NotificationType.Announcement]: formatAnnouncement,
  [NotificationType.MilestoneRepost]: formatMilestone('repost'),
  [NotificationType.MilestoneFavorite]: formatMilestone('favorite'),
  [NotificationType.MilestoneListen]: formatMilestone('listen'),
  [NotificationType.MilestoneFollow]: formatMilestone('follow'),
  [NotificationType.AddDigitalContentToContentList]: (notification, metadata) => {
    return formatAddDigitalContentToContentList(notification, metadata)
  }
}

const emailNotificationResponseMap = {
  ...notificationResponseMap,
  [NotificationType.Reaction]: formatReactionEmail,
  [NotificationType.TipReceive]: formatTipReceiveEmail,
  [NotificationType.SupporterRankUp]: formatSupporterRankUpEmail,
  [NotificationType.SupportingRankUp]: formatSupportingRankUpEmail
}

const NewFavoriteTitle = 'New Favorite'
const NewRepostTitle = 'New Repost'
const NewFollowerTitle = 'New Follower'
const NewMilestoneTitle = 'Congratulations! 🎉'
const NewSubscriptionUpdateTitle = 'New Author Update'

const TrendingDigitalContentTitle = 'Congrats - You’re Trending! 📈'
const RemixCreateTitle = 'New Remix Of Your DigitalContent ♻️'
const RemixCosignTitle = 'New DigitalContent Co-Sign! 🔥'
const AddDigitalContentToContentListTitle = 'Your digital_content got on a contentList! 💿'
const TipReceiveTitle = 'You Received a Tip!'

const challengeInfoMap = {
  'profile-completion': {
    title: '✅️ Complete your Profile',
    amount: 1
  },
  'listen-streak': {
    title: '🎧 Listening Streak: 7 Days',
    amount: 1
  },
  'digital-content-upload': {
    title: '🎶 Upload 5 DigitalContents',
    amount: 1
  },
  'referrals': {
    title: '📨 Invite your Friends',
    amount: 1
  },
  'referred': {
    title: '📨 Invite your Friends',
    amount: 1
  },
  'ref-v': {
    title: '📨 Invite your Residents',
    amount: 1
  },
  'connect-verified': {
    title: '✅️ Link Verified Accounts',
    amount: 5
  },
  'mobile-install': {
    title: '📲 Get the App',
    amount: 1
  }
}

const makeReactionTitle = (notification) => `${capitalize(notification.reactingUser.name)} reacted`
const makeSupportingOrSupporterTitle = (notification) => `#${notification.rank} Top Supporter`

const notificationResponseTitleMap = {
  [NotificationType.Follow]: () => NewFollowerTitle,
  [NotificationType.Favorite.digital_content]: () => NewFavoriteTitle,
  [NotificationType.Favorite.contentList]: () => NewFavoriteTitle,
  [NotificationType.Favorite.album]: () => NewFavoriteTitle,
  [NotificationType.Repost.digital_content]: () => NewRepostTitle,
  [NotificationType.Repost.contentList]: () => NewRepostTitle,
  [NotificationType.Repost.album]: () => NewRepostTitle,
  [NotificationType.Create.digital_content]: () => NewSubscriptionUpdateTitle,
  [NotificationType.Create.album]: () => NewSubscriptionUpdateTitle,
  [NotificationType.Create.contentList]: () => NewSubscriptionUpdateTitle,
  [NotificationType.MilestoneListen]: () => NewMilestoneTitle,
  [NotificationType.Milestone]: () => NewMilestoneTitle,
  [NotificationType.TrendingDigitalContent]: () => TrendingDigitalContentTitle,
  [NotificationType.RemixCreate]: () => RemixCreateTitle,
  [NotificationType.RemixCosign]: () => RemixCosignTitle,
  [NotificationType.ChallengeReward]: (notification) => challengeInfoMap[notification.challengeId].title,
  [NotificationType.AddDigitalContentToContentList]: () => AddDigitalContentToContentListTitle,
  [NotificationType.Reaction]: makeReactionTitle,
  [NotificationType.TipReceive]: () => TipReceiveTitle,
  [NotificationType.SupporterRankUp]: makeSupportingOrSupporterTitle,
  [NotificationType.SupportingRankUp]: makeSupportingOrSupporterTitle

}

function formatEmailNotificationProps (notifications, extras) {
  const emailNotificationProps = notifications.map(notification => {
    const mapNotification = emailNotificationResponseMap[notification.type]
    return mapNotification(notification, extras)
  })
  return emailNotificationProps
}

// TODO (DM) - unify this with the email messages
const pushNotificationMessagesMap = {
  [notificationTypes.Favorite.base] (notification) {
    const [user] = notification.users
    return `${user.name} favorited your ${notification.entity.type.toLowerCase()} ${notification.entity.name}`
  },
  [notificationTypes.Repost.base] (notification) {
    const [user] = notification.users
    return `${user.name} reposted your ${notification.entity.type.toLowerCase()} ${notification.entity.name}`
  },
  [notificationTypes.Follow] (notification) {
    const [user] = notification.users
    return `${user.name} followed you`
  },
  [notificationTypes.Announcement.base] (notification) {
    return notification.text
  },
  [notificationTypes.Milestone] (notification) {
    if (notification.entity) {
      const entity = notification.entity.type.toLowerCase()
      return `Your ${entity} ${notification.entity.name} has reached over ${notification.value.toLocaleString()} ${notification.achievement}s`
    } else {
      return `You have reached over ${notification.value.toLocaleString()} Followers `
    }
  },
  [notificationTypes.Create.base] (notification) {
    const [user] = notification.users
    const type = notification.entity.type.toLowerCase()
    if (notification.entity.type === actionEntityTypes.DigitalContent && !isNaN(notification.entity.count) && notification.entity.count > 1) {
      return `${user.name} released ${notification.entity.count} new ${type}s`
    }
    return `${user.name} released a new ${type} ${notification.entity.name}`
  },
  [notificationTypes.RemixCreate] (notification) {
    return `New remix of your digital_content ${notification.parentDigitalContent.title}: ${notification.remixUser.name} uploaded ${notification.remixDigitalContent.title}`
  },
  [notificationTypes.RemixCosign] (notification) {
    return `${notification.parentDigitalContentUser.name} Co-Signed your Remix of ${notification.remixDigitalContent.title}`
  },
  [notificationTypes.TrendingDigitalContent] (notification) {
    const rank = notification.rank
    const rankSuffix = getRankSuffix(rank)
    return `Your DigitalContent ${notification.entity.title} is ${notification.rank}${rankSuffix} on Trending Right Now! 🍾`
  },
  [notificationTypes.ChallengeReward] (notification) {
    return notification.challengeId === 'referred'
      ? `You’ve received ${challengeInfoMap[notification.challengeId].amount} $DGCO for being referred! Invite your friends to join to earn more!`
      : `You’ve earned ${challengeInfoMap[notification.challengeId].amount} $DGCO for completing this challenge!`
  },
  [notificationTypes.AddDigitalContentToContentList] (notification) {
    return `${notification.contentListOwner.name} added ${notification.digital_content.title} to their contentList ${notification.contentList.content_list_name}`
  },
  [notificationTypes.Reaction] (notification) {
    return `${capitalize(notification.reactingUser.name)} reacted to your tip of ${notification.amount} $DGCO`
  },
  [notificationTypes.SupporterRankUp] (notification) {
    return `${capitalize(notification.sendingUser.name)} became your #${notification.rank} Top Supporter!`
  },
  [notificationTypes.SupportingRankUp] (notification) {
    return `You're now ${notification.receivingUser.name}'s #${notification.rank} Top Supporter!`
  },
  [notificationTypes.TipReceive] (notification) {
    return `${capitalize(notification.sendingUser.name)} sent you a tip of ${notification.amount} $DGCO`
  }

}

module.exports = {
  challengeInfoMap,
  getRankSuffix,
  formatEmailNotificationProps,
  notificationResponseMap,
  notificationResponseTitleMap,
  pushNotificationMessagesMap
}
