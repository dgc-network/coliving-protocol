'use strict'
module.exports = (sequelize, DataTypes) => {
  const DigitalContentListenCount = sequelize.define('DigitalContentListenCount', {
    digitalContentId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      autoIncrement: false,
      primaryKey: true
    },
    listens: {
      type: DataTypes.INTEGER,
      defaultValue: 0
    },
    hour: {
      type: DataTypes.DATE,
      allowNull: false,
      primaryKey: true
    }
  }, {})
  DigitalContentListenCount.associate = function (models) {
    // associations can be defined here
  }
  return DigitalContentListenCount
}
