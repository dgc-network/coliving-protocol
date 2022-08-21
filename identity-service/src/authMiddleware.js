const axios = require('axios')
const { recoverPersonalSignature } = require('eth-sig-util')
const { sendResponse, errorResponseBadRequest } = require('./apiHelpers')

const models = require('./models')

const colivingLibsWrapper = require('./colivingLibsInstance')

/**
 * queryDiscprovForUserId - Queries the discovery node for the user w/ the walletaddress
 * @param {string} walletAddress
 * @returns {object} User Metadata object
 */
const queryDiscprovForUserId = async (walletAddress, handle) => {
  const { discoveryNode } = colivingLibsWrapper.getColivingLibs()

  const response = await axios({
    method: 'get',
    url: `${discoveryNode.discoveryNodeEndpoint}/users`,
    params: {
      wallet: walletAddress
    }
  })

  if (!Array.isArray(response.data.data) || !(response.data.data.length >= 1)) {
    throw new Error('Unable to retrieve user from discovery provder')
  }
  let usersList = response.data.data
  if (usersList.length === 1) {
    const [user] = response.data.data
    return user
  } else {
    for (let respUser of usersList) {
      if (respUser.handle === handle) {
        return respUser
      }
    }
  }
}

/**
 * Authentication Middleware
 * 1) Using the `Encoded-Data-Message` & `Encoded-Data-Signature` header recover the wallet address
 * 2) If a user in the `Users` table with the `walletAddress` value, attach that user to the request
 * 3) Else query the discovery node for the user's blockchain userId w/ the wallet address & attach to query
 */
async function authMiddleware (req, res, next) {
  try {
    const encodedDataMessage = req.get('Encoded-Data-Message')
    const signature = req.get('Encoded-Data-Signature')
    const handle = req.query.handle

    if (!encodedDataMessage) throw new Error('[Error]: Encoded data missing')
    if (!signature) throw new Error('[Error]: Encoded data signature missing')

    const walletAddress = recoverPersonalSignature({ data: encodedDataMessage, sig: signature })
    let user = await models.User.findOne({
      where: { walletAddress },
      attributes: ['id', 'blockchainUserId', 'walletAddress', 'createdAt', 'handle']
    })
    if (!user) throw new Error(`[Error]: no user found for wallet address ${walletAddress}`)

    if (!user.blockchainUserId || !user.handle) {
      const discprovUser = await queryDiscprovForUserId(walletAddress, handle)
      user = await user.update({ blockchainUserId: discprovUser.user_id, handle: discprovUser.handle })
    }
    req.user = user
    next()
  } catch (err) {
    const errorResponse = errorResponseBadRequest('[Error]: The wallet address is not associated with a user id')
    return sendResponse(req, res, errorResponse)
  }
}

/**
 * Parameterized version of authentication middleware
 * @param {{
 *  shouldRespondBadRequest, whether or not to return server error on auth failure
 * }: {
 *  shouldRespondBadRequest: boolean
 * }}
 * @returns function `authMiddleware`
 */
const parameterizedAuthMiddleware = ({ shouldRespondBadRequest }) => {
  return async (req, res, next) => {
    try {
      const encodedDataMessage = req.get('Encoded-Data-Message')
      const signature = req.get('Encoded-Data-Signature')
      const handle = req.query.handle

      if (!encodedDataMessage) throw new Error('[Error]: Encoded data missing')
      if (!signature) throw new Error('[Error]: Encoded data signature missing')

      const walletAddress = recoverPersonalSignature({ data: encodedDataMessage, sig: signature })
      const user = await models.User.findOne({
        where: { walletAddress },
        attributes: ['id', 'blockchainUserId', 'walletAddress', 'createdAt', 'handle']
      })
      if (!user) throw new Error(`[Error]: no user found for wallet address ${walletAddress}`)

      if (!user.blockchainUserId || !user.handle) {
        const discprovUser = await queryDiscprovForUserId(walletAddress, handle)
        await user.update({ blockchainUserId: discprovUser.user_id, handle: discprovUser.handle })
      }
      req.user = user
      next()
    } catch (err) {
      if (shouldRespondBadRequest) {
        const errorResponse = errorResponseBadRequest('[Error]: The wallet address is not associated with a user id')
        return sendResponse(req, res, errorResponse)
      }
      next()
    }
  }
}

module.exports = authMiddleware
module.exports.parameterizedAuthMiddleware = parameterizedAuthMiddleware
