const notificationTypes = Object.freeze({
  Follow: 'Follow',
  Repost: {
    base: 'Repost',
    agreement: 'RepostAgreement',
    album: 'RepostAlbum',
    contentList: 'RepostContentList'
  },
  Favorite: {
    base: 'Favorite',
    agreement: 'FavoriteAgreement',
    album: 'FavoriteAlbum',
    contentList: 'FavoriteContentList'
  },
  Create: {
    base: 'Create',
    agreement: 'CreateAgreement',
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
  TrendingAgreement: 'TrendingAgreement',
  ChallengeReward: 'ChallengeReward',
  TierChange: 'TierChange',
  ContentListUpdate: 'ContentListUpdate',
  Tip: 'Tip',
  TipReceive: 'TipReceive',
  TipSend: 'TipSend',
  Reaction: 'Reaction',
  SupporterRankUp: 'SupporterRankUp',
  SupportingRankUp: 'SupportingRankUp',
  AddAgreementToContentList: 'AddAgreementToContentList'
})

const actionEntityTypes = Object.freeze({
  User: 'User',
  Agreement: 'Agreement',
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
