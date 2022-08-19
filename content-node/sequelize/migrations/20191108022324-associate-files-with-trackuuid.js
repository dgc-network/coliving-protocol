'use strict'
module.exports = {
  /**
   * Fixes bug where agreement segment files were not associated with agreementUUID upon agreement entry creation.
   */
  up: async (queryInterface, Sequelize) => {
    const start = Date.now()
    // Set all file agreementUUIDs to null before re-assigning.
    await queryInterface.sequelize.query('update "Files" set "agreementUUID" = null;')

    const agreements = (await queryInterface.sequelize.query(
      'select "agreementUUID", "metadataJSON"->\'agreement_segments\' as segments, "cnodeUserUUID" from "Agreements";'
    ))[0]

    /** For every agreement, find all potential un-matched files, check for matches and associate. */
    for (const agreement of agreements) {
      const cids = agreement.segments.map(segment => segment.multihash)
      if (cids.length === 0) {
        console.log(`agreementUUID ${agreement.agreementUUID} has agreement segments length 0.`)
        continue
      }

      const cnodeUserUUID = agreement.cnodeUserUUID

      // Find all segment files for CIDs in agreement, that don't already have a agreementUUID.
      let segmentFiles = (await queryInterface.sequelize.query(
        'select * from "Files" where "type" = \'agreement\' and "multihash" in (:cids) and "cnodeUserUUID" = (:cnodeUserUUID) and "agreementUUID" is null;',
        { replacements: { cids, cnodeUserUUID } }
      ))[0]
      if (segmentFiles.length === 0) {
        console.log(`agreementUUID ${agreement.agreementUUID} has segmentFiles length 0.`)
        continue
      }

      // Get all segment files for sourceFiles from above, to account for agreements that are superset of current agreement.
      const sourceFiles = segmentFiles.map(segmentFile => segmentFile.sourceFile)
      segmentFiles = (await queryInterface.sequelize.query(
        'select * from "Files" where "type" = \'agreement\' and "sourceFile" in (:sourceFiles) and "cnodeUserUUID" = (:cnodeUserUUID) and "agreementUUID" is null;',
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

      // Check if segment files for sourceFile map 1-1 with agreement CIDs.
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
        console.log(`agreementUUID ${agreement.agreementUUID} has 0 matching available fileUUIDs. segmentFiles length ${segmentFiles.length}.`)
        continue
      }

      // associate
      await queryInterface.sequelize.query(
        'update "Files" set "agreementUUID" = (:agreementUUID) where "fileUUID" in (:fileUUIDs);',
        { replacements: { agreementUUID: agreement.agreementUUID, fileUUIDs } }
      )
    }
    console.log(`Finished processing ${agreements.length} agreements in ${Date.now() - start}ms.`)
  },
  down: (queryInterface, Sequelize) => { }
}
