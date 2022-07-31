'use strict'

/**
 * 20200922131913-post_vector_clock_db_migrations
 *
 * SCOPE
 * - delete all data where clock is still null + update remaining to 0
 * - enforce clock non-null constraints
 * - add back in foreign key constraints from ColivingUsers and Tracks to Files
 * - Add composite primary keys on (cnodeUserUUID,clock) to Tracks and ColivingUsers tables
 */

module.exports = {
  up: async (queryInterface, Sequelize) => {
    const transaction = await queryInterface.sequelize.transaction()
    console.log('STARTING MIGRATION 20200922131913-post_vector_clock_db_migrations')

    // delete all data from DataTables where clock is still null + update remaining cnodeUsers clocks to 0
    await queryInterface.sequelize.query(`
      DELETE FROM "ColivingUsers" WHERE "clock" IS NULL;
      DELETE FROM "Tracks" WHERE "clock" IS NULL;
      DELETE FROM "Files" WHERE "clock" IS NULL;
      UPDATE "CNodeUsers" SET "clock" = 0 WHERE "clock" IS NULL;
    `, { transaction })

    await enforceClockNonNullConstraints(queryInterface, Sequelize, transaction)

    // add back in foreign key constraints from ColivingUsers and Tracks to Files
    // there are some records that are orphaned as a result of the 25000 limit, so we need to delete those records from the Tracks table
    await queryInterface.sequelize.query(`
      ALTER TABLE "ColivingUsers" ADD CONSTRAINT "ColivingUsers_coverArtFileUUID_fkey" FOREIGN KEY ("coverArtFileUUID") REFERENCES "Files" ("fileUUID") ON DELETE RESTRICT;
      ALTER TABLE "ColivingUsers" ADD CONSTRAINT "ColivingUsers_metadataFileUUID_fkey" FOREIGN KEY ("metadataFileUUID") REFERENCES "Files" ("fileUUID") ON DELETE RESTRICT;
      ALTER TABLE "ColivingUsers" ADD CONSTRAINT "ColivingUsers_profilePicFileUUID_fkey" FOREIGN KEY ("profilePicFileUUID") REFERENCES "Files" ("fileUUID") ON DELETE RESTRICT;
      DELETE FROM "Tracks" WHERE "metadataFileUUID" IN (SELECT "metadataFileUUID" FROM "Tracks" t LEFT OUTER JOIN "Files" f ON t."metadataFileUUID" = f."fileUUID" WHERE f."fileUUID" IS NULL AND t."metadataFileUUID" IS NOT NULL);
      DELETE FROM "Tracks" WHERE "coverArtFileUUID" IN (SELECT "coverArtFileUUID" FROM "Tracks" t LEFT OUTER JOIN "Files" f ON t."coverArtFileUUID" = f."fileUUID" WHERE f."fileUUID" IS NULL AND t."coverArtFileUUID" IS NOT NULL);
      ALTER TABLE "Tracks" ADD CONSTRAINT "Tracks_coverArtFileUUID_fkey " FOREIGN KEY ("coverArtFileUUID") REFERENCES "Files" ("fileUUID") ON DELETE RESTRICT;
      ALTER TABLE "Tracks" ADD CONSTRAINT "Tracks_metadataFileUUID_fkey" FOREIGN KEY ("metadataFileUUID") REFERENCES "Files" ("fileUUID") ON DELETE RESTRICT;
    `, { transaction })

    // Add composite primary keys on (cnodeUserUUID,clock) to Tracks and ColivingUsers tables
    // - (Files already has PK on fileUUID and cnodeUsers already has PK on cnodeUserUUID)
    await addCompositePrimaryKeysToColivingUsersAndTracks(queryInterface, Sequelize, transaction)

    // Add foreign key constraints from Tracks, ColivingUsers and Files to ClockRecords.
    // This ensures a data record can never be created without a corresponding ClockRecord.
    await queryInterface.sequelize.query(`
      ALTER TABLE "Files" ADD CONSTRAINT "Files_cnodeUserUUID_clock_fkey" FOREIGN KEY ("cnodeUserUUID", "clock") REFERENCES "ClockRecords" ("cnodeUserUUID", "clock") ON DELETE RESTRICT;
      ALTER TABLE "ColivingUsers" ADD CONSTRAINT "ColivingUsers_cnodeUserUUID_clock_fkey" FOREIGN KEY ("cnodeUserUUID", "clock") REFERENCES "ClockRecords" ("cnodeUserUUID", "clock") ON DELETE RESTRICT;
      ALTER TABLE "Tracks" ADD CONSTRAINT "Tracks_cnodeUserUUID_clock_fkey" FOREIGN KEY ("cnodeUserUUID", "clock") REFERENCES "ClockRecords" ("cnodeUserUUID", "clock") ON DELETE RESTRICT;
    `, { transaction })

    await transaction.commit()
    console.log('FINISHED MIGRATION 20200922131913-post_vector_clock_db_migrations')
  },

  /** TODO */
  down: async (queryInterface, Sequelize) => {
    // this is a breaking migration, restoring a previous db dump is the best option to revert
  }
}

async function enforceClockNonNullConstraints (queryInterface, Sequelize, transaction) {
  await queryInterface.changeColumn('CNodeUsers', 'clock', {
    type: Sequelize.INTEGER,
    allowNull: false
  }, { transaction })
  await queryInterface.changeColumn('ColivingUsers', 'clock', {
    type: Sequelize.INTEGER,
    allowNull: false
  }, { transaction })
  await queryInterface.changeColumn('Tracks', 'clock', {
    type: Sequelize.INTEGER,
    allowNull: false
  }, { transaction })
  await queryInterface.changeColumn('Files', 'clock', {
    type: Sequelize.INTEGER,
    allowNull: false
  }, { transaction })
}

async function addCompositePrimaryKeysToColivingUsersAndTracks (queryInterface, Sequelize, transaction) {
  await queryInterface.addConstraint(
    'ColivingUsers',
    {
      type: 'PRIMARY KEY',
      fields: ['cnodeUserUUID', 'clock'],
      name: 'ColivingUsers_primary_key_(cnodeUserUUID,clock)',
      transaction
    }
  )
  await queryInterface.addConstraint(
    'Tracks',
    {
      type: 'PRIMARY KEY',
      fields: ['cnodeUserUUID', 'clock'],
      name: 'Tracks_primary_key_(cnodeUserUUID,clock)',
      transaction
    }
  )
}
