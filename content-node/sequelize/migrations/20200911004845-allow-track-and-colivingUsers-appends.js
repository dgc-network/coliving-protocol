'use strict'

module.exports = {
  up: async (queryInterface, Sequelize) => {
    // Scope of the migration is:
    // Remove agreementUUID from Files and replace it with agreementBlockchainId and migrate all existing values over
    // Remove agreementUUID field from Agreements table
    // Remove UNIQUE constraint for blockchainId, agreementUUID in Agreements table
    // Add NOT NULL constraint for blockchainId in Agreements table
    // Remove colivingUserUUID field from ColivingUsers table
    // Remove UNIQUE constraint for colivingUserUUID in ColivingUsers table (no unique constraint on blockchainId)
    // Add NOT NULL constraint for blockchainId in ColivingUsers table

    console.log('STARTING MIGRATION 20200911004845-allow-agreement-and-colivingUsers-appends')
    await queryInterface.sequelize.query(`
      BEGIN;
      -- replace Files table in place with extra agreementBlockchainId column and drops the agreementUUID column
      CREATE TABLE "Files_new" ( like "Files" );
      ALTER TABLE "Files_new" ADD COLUMN "agreementBlockchainId" INTEGER;
      INSERT INTO "Files_new" ("multihash", "sourceFile", "storagePath", "createdAt", "updatedAt", "fileUUID", "cnodeUserUUID", "agreementUUID", "type", "fileName", "dirMultihash", "agreementBlockchainId") SELECT f."multihash", f."sourceFile", f."storagePath", f."createdAt", f."updatedAt", f."fileUUID", f."cnodeUserUUID", f."agreementUUID", f."type", f."fileName", f."dirMultihash", t."blockchainId" FROM "Files" f LEFT OUTER JOIN "Agreements" t ON f."agreementUUID" = t."agreementUUID";
      ALTER TABLE "Files_new" DROP COLUMN "agreementUUID";
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
      CREATE INDEX "Files_agreementBlockchainId_idx" ON public."Files" USING btree ("agreementBlockchainId");

      -- add in the foreign key constraint from Files to other tables
      -- No fkey from Files to Agreements because we don't have a unique constraint on agreementUUID or blockchainId on Agreements so postgres would reject the fkey
      ALTER TABLE "Files" ADD CONSTRAINT "Files_cnodeUserUUID_fkey" FOREIGN KEY ("cnodeUserUUID") REFERENCES "CNodeUsers" ("cnodeUserUUID") ON DELETE RESTRICT;

      -- remove the unique constraints from Agreements
      ALTER TABLE "Agreements" DROP CONSTRAINT "Agreements_agreementUUID_key";
      ALTER TABLE "Agreements" DROP CONSTRAINT "blockchainId_unique_idx";

      -- add a not null constraint to Agreements blockchainId, just run a delete query to remove any outstanding Agreements without a blockchainId in case there are any
      DELETE FROM "Agreements" WHERE "blockchainId" IS NULL;
      ALTER TABLE "Agreements" ALTER COLUMN "blockchainId" SET NOT NULL;

      -- remove the agreementUUID column from Agreements
      ALTER TABLE "Agreements" DROP COLUMN "agreementUUID";

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
    console.log('FINISHED MIGRATION 20200911004845-allow-agreement-and-colivingUsers-appends')
  },

  down: (queryInterface, Sequelize) => {
    /*
      The up migration destroys tons of information, if we need to revert the best option is to restore from a snapshot
    */
  }
}
