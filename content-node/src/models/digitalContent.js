'use strict'

module.exports = (sequelize, DataTypes) => {
  const DigitalContent = sequelize.define(
    'DigitalContent',
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

  DigitalContent.associate = function (models) {
    DigitalContent.belongsTo(models.CNodeUser, {
      foreignKey: 'cnodeUserUUID',
      targetKey: 'cnodeUserUUID',
      onDelete: 'RESTRICT'
    })
    DigitalContent.belongsTo(models.File, {
      foreignKey: 'metadataFileUUID',
      targetKey: 'fileUUID',
      onDelete: 'RESTRICT'
    })
    DigitalContent.belongsTo(models.File, {
      foreignKey: 'coverArtFileUUID',
      targetKey: 'fileUUID',
      onDelete: 'RESTRICT'
    })
    // DigitalContent also has a composite foreign key on ClockRecords (cnodeUserUUID, clock)
    // sequelize does not support composite foreign keys
  }

  return DigitalContent
}
