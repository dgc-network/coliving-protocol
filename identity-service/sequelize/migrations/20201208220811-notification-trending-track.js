'use strict'
const models = require('../../src/models')

module.exports = {
  up: async (queryInterface, Sequelize) => {
    /**
     * Add 'TrendingDigitalContent' to enum 'enum_Notifications_type'
     */
    await queryInterface.sequelize.query(`ALTER TYPE "enum_Notifications_type" ADD VALUE 'TrendingDigitalContent'`)
  },

  down: async (queryInterface, Sequelize) => {
    /**
     * Remove 'TrendingDigitalContent' from enum 'enum_Notifications_type'
     */
    const tableName = 'Notifications'
    const columnName = 'type'
    const enumName = 'enum_Notifications_type'
    const newEnumName = `enum_Notifications_type_new`
    const prevValues = [ 'Follow', 'RepostDigitalContent', 'RepostContentList', 'RepostAlbum', 'FavoriteDigitalContent',
      'FavoriteContentList', 'FavoriteAlbum', 'CreateDigitalContent', 'CreateContentList', 'CreateAlbum',
      'Announcement', 'MilestoneListen', 'MilestoneRepost', 'MilestoneFavorite', 'MilestoneFollow',
      'RemixCreate', 'RemixCosign']

    return queryInterface.sequelize.transaction(async (transaction) => {
      await models.Notification.destroy({
        where: { type: { [models.Sequelize.Op.in]: ['TrendingDigitalContent'] } },
        transaction
      })

      await queryInterface.sequelize.query(`
          CREATE TYPE "${newEnumName}"
            AS ENUM ('${prevValues.join('\', \'')}')
        `, { transaction })
      // Change column type to the new ENUM TYPE
      await queryInterface.sequelize.query(`
        ALTER TABLE "${tableName}"
          ALTER COLUMN ${columnName}
            TYPE "${newEnumName}"
            USING ("${columnName}"::text::"${newEnumName}")
      `, { transaction })
      // Drop old ENUM
      await queryInterface.sequelize.query(`
        DROP TYPE "${enumName}"
      `, { transaction })
      // Rename new ENUM name
      await queryInterface.sequelize.query(`
        ALTER TYPE "${newEnumName}"
          RENAME TO "${enumName}"
      `, { transaction })
    })
  }
}
