const moment = require('moment-timezone')
const { handleResponse, successResponse, errorResponseBadRequest, errorResponseServerError } = require('../apiHelpers')
const models = require('../models')
const authMiddleware = require('../authMiddleware')

module.exports = function (app) {
  /**
   * Returns the contentListUpdates dictionary for given user
   * @param {string} walletAddress   user wallet address
   */
  app.get('/user_contentList_updates', handleResponse(async (req) => {
    const { walletAddress } = req.query
    if (!walletAddress) {
      return errorResponseBadRequest('Please provide a wallet address')
    }

    try {
      const userEvents = await models.UserEvents.findOne({
        attributes: ['contentListUpdates'],
        where: { walletAddress }
      })
      if (!userEvents) throw new Error(`UserEvents for ${walletAddress} not found`)

      return successResponse({ contentListUpdates: userEvents.contentListUpdates })
    } catch (e) {
      req.logger.error(e)
      // no-op. No user events.
      return errorResponseServerError(
        `Unable to get user last contentList views for ${walletAddress}`
      )
    }
  }))

  /**
   * Updates the lastContentListViews field for the user in the UserEvents table
   * @param {boolean} contentListId   id of contentList or folder to update
   */
  app.post('/user_contentList_updates', authMiddleware, handleResponse(async (req) => {
    const { contentListId } = req.query
    const { walletAddress } = req.user
    if (!walletAddress || !contentListId) {
      return errorResponseBadRequest(
        'Please provide a wallet address and a contentList library item id'
      )
    }

    try {
      const result = await models.UserEvents.findOne({
        attributes: ['contentListUpdates'],
        where: { walletAddress }
      })
      if (!result) throw new Error(`ContentList updates for ${walletAddress} not found`)

      const contentListUpdatesResult = result.contentListUpdates
      const now = moment().utc().valueOf()
      let contentListUpdates = {}
      if (!contentListUpdatesResult) {
        contentListUpdates[contentListId] = {
          lastUpdated: now,
          userLastViewed: now
        }
      } else {
        contentListUpdates = {
          ...contentListUpdatesResult,
          [contentListId]: {
            lastUpdated: now,
            ...contentListUpdatesResult[contentListId],
            userLastViewed: now
          }
        }
      }

      await models.UserEvents.update(
        { contentListUpdates },
        { where: { walletAddress } }
      )
      return successResponse({})
    } catch (e) {
      req.logger.error(e)
      console.log(e)
      return errorResponseServerError(
        `Unable to update user last contentList views for ${walletAddress} for contentList library item id ${contentListId}`
      )
    }
  }))
}
