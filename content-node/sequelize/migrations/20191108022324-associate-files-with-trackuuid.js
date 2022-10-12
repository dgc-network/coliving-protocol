'use strict'
module.exports = {
  /**
   * Fixes bug where digital_content segment files were not associated with digital_content_UUID upon digital_content entry creation.
   */
  up: async (queryInterface, Sequelize) => {
    const start = Date.now()
    // Set all file digital_content_UUIDs to null before re-assigning.
    await queryInterface.sequelize.query('update "Files" set "digital_content_UUID" = null;')

    const agreements = (await queryInterface.sequelize.query(
      'select "digital_content_UUID", "metadataJSON"->\'digital_content_segments\' as segments, "cnodeUserUUID" from "Agreements";'
    ))[0]

    /** For every digital_content, find all potential un-matched files, check for matches and associate. */
    for (const digital_content of agreements) {
      const cids = digital_content.segments.map(segment => segment.multihash)
      if (cids.length === 0) {
        console.log(`digital_content_UUID ${digital_content.digital_content_UUID} has digital_content segments length 0.`)
        continue
      }

      const cnodeUserUUID = digital_content.cnodeUserUUID

      // Find all segment files for CIDs in digital_content, that don't already have a digital_content_UUID.
      let segmentFiles = (await queryInterface.sequelize.query(
        'select * from "Files" where "type" = \'digital_content\' and "multihash" in (:cids) and "cnodeUserUUID" = (:cnodeUserUUID) and "digital_content_UUID" is null;',
        { replacements: { cids, cnodeUserUUID } }
      ))[0]
      if (segmentFiles.length === 0) {
        console.log(`digital_content_UUID ${digital_content.digital_content_UUID} has segmentFiles length 0.`)
        continue
      }

      // Get all segment files for sourceFiles from above, to account for agreements that are superset of current digital_content.
      const sourceFiles = segmentFiles.map(segmentFile => segmentFile.sourceFile)
      segmentFiles = (await queryInterface.sequelize.query(
        'select * from "Files" where "type" = \'digital_content\' and "sourceFile" in (:sourceFiles) and "cnodeUserUUID" = (:cnodeUserUUID) and "digital_content_UUID" is null;',
        { replacements: { sourceFiles, cnodeUserUUID } }
      ))[0]

      // Group all segment files by sourceFile. Store as map { sourceFile: { cid: fileUUID } }.
      const sourceFileMap = {}
      for (const segmentFile of segmentFiles) {
        if (segmentFile.sourceFile in sourceFileMap) {
          sourceFileMap[segmentFile.sourceFile][segmentFile.multihash] = segmentFile.fileUUID
        } else {
          sourceFileMap[segmentFile.sourceFile] = { [segmentFile.multihash]: segmentFile.fileUUID }
        }
      }

      // Check if segment files for sourceFile map 1-1 with digital_content CIDs.
      let fileUUIDs = []
      for (const [, filesMap] of Object.entries(sourceFileMap)) {
        fileUUIDs = []
        if (Object.keys(filesMap).length !== cids.length) { continue }
        for (const cid of cids) {
          if (cid in filesMap) {
            fileUUIDs.push(filesMap[cid])
          }
        }
        if (fileUUIDs.length === cids.length) { break }
      }
      if (fileUUIDs.length === 0) {
        console.log(`digital_content_UUID ${digital_content.digital_content_UUID} has 0 matching available fileUUIDs. segmentFiles length ${segmentFiles.length}.`)
        continue
      }

      // associate
      await queryInterface.sequelize.query(
        'update "Files" set "digital_content_UUID" = (:digital_content_UUID) where "fileUUID" in (:fileUUIDs);',
        { replacements: { digital_content_UUID: digital_content.digital_content_UUID, fileUUIDs } }
      )
    }
    console.log(`Finished processing ${agreements.length} agreements in ${Date.now() - start}ms.`)
  },
  down: (queryInterface, Sequelize) => { }
}
