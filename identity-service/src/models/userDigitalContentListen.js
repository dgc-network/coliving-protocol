'use strict'
module.exports = (sequelize, DataTypes) => {
  const UserDigitalContentListen = sequelize.define('UserDigitalContentListen', {
    id: {
      allowNull: false,
      autoIncrement: true,
      primaryKey: true,
      type: DataTypes.INTEGER
    },
    userId: {
      type: DataTypes.INTEGER,
      allowNull: false
    },
    digitalContentId: {
      type: DataTypes.INTEGER,
      allowNull: false
    },
    count: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 1
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
  return UserDigitalContentListen
}
