'use strict'

module.exports = (sequelize, DataTypes) => {
  const types = Object.freeze({
    user: 'USER',
    digital_content: 'AGREEMENT',
    cid: 'CID'
  })

  const ContentBlacklist = sequelize.define('ContentBlacklist', {
    id: {
      allowNull: false,
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true
    },
    type: {
      allowNull: false,
      type: DataTypes.ENUM(types.user, types.digital_content, types.cid)
    },
    value: {
      allowNull: false,
      type: DataTypes.STRING
    },
    createdAt: {
      allowNull: false,
      type: DataTypes.DATE
    },
    updatedAt: {
      allowNull: false,
      type: DataTypes.DATE
    }
  })

  ContentBlacklist.Types = types
  return ContentBlacklist
}
