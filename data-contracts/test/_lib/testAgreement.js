/* global assert */

import { assertEqualValues, parseTx, parseTxWithResp } from '../utils/parser'
import { getAgreementFromFactory, getNetworkIdForContractInstance } from '../utils/getters'
import { eth_signTypedData } from '../utils/util'
import { validateObj } from '../utils/validator'
const signatureSchemas = require('../../signatureSchemas/signatureSchemas')

/****** EXTERNAL E2E FUNCTIONS ******/

/** Adds digital_content to blockchain using function input fields,
  *   validates emitted event and digital_content data on-chain
  * @returns {object} with event and digital_content data
  */
export const addAgreementAndValidate = async (agreementFactory, agreementId, walletAddress, agreementOwnerId, multihashDigest, multihashHashFn, multihashSize) => {
  // Validate args - TODO
  // generate new digital_content request
  const nonce = signatureSchemas.getNonce()
  const chainId = getNetworkIdForContractInstance(agreementFactory) // in testing use the network id as chain ID because chain ID is unavailable
  const signatureData = signatureSchemas.generators.getAddAgreementRequestData(chainId, agreementFactory.address, agreementOwnerId, multihashDigest, multihashHashFn, multihashSize, nonce)
  const sig = await eth_signTypedData(walletAddress, signatureData)
  // Add new digital_content to contract
  let tx = await agreementFactory.addAgreement(agreementOwnerId, multihashDigest, multihashHashFn, multihashSize, nonce, sig)
  // validate event output = transaction input
  let event = parseTxWithResp(tx, { _id: true, _digital_contentOwnerId: true, _multihashDigest: true, _multihashHashFn: true, _multihashSize: true })
  validateObj(event, { eventName: 'NewAgreement', agreementId, agreementOwnerId, multihashDigest, multihashHashFn, multihashSize })
  // retrieve digital_content from contract
  let digital_content = await getAgreementFromFactory(agreementId, agreementFactory)
  validateObj(digital_content, { agreementOwnerId, multihashDigest, multihashHashFn, multihashSize })
  return {
    event: event,
    digital_content: digital_content
  }
}

/** Deletes digital_content from blockchain using function input fields,
  *   validates emitted event and digital_content data on-chain
  * @returns {object} with event data
  */
export const deleteAgreementAndValidate = async (agreementFactory, walletAddress, agreementId) => {
  // Validate args - TODO
  const nonce = signatureSchemas.getNonce()
  const chainId = getNetworkIdForContractInstance(agreementFactory) // in testing use the network ID as chain ID because chain ID is unavailable
  const signatureData = signatureSchemas.generators.getDeleteAgreementRequestData(chainId, agreementFactory.address, agreementId, nonce)
  const sig = await eth_signTypedData(walletAddress, signatureData)
  // call delete digital_content from chain
  let tx = await agreementFactory.deleteAgreement(agreementId, nonce, sig)
  // validate event output = transaction input
  let event = parseTxWithResp(tx, { _digital_contentId: true })
  validateObj(event, { eventName: 'AgreementDeleted', agreementId })
  // TODO after storage implemented - attemt to retrieve digital_content from chain
  // TODO after storage implemented - validate digital_content does not exist
  return {
    event: event
  }
}

export const updateAgreement = async (agreementFactory, walletAddress, agreementId, agreementOwnerId, multihashDigest, multihashHashFn, multihashSize) => {
  // generate update digital_content request
  const nonce = signatureSchemas.getNonce()
  const chainId = getNetworkIdForContractInstance(agreementFactory)
  // in testing use the network id as chain ID because chain ID is unavailable
  const signatureData = signatureSchemas.generators.getUpdateAgreementRequestData(chainId, agreementFactory.address, agreementId, agreementOwnerId, multihashDigest, multihashHashFn, multihashSize, nonce)
  const sig = await eth_signTypedData(walletAddress, signatureData)
  return agreementFactory.updateAgreement(agreementId, agreementOwnerId, multihashDigest, multihashHashFn, multihashSize, nonce, sig)
}

/** Adds agreementRepost to blockchain using function input fields, validates emitted event
  * @returns {object} with event data
  */
