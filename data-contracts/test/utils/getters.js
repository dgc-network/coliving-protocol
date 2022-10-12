import { toStr } from './util'

/** Retrieves user from factory contract
  * @param {number} userId
  * @param {object} userFactory, deployed UserFactory truffle contract
  * @returns {object} dictionary with wallet, multihashDigest
  */
export const getUserFromFactory = async (userId, userFactory) => {
  let user = await userFactory.getUser.call(userId)
  return {
    wallet: user[0],
    handle: toStr(user[1])
  }
}
/** Retrieves digital_content from factory contract
    * @param {number} agreementId
    * @param {object} agreementFactory, deployed AgreementFactory truffle contract
    * @returns {object} dictionary with userId, multihashDigest, multihashHashFn, multihashSize
    */
export const getAgreementFromFactory = async (agreementId, agreementFactory) => {
  let digital_content = await agreementFactory.getAgreement.call(agreementId)
  return {
    agreementOwnerId: digital_content[0],
    multihashDigest: digital_content[1],
    multihashHashFn: digital_content[2],
    multihashSize: digital_content[3]
  }
}

/** Retrieves discovery node from DiscoveryNodeFactory contract
    * @param {number} discprovId
    * @param {object} discprovFactory, deployed DiscoveryNode truffle contract
    * @returns {object} dictionary with wallet address, discprov endpoint
    */
export const getDiscprovFromFactory = async (discprovId, discprovFactory) => {
  let discprov = await discprovFactory.getDiscoveryNode.call(discprovId)
  return {
    wallet: discprov[0],
    endpoint: discprov[1]
  }
}

/** Get network id for contract instance - very truffle-specific and may not work in other
 * instances
 */
export const getNetworkIdForContractInstance = (contract) => {
  return contract.constructor.network_id
}
