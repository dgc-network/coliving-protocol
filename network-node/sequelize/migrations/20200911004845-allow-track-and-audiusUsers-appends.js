'use strict'

module.exports = {
  up: async (queryInterface, Sequelize) => {
    // Scope of the migration is:
    // Remove trackUUID from Files and replace it with trackBlockchainId and migrate all existing values over
    // Remove trackUUID field from Tracks table
    // Remove UNIQUE constraint for blockchainId, trackUUID in Tracks table
    // Add NOT NULL constraint for blockchainId in Tracks table
    // Remove audiusUserUUID field from AudiusUsers table
    // Remove UNIQUE constraint for audiusUserUUID in AudiusUsers table (no unique constraint on blockchainId)
    // Add NOT NULL constraint for blockchainId in AudiusUsers table

    console.log('STARTING MIGRATION 20200911004845-allow-track-and-audiusUsers-appends')
    await queryInterface.sequelize.query(`
      BEGIN;
      -- replace Files table in place with extra trackBlockchainId column and drops the trackUUID column
      CREATE TABLE "Files_new" ( like "Files" );
      ALTER TABLE "Files_new" ADD COLUMN "trackBlockchainId" INTEGER;
      INSERT INTO "Files_new" ("multihash", "sourceFile", "storagePath", "createdAt", "updatedAt", "fileUUID", "cnodeUserUUID", "trackUUID", "type", "fileName", "dirMultihash", "trackBlockchainId") SELECT f."multihash", f."sourceFile", f."storagePath", f."createdAt", f."updatedAt", f."fileUUID", f."cnodeUserUUID", f."trackUUID", f."type", f."fileName", f."dirMultihash", t."blockchainId" FROM "Files" f LEFT OUTER JOIN "Tracks" t ON f."trackUUID" = t."trackUUID";
      ALTER TABLE "Files_new" DROP COLUMN "trackUUID";
      ALTER TABLE "Files" RENAME TO "Files_old";
      ALTER TABLE "Files_new" RENAME TO "Files";
      DROP TABLE "Files_old" CASCADE;

      -- add pkey
      -- ALTER TABLE "Files" ADD CONSTRAINT "Files_fileUUID_key" UNIQUE ("fileUUID");
      ALTER TABLE "Files" ADD PRIMARY KEY ("fileUUID");

      -- add back indexes
      CREATE INDEX "Files_multihash_idx" ON public."Files" USING btree (multihash);
      CREATE INDEX "Files_cnodeUserUUID_idx" ON public."Files" USING btree ("cnodeUserUUID");
      CREATE INDEX "Files_dir_multihash_idx" ON public."Files" USING btree ("dirMultihash");
      CREATE INDEX "Files_trackBlockchainId_idx" ON public."Files" USING btree ("trackBlockchainId");

      -- add in the foreign key constraint from Files to other tables
      -- No fkey from Files to Tracks because we don't have a unique constraint on trackUUID or blockchainId on Tracks so postgres would reject the fkey
      ALTER TABLE "Files" ADD CONSTRAINT "Files_cnodeUserUUID_fkey" FOREIGN KEY ("cnodeUserUUID") REFERENCES "CNodeUsers" ("cnodeUserUUID") ON DELETE RESTRICT;

      -- remove the unique constraints from Tracks
      ALTER TABLE "Tracks" DROP CONSTRAINT "Tracks_trackUUID_key";
      ALTER TABLE "Tracks" DROP CONSTRAINT "blockchainId_unique_idx";

      -- add a not null constraint to Tracks blockchainId, just run a delete query to remove any outstanding Tracks without a blockchainId in case there are any
      DELETE FROM "Tracks" WHERE "blockchainId" IS NULL;
      ALTER TABLE "Tracks" ALTER COLUMN "blockchainId" SET NOT NULL;

      -- remove the trackUUID column from Tracks
      ALTER TABLE "Tracks" DROP COLUMN "trackUUID";

      -- remove the unique constraint from AudiusUsers
      ALTER TABLE "AudiusUsers" DROP CONSTRAINT "AudiusUsers_audiusUserUUID_key";

      -- add a not null constraint to AudiusUsers blockchainId, just run a delete query to remove any outstanding AudiusUsers without a blockchainId in case there are any
      DELETE FROM "AudiusUsers" WHERE "blockchainId" IS NULL;
      ALTER TABLE "AudiusUsers" ALTER COLUMN "blockchainId" SET NOT NULL;

      -- remove the audiusUserUUID field as the AudiusUsers pkey
      ALTER TABLE "AudiusUsers" DROP CONSTRAINT "AudiusUsers_pkey";

      -- remove the audiusUserUUID column from AudiusUsers
      ALTER TABLE "AudiusUsers" DROP COLUMN "audiusUserUUID";

      COMMIT;
    `)
    console.log('FINISHED MIGRATION 20200911004845-allow-track-and-audiusUsers-appends')
  },

  down: (queryInterface, Sequelize) => {
    /*
      The up migration destroys tons of information, if we need to revert the best option is to restore from a snapshot
    */
  }
}
