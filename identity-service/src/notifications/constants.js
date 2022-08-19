const notificationTypes = Object.freeze({
  Follow: 'Follow',
  Repost: {
    base: 'Repost',
    agreement: 'RepostAgreement',
    album: 'RepostAlbum',
    playlist: 'RepostPlaylist'
  },
  Favorite: {
    base: 'Favorite',
    agreement: 'FavoriteAgreement',
    album: 'FavoriteAlbum',
    playlist: 'FavoritePlaylist'
  },
  Create: {
    base: 'Create',
    agreement: 'CreateAgreement',
    album: 'CreateAlbum',
    playlist: 'CreatePlaylist'
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
  PlaylistUpdate: 'PlaylistUpdate',
  Tip: 'Tip',
  TipReceive: 'TipReceive',
  TipSend: 'TipSend',
  Reaction: 'Reaction',
  SupporterRankUp: 'SupporterRankUp',
  SupportingRankUp: 'SupportingRankUp',
  AddAgreementToPlaylist: 'AddAgreementToPlaylist'
})

const actionEntityTypes = Object.freeze({
  User: 'User',
  Agreement: 'Agreement',
  Album: 'Album',
  Playlist: 'Playlist'
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
