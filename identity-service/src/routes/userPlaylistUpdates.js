const moment = require('moment-timezone')
const { handleResponse, successResponse, errorResponseBadRequest, errorResponseServerError } = require('../apiHelpers')
const models = require('../models')
const authMiddleware = require('../authMiddleware')

module.exports = function (app) {
  /**
   * Returns the content listUpdates dictionary for given user
   * @param {string} walletAddress   user wallet address
   */
  app.get('/user_content list_updates', handleResponse(async (req) => {
    const { walletAddress } = req.query
    if (!walletAddress) {
      return errorResponseBadRequest('Please provide a wallet address')
    }

    try {
      const userEvents = await models.UserEvents.findOne({
        attributes: ['content listUpdates'],
        where: { walletAddress }
      })
      if (!userEvents) throw new Error(`UserEvents for ${walletAddress} not found`)

      return successResponse({ content listUpdates: userEvents.content listUpdates })
    } catch (e) {
      req.logger.error(e)
      // no-op. No user events.
      return errorResponseServerError(
        `Unable to get user last content list views for ${walletAddress}`
      )
    }
  }))

  /**
   * Updates the lastContentListViews field for the user in the UserEvents table
   * @param {boolean} content listId   id of content list or folder to update
   */
  app.post('/user_content list_updates', authMiddleware, handleResponse(async (req) => {
    const { content listId } = req.query
    const { walletAddress } = req.user
    if (!walletAddress || !content listId) {
      return errorResponseBadRequest(
        'Please provide a wallet address and a content list library item id'
      )
    }

    try {
      const result = await models.UserEvents.findOne({
        attributes: ['content listUpdates'],
        where: { walletAddress }
      })
      if (!result) throw new Error(`ContentList updates for ${walletAddress} not found`)

      const content listUpdatesResult = result.content listUpdates
      const now = moment().utc().valueOf()
      let content listUpdates = {}
      if (!content listUpdatesResult) {
        content listUpdates[content listId] = {
          lastUpdated: now,
          userLastViewed: now
        }
      } else {
        content listUpdates = {
          ...content listUpdatesResult,
          [content listId]: {
            lastUpdated: now,
            ...content listUpdatesResult[content listId],
            userLastViewed: now
          }
        }
      }

      await models.UserEvents.update(
        { content listUpdates },
        { where: { walletAddress } }
      )
      return successResponse({})
    } catch (e) {
      req.logger.error(e)
      console.log(e)
      return errorResponseServerError(
        `Unable to update user last content list views for ${walletAddress} for content list library item id ${content listId}`
      )
    }
  }))
}
