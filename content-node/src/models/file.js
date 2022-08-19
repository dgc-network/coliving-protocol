'use strict'

module.exports = (sequelize, DataTypes) => {
  const File = sequelize.define(
    'File',
    {
      fileUUID: {
        type: DataTypes.UUID,
        allowNull: false,
        primaryKey: true,
        defaultValue: DataTypes.UUIDV4
      },
      cnodeUserUUID: {
        type: DataTypes.UUID,
        allowNull: false
      },
      // only non-null for agreement/copy320 files (as opposed to image/metadata files)
      agreementBlockchainId: {
        type: DataTypes.INTEGER,
        allowNull: true
      },
      multihash: {
        type: DataTypes.TEXT,
        allowNull: false
      },
      // only non-null for agreement files (as opposed to image/metadata files)
      // contains original agreement file name (meaning all agreement segment Files will contain same agreement sourceFile)
      sourceFile: {
        type: DataTypes.TEXT,
        allowNull: true
      },
      // the queryable filename if this file entry is inside a dir
      // used for images that are stored in CID directories (e.g. /CID/fileName.jpg)
      fileName: {
        type: DataTypes.TEXT,
        allowNull: true
      },
      // the parent dir's CID if this file entry is inside a dir
      dirMultihash: {
        type: DataTypes.TEXT,
        allowNull: true
      },
      storagePath: {
        // format: '/file_storage/__multihash__
        type: DataTypes.TEXT,
        allowNull: false
      },
      type: {
        type: DataTypes.STRING(16),
        allowNull: true,
        validate: {
          // agreement and non types broken down below and attached to Agreement model
          isIn: [['agreement', 'metadata', 'image', 'dir', 'copy320']]
        }
      },
      clock: {
        type: DataTypes.INTEGER,
        allowNull: false
      },
      skipped: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: false
      }
    },
    {
      indexes: [
        {
          fields: ['cnodeUserUUID']
        },
        {
          fields: ['multihash']
        },
        {
          fields: ['dirMultihash']
        },
        {
          fields: ['agreementBlockchainId']
        },
        {
          unique: true,
          fields: ['cnodeUserUUID', 'clock']
        },
        {
          fields: ['skipped']
        }
      ]
    }
  )

  /**
   * @dev - there is intentionally no reference from File.agreementBlockchainId to Agreement.blockchainId. This is to
   *    remove the two-way association between these models
   */
  File.associate = function (models) {
    File.belongsTo(models.CNodeUser, {
      foreignKey: 'cnodeUserUUID',
      sourceKey: 'cnodeUserUUID',
      onDelete: 'RESTRICT'
    })
    // File also has a composite foreign key on ClockRecords (cnodeUserUUID, clock)
    // sequelize does not support composite foreign keys
  }

  File.Types = {
    agreement: 'agreement',
    copy320: 'copy320',
    dir: 'dir',
    image: 'image',
    metadata: 'metadata'
  }

  File.AgreementTypes = [File.Types.agreement, File.Types.copy320]
  File.NonAgreementTypes = [File.Types.dir, File.Types.image, File.Types.metadata]

  return File
}
