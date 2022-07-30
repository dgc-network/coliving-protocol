const models = require('../models')
const { handleResponse, successResponse, errorResponseBadRequest } = require('../apiHelpers')

module.exports = function (app) {
  /**
   * This signup function writes the encryption values from the user's browser(iv, cipherText, lookupKey)
   * into the Authentications table and the email to the Users table. This is the first step in the
   * authentication process
   */
  app.post('/authentication', handleResponse(async (req, res, next) => {
    // body should contain {iv, cipherText, lookupKey}
    const body = req.body

    if (body && body.iv && body.cipherText && body.lookupKey) {
      try {
        const transaction = await models.sequelize.transaction()

        // Check if an existing record exists but is soft deleted (since the Authentication model is 'paranoid'
        // Setting the option paranoid to true searches both soft-deleted and non-deleted objects
        // https://sequelize.org/master/manual/paranoid.html
        // https://sequelize.org/master/class/lib/model.js~Model.html#static-method-findAll
        const existingRecord = await models.Authentication.findOne({
          where: { lookupKey: body.lookupKey },
          paranoid: false
        })
        if (!existingRecord) {
          await models.Authentication.create({
            iv: body.iv,
            cipherText: body.cipherText,
            lookupKey: body.lookupKey
          }, { transaction })
        } else if (existingRecord.isSoftDeleted()) {
          await existingRecord.restore({ transaction })
        }

        const oldLookupKey = body.oldLookupKey
        if (oldLookupKey && oldLookupKey !== body.lookupKey) {
          await models.Authentication.destroy({ where: { lookupKey: oldLookupKey } }, { transaction })
        }
        await transaction.commit()
        return successResponse()
      } catch (err) {
        req.logger.error('Error signing up a user', err)
        return errorResponseBadRequest('Error signing up a user')
      }
    } else return errorResponseBadRequest('Missing one of the required fields: iv, cipherText, lookupKey')
  }))

  app.get('/authentication', handleResponse(async (req, res, next) => {
    let queryParams = req.query

    if (queryParams && queryParams.lookupKey) {
      const lookupKey = queryParams.lookupKey
      const existingUser = await models.Authentication.findOne({ where: { lookupKey } })

      if (existingUser) {
        return successResponse(existingUser)
      } else {
        return errorResponseBadRequest('No auth record found for provided lookupKey.')
      }
    } else {
      return errorResponseBadRequest('Missing queryParam lookupKey.')
    }
  }))
}
