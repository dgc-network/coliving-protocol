'use strict'

/**
 * New table - ContentList
 * New enum value for clock records sourceTable, ContentList
 * CNodeUsers Table considered a Reference Table only
 */

const tableName = 'ContentLists'

module.exports = {
  up: async (queryInterface, Sequelize) => {
    const transaction = await queryInterface.sequelize.transaction()

    // Create ContentList table
    await createContentListTable(queryInterface, Sequelize, transaction)
    await addContentListToClockRecordSourceTables(queryInterface, transaction)

    // Add composite unique constraint on (blockchainId, clock) to ContentList
    await addCompositeUniqueConstraints(queryInterface, transaction)

    await transaction.commit()
  },

  /*
    In the down migration we remove compose unique constraint and contentList table but do not remove the altered enum.
    This is in the case that there are existing values in the ClockRecords table pointing to the contentList enum that would have to be either
    modified (removes context) or dropped (adds gaps to ClockRecord history)
  */
  down: async (queryInterface) => {
    const transaction = await queryInterface.sequelize.transaction()
    await removeCompositeUniqueConstraints(queryInterface, transaction)
    await dropContentListTable(queryInterface, transaction)
    await transaction.commit()
  }
}

/*
Unorthodox approach to modify enum in a transaction - reference notes here on why this is necessary https://www.postgresql.org/docs/11/sql-altertype.html.
It is not possible to use the ALTER TYPE on enum type within a transaction in postgres 11.1 (current version).

The name of the enum type (generated in sequelize) was determined with the following query:

coliving_content_node=# SELECT pg_type.typname AS enum_type, pg_enum.enumlabel AS enum_label FROM pg_type JOIN pg_enum ON pg_enum.enumtypid = pg_type.oid;
           enum_type           | enum_label
-------------------------------+------------
 enum_ContentBlacklists_type   | DIGITAL_CONTENT
 enum_ContentBlacklists_type   | USER
 enum_ContentBlacklists_type   | CID
 enum_ClockRecords_sourceTable | ColivingUser
 enum_ClockRecords_sourceTable | DigitalContent
 enum_ClockRecords_sourceTable | File
 enum_ClockRecords_sourceTable | ContentList
(7 rows)
*/
async function addContentListToClockRecordSourceTables(
  queryInterface,
  transaction
) {
  await queryInterface.sequelize.query(
    `
  ALTER TYPE "enum_ClockRecords_sourceTable" RENAME TO "enum_ClockRecords_sourceTable_old";
  CREATE TYPE "enum_ClockRecords_sourceTable" AS ENUM('ColivingUser', 'DigitalContent', 'File', 'ContentList');
  ALTER TABLE "ClockRecords" ALTER COLUMN "sourceTable" TYPE "enum_ClockRecords_sourceTable" USING "sourceTable"::text::"enum_ClockRecords_sourceTable";
  DROP TYPE "enum_ClockRecords_sourceTable_old";
  `,
    { transaction }
  )
}

async function addCompositeUniqueConstraints(queryInterface, transaction) {
  await queryInterface.addConstraint(tableName, {
    type: 'UNIQUE',
    fields: ['blockchainId', 'clock'],
    name: 'ContentList_unique_(blockchainId,clock)',
    transaction
  })
}

async function removeCompositeUniqueConstraints(queryInterface, transaction) {
  await queryInterface.removeConstraint(
    tableName,
    'ContentList_unique_(blockchainId,clock)',
    { transaction }
  )
}

async function createContentListTable(queryInterface, Sequelize, transaction) {
  await queryInterface.createTable(
    tableName,
    {
      cnodeUserUUID: {
        type: Sequelize.UUID,
        primaryKey: true, // composite primary key (cnodeUserUUID, clock)
        unique: false,
        allowNull: false,
        references: {
          model: 'CNodeUsers',
          key: 'cnodeUserUUID',
          as: 'cnodeUserUUID'
        },
        onDelete: 'RESTRICT'
      },
      clock: {
        type: Sequelize.INTEGER,
        primaryKey: true, // composite primary key (cnodeUserUUID, clock)
        unique: 'compositeIndex',
        allowNull: false
      },
      metadataFileUUID: {
        type: Sequelize.UUID,
        allowNull: false,
        onDelete: 'RESTRICT',
        references: {
          model: 'Files',
          key: 'fileUUID',
          as: 'metadataFileUUID'
        }
      },
      metadataJSON: {
        type: Sequelize.JSONB,
        allowNull: false
      },
      blockchainId: {
        type: Sequelize.BIGINT,
        allowNull: false,
        primaryKey: false,
        unique: 'compositeIndex',
        onDelete: 'RESTRICT'
      },
      contentListImageFileUUID: {
        type: Sequelize.UUID,
        allowNull: true,
        onDelete: 'RESTRICT',
        references: {
          model: 'Files',
          key: 'fileUUID',
          as: 'contentListImageFileUUID'
        }
      },
      createdAt: {
        allowNull: false,
        type: Sequelize.DATE
      },
      updatedAt: {
        allowNull: false,
        type: Sequelize.DATE
      }
    },
    {
      transaction
    }
  )
}

async function dropContentListTable(queryInterface, transaction) {
  await queryInterface.dropTable(tableName, {
    transaction
  })
}
