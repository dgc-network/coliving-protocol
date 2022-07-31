'use strict'
module.exports = (sequelize, DataTypes) => {
  const ColivingUser = sequelize.define(
    'ColivingUser',
    {
      cnodeUserUUID: {
        type: DataTypes.UUID,
        primaryKey: true, // composite primary key (cnodeUserUUID, clock)
        allowNull: false
      },
      clock: {
        type: DataTypes.INTEGER,
        primaryKey: true, // composite primary key (cnodeUserUUID, clock)
        allowNull: false
      },
      blockchainId: {
        type: DataTypes.BIGINT,
        allowNull: false
      },
      metadataFileUUID: {
        type: DataTypes.UUID,
        allowNull: false
      },
      metadataJSON: {
        type: DataTypes.JSONB,
        allowNull: false
      },
      coverArtFileUUID: {
        type: DataTypes.UUID,
        allowNull: true
      },
      profilePicFileUUID: {
        type: DataTypes.UUID,
        allowNull: true
      }
    },
    {
      indexes: [
        {
          unique: true,
          fields: ['blockchainId', 'clock']
        }
      ]
    }
  )
  ColivingUser.associate = function (models) {
    ColivingUser.belongsTo(models.CNodeUser, {
      foreignKey: 'cnodeUserUUID',
      sourceKey: 'cnodeUserUUID',
      onDelete: 'RESTRICT'
    })
    ColivingUser.belongsTo(models.File, {
      foreignKey: 'metadataFileUUID',
      sourceKey: 'fileUUID',
      onDelete: 'RESTRICT'
    })
    ColivingUser.belongsTo(models.File, {
      foreignKey: 'coverArtFileUUID',
      sourceKey: 'fileUUID',
      onDelete: 'RESTRICT'
    })
    ColivingUser.belongsTo(models.File, {
      foreignKey: 'profilePicFileUUID',
      sourceKey: 'fileUUID',
      onDelete: 'RESTRICT'
    })
    // ColivingUser also has a composite foreign key on ClockRecords (cnodeUserUUID, clock)
    // sequelize does not support composite foreign keys
  }
  return ColivingUser
}
