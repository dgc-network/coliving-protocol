'use strict'
module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.addIndex('CNodeUsers', ['cnodeUserUUID'], {
      name: 'cnodeUsers_cnodeuserUUID_idx',
      using: 'btree',
      concurrently: true
    })

    await queryInterface.addIndex('Tracks', ['trackUUID'], {
      name: 'track_trackUUID_idx',
      using: 'btree',
      concurrently: true
    })

    await queryInterface.addIndex('Tracks', ['metadataFileUUID'], {
      name: 'track_metadataFileUUID_idx',
      using: 'btree',
      concurrently: true
    })

    await queryInterface.addIndex('Tracks', ['coverArtFileUUID'], {
      name: 'track_coverArtFileUUID_idx',
      using: 'btree',
      concurrently: true
    })

    await queryInterface.addIndex('ColivingUsers', ['metadataFileUUID'], {
      name: 'colivingUsers_metadataFileUUID_idx',
      using: 'btree',
      concurrently: true
    })

    await queryInterface.addIndex('ColivingUsers', ['coverArtFileUUID'], {
      name: 'colivingUsers_coverArtFileUUID_idx',
      using: 'btree',
      concurrently: true
    })

    await queryInterface.addIndex('ColivingUsers', ['profilePicFileUUID'], {
      name: 'colivingUsers_profilePicFileUUID_idx',
      using: 'btree',
      concurrently: true
    })
  },
  down: async (queryInterface, Sequelize) => {
    await queryInterface.removeIndex('CNodeUsers', 'cnodeUsers_cnodeuserUUID_idx')
    await queryInterface.removeIndex('Tracks', 'track_trackUUID_idx')
    await queryInterface.removeIndex('Tracks', 'track_metadataFileUUID_idx')
    await queryInterface.removeIndex('Tracks', 'track_coverArtFileUUID_idx')
    await queryInterface.removeIndex('ColivingUsers', 'colivingUsers_metadataFileUUID_idx')
    await queryInterface.removeIndex('ColivingUsers', 'colivingUsers_coverArtFileUUID_idx')
    await queryInterface.removeIndex('ColivingUsers', 'colivingUsers_profilePicFileUUID_idx')
  }
}
