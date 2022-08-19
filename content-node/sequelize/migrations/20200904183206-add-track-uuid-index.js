'use strict'
module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.addIndex('Files', ['agreementUUID'], {
      name: 'files_agreement_uuid_index',
      using: 'btree',
      concurrently: true
    })
  },
  down: async (queryInterface, Sequelize) => {
    await queryInterface.removeIndex('Files', 'files_agreement_uuid_index')
  }
}
