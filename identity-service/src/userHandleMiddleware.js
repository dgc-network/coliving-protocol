const axios = require('axios')
const { sendResponse, errorResponseBadRequest } = require('./apiHelpers')

const models = require('./models')

const colivingLibsWrapper = require('./colivingLibsInstance')

/**
 * queryDiscprovForWalletAddressAndUserId - Queries the discovery provider for the user w/ the handle
 * @param {string} handle
 * @returns {object} User Metadata object
 */
const queryDiscprovForWalletAddressAndUserId = async (handle) => {
  const { discoveryProvider } = colivingLibsWrapper.getAudiusLibs()

  const response = await axios({
    method: 'get',
    url: `${discoveryProvider.discoveryProviderEndpoint}/users`,
    params: { handle }
  })

  const usersList = response.data.data
  if (!Array.isArray(usersList) || !(usersList.length >= 1)) {
    throw new Error('Unable to retrieve user from discovery provider')
  }

  return usersList[0]
}

/**
 * user handle middleware:
 * make sure a handle was passed as a query parameter
 * if user handle is in database, proceed
 * otherwise, query for the user with that handle in DP
 * if DP does not return a user or if wallet address of returned user is not found in the database, bad request
 * otherwise, update user for that wallet address with the handle and DP user id, then proceed
 */
async function userHandleMiddleware (req, res, next) {
  try {
    const handle = req.query.handle
    if (!handle) {
      throw new Error('Please provide handle.')
    }

    let user = await models.User.findOne({ where: { handle } })
    if (!user) {
      const discprovUser = await queryDiscprovForWalletAddressAndUserId(handle)
      const { wallet: walletAddress, user_id: blockchainUserId } = discprovUser
      const userForWallet = await models.User.findOne({ where: { walletAddress } })
      if (!userForWallet) {
        throw new Error('The handle is not associated with a user')
      }

      user = await userForWallet.update({ handle, blockchainUserId })
    }

    req.user = user
    next()
  } catch (err) {
    const errorResponse = errorResponseBadRequest(err.message)
    return sendResponse(req, res, errorResponse)
  }
}

module.exports = userHandleMiddleware
