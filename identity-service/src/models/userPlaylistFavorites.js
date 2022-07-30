'use strict'
module.exports = (sequelize, DataTypes) => {
  /**
   * An association between users and their (ordered) favorite playlists
   * Favorites accepts any Array of type String so that playlists with
   * natural blockchain ids can be stored alongside autogenerated playlists.
   */
  const UserPlaylistFavorites = sequelize.define('UserPlaylistFavorites', {
    userId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      primaryKey: true
    },
    favorites: {
      type: DataTypes.ARRAY(DataTypes.STRING),
      allowNull: false
    },
    createdAt: {
      allowNull: false,
      type: DataTypes.DATE
    },
    updatedAt: {
      allowNull: false,
      type: DataTypes.DATE
    }
  }, {})
  return UserPlaylistFavorites
}
