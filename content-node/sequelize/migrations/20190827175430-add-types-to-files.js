'use strict'
module.exports = {
  up: async (queryInterface, Sequelize) => {
    const t = await queryInterface.sequelize.transaction()
    try {
      const userMetadataFileUUIDSet = new Set(
        ((await queryInterface.sequelize.query(`SELECT "metadataFileUUID" FROM "ColivingUsers" WHERE "metadataFileUUID" IS NOT NULL;`, { transaction: t }))[0]).map(obj => obj.metadataFileUUID)
      )
      const userCoverArtFileUUIDSet = new Set(
        ((await queryInterface.sequelize.query(`SELECT "coverArtFileUUID" FROM "ColivingUsers" WHERE "coverArtFileUUID" IS NOT NULL;`, { transaction: t }))[0]).map(obj => obj.coverArtFileUUID)
      )
      const userProfilePicFileUUIDSet = new Set(
        ((await queryInterface.sequelize.query(`SELECT "profilePicFileUUID" FROM "ColivingUsers" WHERE "profilePicFileUUID" IS NOT NULL;`, { transaction: t }))[0]).map(obj => obj.profilePicFileUUID)
      )
      const digitalContentMetadataFileUUIDSet = new Set(
        ((await queryInterface.sequelize.query(`SELECT "metadataFileUUID" FROM "DigitalContents" WHERE "metadataFileUUID" IS NOT NULL;`, { transaction: t }))[0]).map(obj => obj.metadataFileUUID)
      )
      const digitalContentCoverArtFileUUIDSet = new Set(
        ((await queryInterface.sequelize.query(`SELECT "coverArtFileUUID" FROM "DigitalContents" WHERE "coverArtFileUUID" IS NOT NULL;`, { transaction: t }))[0]).map(obj => obj.coverArtFileUUID)
      )

      // Populate type for all files
      const files = (await queryInterface.sequelize.query(`SELECT * FROM "Files";`, { transaction: t }))[0]
      let orphanedFiles = [] // no types
      let corruptedFiles = [] // multiple types
      let digitalContentFiles = []
      let metadataFiles = []
      let imageFiles = []

      for (let file of files) {
        let type = null
        const fileUUID = file.fileUUID

        // Determine type of file
        if (file.sourceFile) {
          type = 'digital_content'
          digitalContentFiles.push(file)
        }
        if (userMetadataFileUUIDSet.has(fileUUID) || digitalContentMetadataFileUUIDSet.has(fileUUID)) {
          if (type != null) {
            corruptedFiles.push(file)
          }
          type = 'metadata'
          metadataFiles.push(file)
        }
        if (userCoverArtFileUUIDSet.has(fileUUID) || userProfilePicFileUUIDSet.has(fileUUID) || digitalContentCoverArtFileUUIDSet.has(fileUUID)) {
          if (type != null) {
            corruptedFiles.push(file)
          }
          type = 'image'
          imageFiles.push(file)
        }
        if (type == null) {
          orphanedFiles.push(file)
        }
        // Write file type to DB
        await queryInterface.sequelize.query(
          `UPDATE "Files" SET "type" = '${type}' WHERE "fileUUID" = '${fileUUID}'`,
          { transaction: t }
        )
      }
      console.log('num orphaned files', orphanedFiles.length)
      console.log('num corrupted files', corruptedFiles.length)
      console.log(`num digital_content files ${digitalContentFiles.length}`)
      console.log(`num metadata files ${metadataFiles.length}`)
      console.log(`num image files ${imageFiles.length}`)

      await t.commit()
    } catch (e) {
      await t.rollback()
    }
  },
  down: async (queryInterface, Sequelize) => {
    await queryInterface.removeColumn('Files', 'type')
  }
}
