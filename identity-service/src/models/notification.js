'use strict'
module.exports = (sequelize, DataTypes) => {
  const Notification = sequelize.define('Notification', {
    id: {
      type: DataTypes.UUID,
      allowNull: false,
      primaryKey: true,
      defaultValue: DataTypes.UUIDV4
    },
    type: {
      type: DataTypes.ENUM({
        values: [
          'Follow',
          'RepostAgreement',
          'RepostContentList',
          'RepostAlbum',
          'FavoriteAgreement',
          'FavoriteContentList',
          'FavoriteAlbum',
          'CreateAgreement',
          'CreateContentList',
          'CreateAlbum',
          'Announcement',
          'MilestoneListen',
          'MilestoneRepost',
          'MilestoneFavorite',
          'MilestoneFollow',
          'RemixCreate',
          'RemixCosign',
          'TrendingAgreement',
          'ChallengeReward',
          'AddAgreementToContentList'
        ]
      }),
      allowNull: false
    },
    isRead: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false
    },
    isHidden: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false
    },
    isViewed: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false
    },
    userId: {
      type: DataTypes.INTEGER,
      allowNull: false
    },
    entityId: {
      // Can be agreement/album/content list/user id
      type: DataTypes.INTEGER,
      allowNull: true
    },
    blocknumber: {
      type: DataTypes.INTEGER,
      allowNull: false
    },
    timestamp: {
      type: DataTypes.DATE,
      allowNull: false
    },
    metadata: {
      type: DataTypes.JSONB,
      allowNull: true
    }
  }, {})

  Notification.associate = function (models) {
    Notification.hasMany(models.NotificationAction, {
      sourceKey: 'id',
      foreignKey: 'notificationId',
      as: 'actions'
    })
  }

  return Notification
}
