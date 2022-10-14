/* global assert */

import { assertEqualValues, parseTx, parseTxWithResp } from '../utils/parser'
import { getDigitalContentFromFactory, getNetworkIdForContractInstance } from '../utils/getters'
import { eth_signTypedData } from '../utils/util'
import { validateObj } from '../utils/validator'
const signatureSchemas = require('../../signatureSchemas/signatureSchemas')

/****** EXTERNAL E2E FUNCTIONS ******/

/** Adds digital_content to blockchain using function input fields,
  *   validates emitted event and digital_content data on-chain
  * @returns {object} with event and digital_content data
  */
export const addDigitalContentAndValidate = async (digitalContentFactory, digitalContentId, walletAddress, digitalContentOwnerId, multihashDigest, multihashHashFn, multihashSize) => {
  // Validate args - TODO
  // generate new digital_content request
  const nonce = signatureSchemas.getNonce()
  const chainId = getNetworkIdForContractInstance(digitalContentFactory) // in testing use the network id as chain ID because chain ID is unavailable
  const signatureData = signatureSchemas.generators.getAddDigitalContentRequestData(chainId, digitalContentFactory.address, digitalContentOwnerId, multihashDigest, multihashHashFn, multihashSize, nonce)
  const sig = await eth_signTypedData(walletAddress, signatureData)
  // Add new digital_content to contract
  let tx = await digitalContentFactory.addDigitalContent(digitalContentOwnerId, multihashDigest, multihashHashFn, multihashSize, nonce, sig)
  // validate event output = transaction input
  let event = parseTxWithResp(tx, { _id: true, _digitalContentOwnerId: true, _multihashDigest: true, _multihashHashFn: true, _multihashSize: true })
  validateObj(event, { eventName: 'NewDigitalContent', digitalContentId, digitalContentOwnerId, multihashDigest, multihashHashFn, multihashSize })
  // retrieve digital_content from contract
  let digital_content = await getDigitalContentFromFactory(digitalContentId, digitalContentFactory)
  validateObj(digital_content, { digitalContentOwnerId, multihashDigest, multihashHashFn, multihashSize })
  return {
    event: event,
    digital_content: digital_content
  }
}

/** Deletes digital_content from blockchain using function input fields,
  *   validates emitted event and digital_content data on-chain
  * @returns {object} with event data
  */
export const deleteDigitalContentAndValidate = async (digitalContentFactory, walletAddress, digitalContentId) => {
  // Validate args - TODO
  const nonce = signatureSchemas.getNonce()
  const chainId = getNetworkIdForContractInstance(digitalContentFactory) // in testing use the network ID as chain ID because chain ID is unavailable
  const signatureData = signatureSchemas.generators.getDeleteDigitalContentRequestData(chainId, digitalContentFactory.address, digitalContentId, nonce)
  const sig = await eth_signTypedData(walletAddress, signatureData)
  // call delete digital content from chain
  let tx = await digitalContentFactory.deleteDigitalContent(digitalContentId, nonce, sig)
  // validate event output = transaction input
  let event = parseTxWithResp(tx, { _digitalContentId: true })
  validateObj(event, { eventName: 'DigitalContentDeleted', digitalContentId })
  // TODO after storage implemented - attemt to retrieve digital_content from chain
  // TODO after storage implemented - validate digital_content does not exist
  return {
    event: event
  }
}

export const updateDigitalContent = async (digitalContentFactory, walletAddress, digitalContentId, digitalContentOwnerId, multihashDigest, multihashHashFn, multihashSize) => {
  // generate update digital_content request
  const nonce = signatureSchemas.getNonce()
  const chainId = getNetworkIdForContractInstance(digitalContentFactory)
  // in testing use the network id as chain ID because chain ID is unavailable
  const signatureData = signatureSchemas.generators.getUpdateDigitalContentRequestData(chainId, digitalContentFactory.address, digitalContentId, digitalContentOwnerId, multihashDigest, multihashHashFn, multihashSize, nonce)
  const sig = await eth_signTypedData(walletAddress, signatureData)
  return digitalContentFactory.updateDigitalContent(digitalContentId, digitalContentOwnerId, multihashDigest, multihashHashFn, multihashSize, nonce, sig)
}

/** Adds digitalContentRepost to blockchain using function input fields, validates emitted event
  * @returns {object} with event data
  */
