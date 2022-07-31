'use strict'

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.sequelize.query(`
        UPDATE "CNodeUsers"
        SET clock = subquery.max_clock
        FROM (
          SELECT "cnodeUserUUID", MAX(clock) as max_clock
          FROM "ClockRecords"
          GROUP BY "cnodeUserUUID"
        ) AS subquery
        WHERE "CNodeUsers"."cnodeUserUUID" = subquery."cnodeUserUUID"
        AND "CNodeUsers".clock < subquery.max_clock
      `)
  },

  down: async (queryInterface, Sequelize) => {
    /*
      Add reverting commands here.
      Return a promise to correctly handle asynchronicity.
      Example:
      return queryInterface.dropTable('users');
    */
  }
}
