'use strict'

module.exports = {
  up: (queryInterface, Sequelize) => {
    return queryInterface.addColumn(
      'SocialHandles',
      'pinnedDigitalContentId', {
        type: Sequelize.INTEGER
      }
    )
  },
  down: (queryInterface, Sequelize) => {
    return queryInterface.removeColumn('SocialHandles', 'pinnedDigitalContentId')
  }
}
