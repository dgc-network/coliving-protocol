'use strict'

/**
 * Adds a 'count' field to UserAgreementListens, which signifies the
 * number of times a user has listened to a agreement
 */
module.exports = {
  up: (queryInterface, Sequelize) => {
    return queryInterface.sequelize.transaction(async (transaction) => {
      await queryInterface.addColumn('UserAgreementListens', 'count', {
        type: Sequelize.INTEGER,
        allowNull: false,
        defaultValue: 1
      }, { transaction })
    })
  },

  down: (queryInterface, Sequelize) => {
    return queryInterface.removeColumn('UserAgreementListens', 'count')
  }
}
