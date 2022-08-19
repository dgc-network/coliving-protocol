'use strict'
module.exports = {
  up: (queryInterface, Sequelize) => {
    return queryInterface.createTable('UserAgreementListens', {
      id: {
        allowNull: false,
        autoIncrement: true,
        primaryKey: true,
        type: Sequelize.INTEGER
      },
      userId: {
        type: Sequelize.INTEGER,
        allowNull: false
      },
      agreementId: {
        type: Sequelize.INTEGER,
        allowNull: false
      },
      createdAt: {
        allowNull: false,
        type: Sequelize.DATE
      },
      updatedAt: {
        allowNull: false,
        type: Sequelize.DATE
      }
    }).then(() => queryInterface.addIndex('UserAgreementListens', ['userId']))
  },
  down: (queryInterface, Sequelize) => {
    return queryInterface.removeIndex('UserAgreementListens', ['userId'])
      .then(() => queryInterface.dropTable('UserAgreementListens'))
  }
}
