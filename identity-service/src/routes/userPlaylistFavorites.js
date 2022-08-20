const { handleResponse, successResponse, errorResponseBadRequest, errorResponseServerError } = require('../apiHelpers')
const models = require('../models')
const authMiddleware = require('../authMiddleware')

module.exports = function (app) {
  app.post('/user_content list_favorites', authMiddleware, handleResponse(async (req, res, next) => {
    const { blockchainUserId: userId } = req.user
    const { favorites } = req.body

    if (!favorites) return errorResponseBadRequest('Please provide a string array of favorites')

    try {
      await models.UserContentListFavorites.upsert({
        userId,
        favorites
      })

      return successResponse('Success')
    } catch (e) {
      req.logger.error(`Unable to update favorites for: ${userId}`, e)
      return errorResponseServerError(`Unable to update favorites for: ${userId}, Error: ${e.message}`)
    }
  }))

  app.get('/user_content list_favorites', authMiddleware, handleResponse(async (req, res, next) => {
    const { blockchainUserId: userId } = req.user

    const userContentListFavorites = await models.UserContentListFavorites.findOne({
      where: {
        userId
      }
    })

    return successResponse({
      userContentListFavorites
    })
  }))
}
