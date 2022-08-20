'use strict'

module.exports = {
  up: (queryInterface, Sequelize) => {
    return queryInterface.sequelize.transaction(async (transaction) => {
      await queryInterface.addColumn('UserEvents', 'content listUpdates', {
        type: Sequelize.JSONB,
        allowNull: true
      }, { transaction })
    })
  },

  down: (queryInterface) => {
    return queryInterface.sequelize.transaction(async () => {
      queryInterface.removeColumn('UserEvents', 'content listUpdates')
    })
  }
}
