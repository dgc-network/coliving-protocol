'use strict'

/**
 * Makes entries in the user list table unique on digital_content id and user id.
 * Deletes currently conflicting entries. We aren't sure how these arose in the
 * first place.
 */
module.exports = {
  up: (queryInterface, Sequelize) => {
    return queryInterface.sequelize.query(`
      DELETE FROM "UserDigitalContentListens"
      WHERE "id" in (
        SELECT "id" FROM (
          SELECT *,
          ROW_NUMBER() OVER (PARTITION BY "userId", "digitalContentId" ORDER BY "userId", "digitalContentId") as rowNumber
          FROM "UserDigitalContentListens"
        ) A
        WHERE A.rowNumber > 1
    )`).then(() => {
      return queryInterface.addConstraint('UserDigitalContentListens', ['userId', 'digitalContentId'], {
        type: 'unique',
        name: 'unique_on_user_id_and_digital_content_id'
      })
    })
  },

  down: (queryInterface, Sequelize) => {
    // return new Promise(resolve => resolve())
    return queryInterface.removeConstraint('UserDigitalContentListens', 'unique_on_user_id_and_digital_content_id')
  }
}
