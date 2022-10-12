'use strict'
module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.addIndex('Files', ['multihash'], {
      name: 'ss_Files_multihash_idx',
      using: 'btree',
      concurrently: true
    })

    await queryInterface.addIndex('ColivingUsers', ['cnodeUserUUID'], {
      name: 'ss_ColivingUsers_cnodeUserUUID_idx',
      using: 'btree',
      concurrently: true
    })

    await queryInterface.addIndex('DigitalContents', ['cnodeUserUUID'], {
      name: 'ss_DigitalContents_cnodeUserUUID_idx',
      using: 'btree',
      concurrently: true
    })

    await queryInterface.addIndex('Files', ['cnodeUserUUID'], {
      name: 'ss_Files_cnodeUserUUID_idx',
      using: 'btree',
      concurrently: true
    })
  },
  down: async (queryInterface, Sequelize) => {
    await queryInterface.removeIndex('Files', 'ss_Files_multihash_idx')
    await queryInterface.removeIndex('ColivingUsers', 'ss_ColivingUsers_cnodeUserUUID_idx')
    await queryInterface.removeIndex('DigitalContents', 'ss_DigitalContents_cnodeUserUUID_idx')
    await queryInterface.removeIndex('Files', 'ss_Files_cnodeUserUUID_idx')
  }
}
