'use strict'
const models = require('../../src/models')

module.exports = {
  up: (queryInterface, Sequelize) => {
    // Add 'digitalcoin' to "NotificatiionEmails" "emailFrequency"
    return queryInterface.sequelize.query(
      "ALTER TYPE \"enum_NotificationEmails_emailFrequency\" ADD VALUE 'digitalcoin'"
    )
    // Do nothing if it already exists
    // Deleting enum values is not possible w/o root db access, so in the case the enum already exists
    // just continue on. If for some reason this threw but it didn't exist, we would fail at the next step
    // not continue
      .catch(() => { })
    // Change the default to 'digitalcoin'
      .finally(() => {
        return queryInterface.sequelize.query(
          "ALTER TABLE \"NotificationEmails\" ALTER \"emailFrequency\" set default 'digitalcoin'::\"enum_NotificationEmails_emailFrequency\""
        )
      })
    // Add 'digitalcoin' to "UserNotificationSettings" "emailFrequency"
      .then(() => {
        return queryInterface.sequelize.query(
          "ALTER TYPE \"enum_UserNotificationSettings_emailFrequency\" ADD VALUE 'digitalcoin'"
        )
      })
    // Do nothing if it already exists
    // Deleting enum values is not possible w/o root db access, so in the case the enum already exists
    // just continue on. If for some reason this threw but it didn't exist, we would fail at the next step
    // not continue
      .catch(() => { })
    // Change the default ot 'digitalcoin'
      .finally(() => {
        return queryInterface.sequelize.query(
          "ALTER TABLE \"UserNotificationSettings\" ALTER \"emailFrequency\" set default 'digitalcoin'::\"enum_UserNotificationSettings_emailFrequency\""
        )
      })
    // Set all the users who have the default (daily) to digitalcoin
      .then(() => {
        return models.UserNotificationSettings.update({
          emailFrequency: 'digitalcoin'
        }, {
          where: { emailFrequency: 'daily' }
        })
      })
  },

  down: (queryInterface, Sequelize) => {
    // Set all the users who have the default (digitalcoin) to daily
    return models.UserNotificationSettings.update({
      emailFrequency: 'daily'
    }, {
      where: { emailFrequency: 'digitalcoin' }
    })
    // Change the default back to 'daily'
      .then(() => {
        return queryInterface.sequelize.query(
          "ALTER TABLE \"NotificationEmails\" ALTER \"emailFrequency\" set default 'daily'::\"enum_NotificationEmails_emailFrequency\""
        )
      })
    // Normal users can't do this!
    // Delete 'digitalcoin' from "NotificationEmails" "emailFrequency"
      // .then(() => {
      //   const query = 'DELETE FROM pg_enum ' +
      //   'WHERE enumlabel = \'digitalcoin\' ' +
      //   'AND enumtypid = ( SELECT oid FROM pg_type WHERE typname = \'enum_NotificationEmails_emailFrequency\')'
      //   return queryInterface.sequelize.query(query)
      // })
    // Change the default back to 'daily'
      .then(() => {
        return queryInterface.sequelize.query(
          "ALTER TABLE \"UserNotificationSettings\" ALTER \"emailFrequency\" set default 'daily'::\"enum_UserNotificationSettings_emailFrequency\""
        )
      })
    // Normal users can't do this!
    // Delete 'digitalcoin' from "NotificationEmails" "emailFrequency"
      // .then(() => {
      //   const query = 'DELETE FROM pg_enum ' +
      //   'WHERE enumlabel = \'digitalcoin\' ' +
      //   'AND enumtypid = ( SELECT oid FROM pg_type WHERE typname = \'enum_UserNotificationSettings_emailFrequency\')'
      //   return queryInterface.sequelize.query(query)
      // })
  }
}