export const addDigitalContentRepostAndValidate = async (socialFeatureFactory, userAddress, userId, digitalContentId) => {
  // generate new add digital_content repost request
  const nonce = signatureSchemas.getNonce()
  const chainId = getNetworkIdForContractInstance(socialFeatureFactory) // in testing use the network id as chain ID because chain ID is unavailable
  const signatureData = signatureSchemas.generators.getAddDigitalContentRepostRequestData(chainId, socialFeatureFactory.address, userId, digitalContentId, nonce)
  const sig = await eth_signTypedData(userAddress, signatureData)
  // add new digitalContentRepost to chain
  let tx = await socialFeatureFactory.addDigitalContentRepost(userId, digitalContentId, nonce, sig)
  // validate event output = transaction input
  let event = parseTxWithResp(tx, { _userId: true, _digitalContentId: true })
  validateObj(event, { eventName: 'DigitalContentRepostAdded', userId, digitalContentId })
  // validate storage
  let isDigitalContentReposted = await socialFeatureFactory.userRepostedDigitalContent.call(userId, digitalContentId)
  assert.isTrue(isDigitalContentReposted, 'Expect storage to confirm state change')
  return {
    event: event
  }
}

/** deletes digitalContentRepost from blockchain using function input fields, validates emitted event
  * @returns {object} with event data
  */
export const deleteDigitalContentRepostAndValidate = async (socialFeatureFactory, userAddress, userId, digitalContentId) => {
  // generate delete digital content repost request
  const nonce = signatureSchemas.getNonce()
  const chainId = getNetworkIdForContractInstance(socialFeatureFactory) // in testing use the network id as chain ID because chain ID is unavailable
  const signatureData = signatureSchemas.generators.getDeleteDigitalContentRepostRequestData(chainId, socialFeatureFactory.address, userId, digitalContentId, nonce)
  const sig = await eth_signTypedData(userAddress, signatureData)
  // delete digitalContentRepost from chain
  let tx = await socialFeatureFactory.deleteDigitalContentRepost(userId, digitalContentId, nonce, sig)
  // validate event output = transaction input
  let event = parseTxWithResp(tx, { _userId: true, _digitalContentId: true })
  validateObj(event, { eventName: 'DigitalContentRepostDeleted', userId, digitalContentId })
  // validate storage
  let isDigitalContentReposted = await socialFeatureFactory.userRepostedDigitalContent.call(userId, digitalContentId)
  assert.isFalse(isDigitalContentReposted, 'Expect storage to confirm added digital_content repost')
  return {
    event: event
  }
}

export const addDigitalContentSaveAndValidate = async (userLibraryFactory, userAddress, userId, digitalContentId) => {
  const nonce = signatureSchemas.getNonce()
  // in testing use the network id as chain ID because chain ID is unavailable
  const chainId = getNetworkIdForContractInstance(userLibraryFactory)
  const signatureData = signatureSchemas.generators.getDigitalContentSaveRequestData(chainId, userLibraryFactory.address, userId, digitalContentId, nonce)
  const sig = await eth_signTypedData(userAddress, signatureData)
  let tx = await userLibraryFactory.addDigitalContentSave(userId, digitalContentId, nonce, sig)
  let parsedDigitalContentSave = parseTx(tx)
  let eventInfo = parsedDigitalContentSave.event.args
  assertEqualValues(parsedDigitalContentSave, undefined, { _userId: eventInfo._userId, _digitalContentId: eventInfo._digitalContentId })
}

export const deleteDigitalContentSaveAndValidate = async (userLibraryFactory, userAddress, userId, digitalContentId) => {
  const nonce = signatureSchemas.getNonce()
  const chainId = getNetworkIdForContractInstance(userLibraryFactory)
  const signatureData = signatureSchemas.generators.getDeleteDigitalContentSaveRequestData(chainId, userLibraryFactory.address, userId, digitalContentId, nonce)
  const sig = await eth_signTypedData(userAddress, signatureData)
  let tx = await userLibraryFactory.deleteDigitalContentSave(userId, digitalContentId, nonce, sig)
  let parsedDeleteDigitalContentSave = parseTx(tx)
  let eventInfo = parsedDeleteDigitalContentSave.event.args
  assertEqualValues(parsedDeleteDigitalContentSave, undefined, { _userId: eventInfo._userId, _digitalContentId: eventInfo._digitalContentId })
}
