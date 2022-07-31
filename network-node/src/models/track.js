'use strict'

module.exports = (sequelize, DataTypes) => {
  const Track = sequelize.define(
    'Track',
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

  Track.associate = function (models) {
    Track.belongsTo(models.CNodeUser, {
      foreignKey: 'cnodeUserUUID',
      targetKey: 'cnodeUserUUID',
      onDelete: 'RESTRICT'
    })
    Track.belongsTo(models.File, {
      foreignKey: 'metadataFileUUID',
      targetKey: 'fileUUID',
      onDelete: 'RESTRICT'
    })
    Track.belongsTo(models.File, {
      foreignKey: 'coverArtFileUUID',
      targetKey: 'fileUUID',
      onDelete: 'RESTRICT'
    })
    // Track also has a composite foreign key on ClockRecords (cnodeUserUUID, clock)
    // sequelize does not support composite foreign keys
  }

  return Track
}
