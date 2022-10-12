'use strict'
module.exports = {
  up: (queryInterface, Sequelize) => {
    return queryInterface.createTable('UserDigitalContentListens', {
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
      digitalContentId: {
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
    }).then(() => queryInterface.addIndex('UserDigitalContentListens', ['userId']))
  },
  down: (queryInterface, Sequelize) => {
    return queryInterface.removeIndex('UserDigitalContentListens', ['userId'])
      .then(() => queryInterface.dropTable('UserDigitalContentListens'))
  }
}
