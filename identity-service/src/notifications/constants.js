const notificationTypes = Object.freeze({
  Follow: 'Follow',
  Repost: {
    base: 'Repost',
    digital_content: 'RepostDigitalContent',
    album: 'RepostAlbum',
    contentList: 'RepostContentList'
  },
  Favorite: {
    base: 'Favorite',
    digital_content: 'FavoriteDigitalContent',
    album: 'FavoriteAlbum',
    contentList: 'FavoriteContentList'
  },
  Create: {
    base: 'Create',
    digital_content: 'CreateDigitalContent',
    album: 'CreateAlbum',
    contentList: 'CreateContentList'
  },
  RemixCreate: 'RemixCreate',
  RemixCosign: 'RemixCosign',
  Milestone: 'Milestone',
  MilestoneFollow: 'MilestoneFollow',
  MilestoneRepost: 'MilestoneRepost',
  MilestoneFavorite: 'MilestoneFavorite',
  MilestoneListen: 'MilestoneListen',
  Announcement: 'Announcement',
  UserSubscription: 'UserSubscription',
  TrendingDigitalContent: 'TrendingDigitalContent',
  ChallengeReward: 'ChallengeReward',
  TierChange: 'TierChange',
  ContentListUpdate: 'ContentListUpdate',
  Tip: 'Tip',
  TipReceive: 'TipReceive',
  TipSend: 'TipSend',
  Reaction: 'Reaction',
  SupporterRankUp: 'SupporterRankUp',
  SupportingRankUp: 'SupportingRankUp',
  AddDigitalContentToContentList: 'AddDigitalContentToContentList'
})

const actionEntityTypes = Object.freeze({
  User: 'User',
  DigitalContent: 'DigitalContent',
  Album: 'Album',
  ContentList: 'ContentList'
})

const dayInHours = 24
const weekInHours = 168
const notificationJobType = 'notificationProcessJob'
const solanaNotificationJobType = 'solanaNotificationProcessJob'
const announcementJobType = 'pushAnnouncementsJob'
const unreadEmailJobType = 'unreadEmailJob'
const downloadEmailJobType = 'downloadEmailJobType'

const deviceType = Object.freeze({
  Mobile: 'mobile',
  Browser: 'browser'
})

module.exports = {
  notificationTypes,
  actionEntityTypes,
  dayInHours,
  weekInHours,
  notificationJobType,
  solanaNotificationJobType,
  announcementJobType,
  unreadEmailJobType,
  downloadEmailJobType,
  deviceType
}