export const addAgreementRepostAndValidate = async (socialFeatureFactory, userAddress, userId, agreementId) => {
  // generate new add digital_content repost request
  const nonce = signatureSchemas.getNonce()
  const chainId = getNetworkIdForContractInstance(socialFeatureFactory) // in testing use the network id as chain ID because chain ID is unavailable
  const signatureData = signatureSchemas.generators.getAddAgreementRepostRequestData(chainId, socialFeatureFactory.address, userId, agreementId, nonce)
  const sig = await eth_signTypedData(userAddress, signatureData)
  // add new agreementRepost to chain
  let tx = await socialFeatureFactory.addAgreementRepost(userId, agreementId, nonce, sig)
  // validate event output = transaction input
  let event = parseTxWithResp(tx, { _userId: true, _digital_contentId: true })
  validateObj(event, { eventName: 'AgreementRepostAdded', userId, agreementId })
  // validate storage
  let isAgreementReposted = await socialFeatureFactory.userRepostedAgreement.call(userId, agreementId)
  assert.isTrue(isAgreementReposted, 'Expect storage to confirm state change')
  return {
    event: event
  }
}

/** deletes agreementRepost from blockchain using function input fields, validates emitted event
  * @returns {object} with event data
  */
export const deleteAgreementRepostAndValidate = async (socialFeatureFactory, userAddress, userId, agreementId) => {
  // generate delete digital_content repost request
  const nonce = signatureSchemas.getNonce()
  const chainId = getNetworkIdForContractInstance(socialFeatureFactory) // in testing use the network id as chain ID because chain ID is unavailable
  const signatureData = signatureSchemas.generators.getDeleteAgreementRepostRequestData(chainId, socialFeatureFactory.address, userId, agreementId, nonce)
  const sig = await eth_signTypedData(userAddress, signatureData)
  // delete agreementRepost from chain
  let tx = await socialFeatureFactory.deleteAgreementRepost(userId, agreementId, nonce, sig)
  // validate event output = transaction input
  let event = parseTxWithResp(tx, { _userId: true, _digital_contentId: true })
  validateObj(event, { eventName: 'AgreementRepostDeleted', userId, agreementId })
  // validate storage
  let isAgreementReposted = await socialFeatureFactory.userRepostedAgreement.call(userId, agreementId)
  assert.isFalse(isAgreementReposted, 'Expect storage to confirm added digital_content repost')
  return {
    event: event
  }
}

export const addAgreementSaveAndValidate = async (userLibraryFactory, userAddress, userId, agreementId) => {
  const nonce = signatureSchemas.getNonce()
  // in testing use the network id as chain ID because chain ID is unavailable
  const chainId = getNetworkIdForContractInstance(userLibraryFactory)
  const signatureData = signatureSchemas.generators.getAgreementSaveRequestData(chainId, userLibraryFactory.address, userId, agreementId, nonce)
  const sig = await eth_signTypedData(userAddress, signatureData)
  let tx = await userLibraryFactory.addAgreementSave(userId, agreementId, nonce, sig)
  let parsedAgreementSave = parseTx(tx)
  let eventInfo = parsedAgreementSave.event.args
  assertEqualValues(parsedAgreementSave, undefined, { _userId: eventInfo._userId, _digital_contentId: eventInfo._digital_contentId })
}

export const deleteAgreementSaveAndValidate = async (userLibraryFactory, userAddress, userId, agreementId) => {
  const nonce = signatureSchemas.getNonce()
  const chainId = getNetworkIdForContractInstance(userLibraryFactory)
  const signatureData = signatureSchemas.generators.getDeleteAgreementSaveRequestData(chainId, userLibraryFactory.address, userId, agreementId, nonce)
  const sig = await eth_signTypedData(userAddress, signatureData)
  let tx = await userLibraryFactory.deleteAgreementSave(userId, agreementId, nonce, sig)
  let parsedDeleteAgreementSave = parseTx(tx)
  let eventInfo = parsedDeleteAgreementSave.event.args
  assertEqualValues(parsedDeleteAgreementSave, undefined, { _userId: eventInfo._userId, _digital_contentId: eventInfo._digital_contentId })
}
