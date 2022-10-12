'use strict'

module.exports = {
  up: async (queryInterface, Sequelize) => {
    // Scope of the migration is:
    // Remove digital_content_UUID from Files and replace it with digitalContentBlockchainId and migrate all existing values over
    // Remove digital_content_UUID field from DigitalContents table
    // Remove UNIQUE constraint for blockchainId, digital_content_UUID in DigitalContents table
    // Add NOT NULL constraint for blockchainId in DigitalContents table
    // Remove colivingUserUUID field from ColivingUsers table
    // Remove UNIQUE constraint for colivingUserUUID in ColivingUsers table (no unique constraint on blockchainId)
    // Add NOT NULL constraint for blockchainId in ColivingUsers table

    console.log('STARTING MIGRATION 20200911004845-allow-digital-content-and-colivingUsers-appends')
    await queryInterface.sequelize.query(`
      BEGIN;
      -- replace Files table in place with extra digitalContentBlockchainId column and drops the digital_content_UUID column
      CREATE TABLE "Files_new" ( like "Files" );
      ALTER TABLE "Files_new" ADD COLUMN "digitalContentBlockchainId" INTEGER;
      INSERT INTO "Files_new" ("multihash", "sourceFile", "storagePath", "createdAt", "updatedAt", "fileUUID", "cnodeUserUUID", "digital_content_UUID", "type", "fileName", "dirMultihash", "digitalContentBlockchainId") SELECT f."multihash", f."sourceFile", f."storagePath", f."createdAt", f."updatedAt", f."fileUUID", f."cnodeUserUUID", f."digital_content_UUID", f."type", f."fileName", f."dirMultihash", t."blockchainId" FROM "Files" f LEFT OUTER JOIN "DigitalContents" t ON f."digital_content_UUID" = t."digital_content_UUID";
      ALTER TABLE "Files_new" DROP COLUMN "digital_content_UUID";
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
      CREATE INDEX "Files_digital_contentBlockchainId_idx" ON public."Files" USING btree ("digitalContentBlockchainId");

      -- add in the foreign key constraint from Files to other tables
      -- No fkey from Files to DigitalContents because we don't have a unique constraint on digital_content_UUID or blockchainId on DigitalContents so postgres would reject the fkey
      ALTER TABLE "Files" ADD CONSTRAINT "Files_cnodeUserUUID_fkey" FOREIGN KEY ("cnodeUserUUID") REFERENCES "CNodeUsers" ("cnodeUserUUID") ON DELETE RESTRICT;

      -- remove the unique constraints from DigitalContents
      ALTER TABLE "DigitalContents" DROP CONSTRAINT "DigitalContents_digital_contentUUID_key";
      ALTER TABLE "DigitalContents" DROP CONSTRAINT "blockchainId_unique_idx";

      -- add a not null constraint to DigitalContents blockchainId, just run a delete query to remove any outstanding DigitalContents without a blockchainId in case there are any
      DELETE FROM "DigitalContents" WHERE "blockchainId" IS NULL;
      ALTER TABLE "DigitalContents" ALTER COLUMN "blockchainId" SET NOT NULL;

      -- remove the digital_content_UUID column from DigitalContents
      ALTER TABLE "DigitalContents" DROP COLUMN "digital_content_UUID";

      -- remove the unique constraint from ColivingUsers
      ALTER TABLE "ColivingUsers" DROP CONSTRAINT "ColivingUsers_colivingUserUUID_key";

      -- add a not null constraint to ColivingUsers blockchainId, just run a delete query to remove any outstanding ColivingUsers without a blockchainId in case there are any
      DELETE FROM "ColivingUsers" WHERE "blockchainId" IS NULL;
      ALTER TABLE "ColivingUsers" ALTER COLUMN "blockchainId" SET NOT NULL;

      -- remove the colivingUserUUID field as the ColivingUsers pkey
      ALTER TABLE "ColivingUsers" DROP CONSTRAINT "ColivingUsers_pkey";

      -- remove the colivingUserUUID column from ColivingUsers
      ALTER TABLE "ColivingUsers" DROP COLUMN "colivingUserUUID";

      COMMIT;
    `)
    console.log('FINISHED MIGRATION 20200911004845-allow-digital-content-and-colivingUsers-appends')
  },

  down: (queryInterface, Sequelize) => {
    /*
      The up migration destroys tons of information, if we need to revert the best option is to restore from a snapshot
    */
  }
}
