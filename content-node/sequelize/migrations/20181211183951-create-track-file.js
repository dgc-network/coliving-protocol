'use strict'
module.exports = {
  up: (queryInterface, Sequelize) => {
    return queryInterface.createTable('AgreementFile', {
      // fields are capitalized since sequelize expects them to be based on the
      //    DigitalContent.belongsToMany(File) association
      AgreementId: {
        type: Sequelize.INTEGER,
        allowNull: false,
        primaryKey: true,
        onDelete: 'RESTRICT',
        references: {
          model: 'Agreements',
          key: 'id',
          as: 'AgreementId'
        }
      },
      FileId: {
        type: Sequelize.INTEGER,
        allowNull: false,
        primaryKey: true,
        onDelete: 'RESTRICT',
        references: {
          model: 'Files',
          key: 'id',
          as: 'FileId'
        }
      },
      createdAt: {
        allowNull: false,
        type: Sequelize.DATE
      },
      updatedAt: {
        allowNull: false,
        type: Sequelize.DATE
      }
    })
  },
  down: (queryInterface, Sequelize) => {
    return queryInterface.dropTable('AgreementFile')
  }
}
