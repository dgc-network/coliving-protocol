'use strict'

/**
 * Adds a 'count' field to UserDigitalContentListens, which signifies the
 * number of times a user has listened to a digital_content
 */
module.exports = {
  up: (queryInterface, Sequelize) => {
    return queryInterface.sequelize.transaction(async (transaction) => {
      await queryInterface.addColumn('UserDigitalContentListens', 'count', {
        type: Sequelize.INTEGER,
        allowNull: false,
        defaultValue: 1
      }, { transaction })
    })
  },

  down: (queryInterface, Sequelize) => {
    return queryInterface.removeColumn('UserDigitalContentListens', 'count')
  }
}
