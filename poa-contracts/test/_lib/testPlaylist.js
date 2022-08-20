/* global assert */

import {
  assertEqualValues, parseTx, parseTxWithResp } from '../utils/parser'
import { getNetworkIdForContractInstance } from '../utils/getters'
import { eth_signTypedData } from '../utils/util'
import { validateObj } from '../utils/validator'
import { web3New } from '../utils/web3New'

const signatureSchemas = require('../../signature_schemas/signatureSchemas')
export const addContentListAndValidate = async (content listFactory, expectedContentListId, walletAddress, content listOwnerId, content listName, isPrivate, isAlbum, agreementIds) => {
  const nonce = signatureSchemas.getNonce()
  const chainId = getNetworkIdForContractInstance(content listFactory)

  // agreementIdsHash calculated by hashing encoded agreementIds[]

  // required to generate signed/typed signature below
  let agreementIdsHash = web3New.utils.soliditySha3(web3New.eth.abi.encodeParameter('uint[]', agreementIds))
  const signatureData = signatureSchemas.generators.getCreateContentListRequestData(chainId, content listFactory.address, content listOwnerId, content listName, isPrivate, isAlbum, agreementIdsHash, nonce)

  const signature = await eth_signTypedData(walletAddress, signatureData)
  let tx = await content listFactory.createContentList(content listOwnerId, content listName, isPrivate, isAlbum, agreementIds, nonce, signature)

  let parsedCreateContentList = parseTx(tx)
  let parsedCreateContentListName = tx.logs[1].args._updatedContentListName
  let eventInfo = parsedCreateContentList.event.args
  let returnedContentListId = eventInfo._content listId
  assert.equal(returnedContentListId, expectedContentListId, 'Expected content list id does not match')
  let emittedContentListId = eventInfo._content listId.toNumber()

  assert.equal(emittedContentListId, expectedContentListId, 'Expected update event content listId array to match expected')
  let emittedEventPrivacy = eventInfo._isPrivate
  assert.equal(emittedEventPrivacy, isPrivate, 'Expected emitted content list privacy to equal input')
  let emittedEventContentListName = parsedCreateContentListName
  assert.equal(content listName, emittedEventContentListName, 'Expected emitted content list name to equal input')
  let emittedEventIsAlbum = eventInfo._isAlbum
  assert.equal(isAlbum, emittedEventIsAlbum, 'Expected emitted album status to equal input')

  // Assert on agreement id array
  let emittedAgreementIds = eventInfo._agreementIds
  for (let i = 0; i < emittedAgreementIds.length; i++) {
    let emittedAgreementId = emittedAgreementIds[i].toNumber()

    assert.equal(emittedAgreementId, agreementIds[i], 'Expected ordered event agreementId to match input')
  }

  // Validate storage content list contents
  for (let i = 0; i < agreementIds; i++) {
    let isAgreementInContentList = await content listFactory.isAgreementInContentList.call(expectedContentListId, agreementIds[i])
    assert.equal(isAgreementInContentList, true, 'Expected all agreements to be added to content list')
  }
}

export const deleteContentListAndValidate = async (content listFactory, walletAddress, content listId) => {
  const nonce = signatureSchemas.getNonce()
  const chainId = getNetworkIdForContractInstance(content listFactory)
  const signatureData = signatureSchemas.generators.getDeleteContentListRequestData(chainId, content listFactory.address, content listId, nonce)

  const sig = await eth_signTypedData(walletAddress, signatureData)

  // call delete content list from chain
  let tx = await content listFactory.deleteContentList(content listId, nonce, sig)

  // validate event output = transaction input
  let event = parseTxWithResp(tx, { _content listId: true })
  validateObj(event, { eventName: 'ContentListDeleted', content listId })

  // TODO - after storage implemented - attempt to retrieve content list from chain

  // TODO - after storage implemented - validate content list does not exist

  return {
    event: event
  }
}

export const orderContentListAgreementsAndValidate = async (content listFactory, walletAddress, content listId, agreementIds) => {
  const nonce = signatureSchemas.getNonce()
  const chainId = getNetworkIdForContractInstance(content listFactory)

  // agreementIdsHash calculated by hashing encoded agreementIds[]

  // required to generate signed/typed signature below
  let agreementIdsHash = web3New.utils.soliditySha3(web3New.eth.abi.encodeParameter('uint[]', agreementIds))
  const signatureData = signatureSchemas.generators.getOrderContentListAgreementsRequestData(chainId, content listFactory.address, content listId, agreementIdsHash, nonce)

  const signature = await eth_signTypedData(walletAddress, signatureData)
  let tx = await content listFactory.orderContentListAgreements(content listId, agreementIds, nonce, signature)

  let parsedOrderContentListAgreements = parseTx(tx)
  let eventInfo = parsedOrderContentListAgreements.event.args
  let emittedContentListId = eventInfo._content listId.toNumber()

  assert.equal(emittedContentListId, content listId, 'Expected update event content listId array to match input')
  let emittedAgreementIds = eventInfo._orderedAgreementIds
  assert.equal(emittedAgreementIds.length, agreementIds.length, 'Expected ordered event agreementId array to match input')
  for (let i = 0; i < emittedAgreementIds.length; i++) {
    let emittedAgreementId = emittedAgreementIds[i].toNumber()

    assert.equal(emittedAgreementId, agreementIds[i], 'Expected ordered event agreementId to match input')
  }

  return parsedOrderContentListAgreements
}

export const updateContentListPrivacyAndValidate = async (content listFactory, walletAddress, content listId, updatedContentListPrivacy) => {
  const nonce = signatureSchemas.getNonce()
  const chainId = getNetworkIdForContractInstance(content listFactory)
  const signatureData = signatureSchemas.generators.getUpdateContentListPrivacyRequestData(chainId, content listFactory.address, content listId, updatedContentListPrivacy, nonce)

  const signature = await eth_signTypedData(walletAddress, signatureData)
  let tx = await content listFactory.updateContentListPrivacy(content listId, updatedContentListPrivacy, nonce, signature)

  let parsedUpdateContentListPrivacy = parseTx(tx)
  let eventInfo = parsedUpdateContentListPrivacy.event.args
  let emittedContentListId = eventInfo._content listId.toNumber()

  assert.equal(emittedContentListId, content listId, 'Expected update event content listId array to match input')
  let emittedEventPrivacy = eventInfo._updatedIsPrivate
  assert.equal(emittedEventPrivacy, updatedContentListPrivacy, 'Expected emitted content list privacy to equal input')

  return parsedUpdateContentListPrivacy
}

export const updateContentListNameAndValidate = async (content listFactory, walletAddress, content listId, updatedContentListName) => {
  const nonce = signatureSchemas.getNonce()
  const chainId = getNetworkIdForContractInstance(content listFactory)
  const signatureData = signatureSchemas.generators.getUpdateContentListNameRequestData(chainId, content listFactory.address, content listId, updatedContentListName, nonce)

  const signature = await eth_signTypedData(walletAddress, signatureData)
  let tx = await content listFactory.updateContentListName(content listId, updatedContentListName, nonce, signature)

  let parsedUpdateContentListName = parseTx(tx)
  let eventInfo = parsedUpdateContentListName.event.args
  let emittedContentListId = eventInfo._content listId.toNumber()

  assert.equal(emittedContentListId, content listId, 'Expected update event content listId array to match input')
  let emittedEventContentListName = eventInfo._updatedContentListName
  assert.equal(updatedContentListName, emittedEventContentListName, 'Expected emitted content list name to equal input')
}

export const updateContentListCoverPhotoAndValidate = async (content listFactory, walletAddress, content listId, updatedContentListImageMultihashDigest) => {
  const nonce = signatureSchemas.getNonce()
  const chainId = getNetworkIdForContractInstance(content listFactory)
  const signatureData = signatureSchemas.generators.getUpdateContentListCoverPhotoRequestData(chainId, content listFactory.address, content listId, updatedContentListImageMultihashDigest, nonce)

  const signature = await eth_signTypedData(walletAddress, signatureData)
  let tx = await content listFactory.updateContentListCoverPhoto(content listId, updatedContentListImageMultihashDigest, nonce, signature)

  let parsedUpdateContentListCoverPhoto = parseTx(tx)
  let eventInfo = parsedUpdateContentListCoverPhoto.event.args
  let emittedImageMultihash = eventInfo._content listImageMultihashDigest
  assert.equal(emittedImageMultihash, updatedContentListImageMultihashDigest, 'Expect emitted image multihash to equal input')
}

export const updateContentListUPCAndValidate = async (content listFactory, walletAddress, content listId, updatedContentListUPC) => {
  const nonce = signatureSchemas.getNonce()
  const chainId = getNetworkIdForContractInstance(content listFactory)
  const signatureData = signatureSchemas.generators.getUpdateContentListUPCRequestData(chainId, content listFactory.address, content listId, updatedContentListUPC, nonce)

  const signature = await eth_signTypedData(walletAddress, signatureData)
  let tx = await content listFactory.updateContentListUPC(content listId, updatedContentListUPC, nonce, signature)

  let parseUpdateContentListUPC = parseTx(tx)
  let emittedContentListUPC = (parseUpdateContentListUPC.event.args._content listUPC)
  let paddedInputUPC = web3New.utils.padRight(updatedContentListUPC, 64)
  assert.equal(emittedContentListUPC, paddedInputUPC, 'Expect emitted UPC to equal input')
}

export const updateContentListDescriptionAndValidate = async (content listFactory, walletAddress, content listId, updatedContentListDescription) => {
  const nonce = signatureSchemas.getNonce()
  const chainId = getNetworkIdForContractInstance(content listFactory)
  const signatureData = signatureSchemas.generators.getUpdateContentListDescriptionRequestData(chainId, content listFactory.address, content listId, updatedContentListDescription, nonce)

  const signature = await eth_signTypedData(walletAddress, signatureData)
  let tx = await content listFactory.updateContentListDescription(content listId, updatedContentListDescription, nonce, signature)

  let parsedUpdateContentListDescription = parseTx(tx)
  let eventInfo = parsedUpdateContentListDescription.event.args
  let emittedContentListDescription = eventInfo._content listDescription

  assert.equal(emittedContentListDescription, updatedContentListDescription, 'Expect emitted content list description to equal input')
}

/** Adds content listRepost to blockchain using function input fields, validates emitted event
  * @returns {object} with event data
  */
export const addContentListRepostAndValidate = async (socialFeatureFactory, userAddress, userId, content listId) => {
  // generate new add content list repost request
  const nonce = signatureSchemas.getNonce()
  const chainId = getNetworkIdForContractInstance(socialFeatureFactory)
  // in testing use the network id as chain ID because chain ID is unavailable
  const signatureData = signatureSchemas.generators.getAddContentListRepostRequestData(chainId, socialFeatureFactory.address, userId, content listId, nonce)

  const sig = await eth_signTypedData(userAddress, signatureData)

  // add new content listRepost to chain
  let tx = await socialFeatureFactory.addContentListRepost(userId, content listId, nonce, sig)

  // validate event output = transaction input
  let event = parseTxWithResp(tx, { _userId: true, _content listId: true })
  validateObj(event, { eventName: 'ContentListRepostAdded', userId, content listId })

  // validate storage
  let isContentListReposted = await socialFeatureFactory.userRepostedContentList.call(userId, content listId)
  assert.isTrue(isContentListReposted, 'Expect storage to confirm added content list repost')

  return {
    event: event
  }
}

/** deletes content listRepost from blockchain using function input fields, validates emitted event
  * @returns {object} with event data
  */
export const deleteContentListRepostAndValidate = async (socialFeatureFactory, userAddress, userId, content listId) => {
  // generate delete content list repost request
  const nonce = signatureSchemas.getNonce()
  const chainId = getNetworkIdForContractInstance(socialFeatureFactory) // in testing use the network id as chain ID because chain ID is unavailable
  const signatureData = signatureSchemas.generators.getDeleteContentListRepostRequestData(chainId, socialFeatureFactory.address, userId, content listId, nonce)

  const sig = await eth_signTypedData(userAddress, signatureData)

  // delete content listRepost from chain
  let tx = await socialFeatureFactory.deleteContentListRepost(userId, content listId, nonce, sig)

  // validate event output = transaction input
  let event = parseTxWithResp(tx, { _userId: true, _content listId: true })
  validateObj(event, { eventName: 'ContentListRepostDeleted', userId, content listId })

  // validate storage
  let isContentListReposted = await socialFeatureFactory.userRepostedContentList.call(userId, content listId)
  assert.isFalse(isContentListReposted, 'Expect storage to confirm deleted content list repost')

  return {
    event: event
  }
}

export const addContentListAgreement = async (content listFactory, walletAddress, content listId, addedAgreementId) => {
  const nonce = signatureSchemas.getNonce()
  const chainId = getNetworkIdForContractInstance(content listFactory)
  const signatureData = signatureSchemas.generators.getAddContentListAgreementRequestData(chainId, content listFactory.address, content listId, addedAgreementId, nonce)

  const signature = await eth_signTypedData(walletAddress, signatureData)
  let tx = await content listFactory.addContentListAgreement(content listId, addedAgreementId, nonce, signature)

  // TODO:  asserts
  let parsedAddContentListAgreement = parseTx(tx)
  let eventInfo = parsedAddContentListAgreement.event.args
  let emittedContentListId = eventInfo._content listId.toNumber()

  assert.equal(emittedContentListId, content listId, 'Expected update event content listId to match input')
  let emittedAddedAgreementId = eventInfo._addedAgreementId.toNumber()

  assert.equal(emittedAddedAgreementId, addedAgreementId, 'Expected update event added agreement id to match input')

  // Validate storage content list value
  let isAgreementInContentList = await content listFactory.isAgreementInContentList.call(content listId, addedAgreementId)
  assert.isTrue(isAgreementInContentList, 'Expected newly added agreements to be in content list')
  return parsedAddContentListAgreement
}

export const deleteContentListAgreement = async (content listFactory, walletAddress, content listId, deletedAgreementId, deletedTimestamp) => {
  const nonce = signatureSchemas.getNonce()
  const chainId = getNetworkIdForContractInstance(content listFactory)
  const signatureData = signatureSchemas.generators.getDeleteContentListAgreementRequestData(chainId, content listFactory.address, content listId, deletedAgreementId, deletedTimestamp, nonce)

  const signature = await eth_signTypedData(walletAddress, signatureData)
  let tx = await content listFactory.deleteContentListAgreement(content listId, deletedAgreementId, deletedTimestamp, nonce, signature)

  let parsedDeleteContentListAgreement = parseTx(tx)
  let eventInfo = parsedDeleteContentListAgreement.event.args
  let emittedContentListId = eventInfo._content listId.toNumber()

  assert.equal(emittedContentListId, content listId, 'Expected update event content listId to match input')
  let emittedDeletedAgreementId = eventInfo._deletedAgreementId.toNumber()

  assert.equal(emittedDeletedAgreementId, deletedAgreementId, 'Expected update event added agreement id to match input')

  // Validate storage content list agreement value
  let isAgreementInContentList = await content listFactory.isAgreementInContentList.call(content listId, deletedAgreementId)
  assert.isFalse(isAgreementInContentList, 'Expected newly deleted agreements to not be in content list')

  return parsedDeleteContentListAgreement
}

export const addContentListSaveAndValidate = async (userLibraryFactory, userAddress, userId, content listId) => {
  const nonce = signatureSchemas.getNonce()

  // in testing use the network id as chain ID because chain ID is unavailable
  const chainId = getNetworkIdForContractInstance(userLibraryFactory)
  const signatureData = signatureSchemas.generators.getContentListSaveRequestData(chainId, userLibraryFactory.address, userId, content listId, nonce)

  const sig = await eth_signTypedData(userAddress, signatureData)
  let tx = await userLibraryFactory.addContentListSave(userId, content listId, nonce, sig)
  let parsedContentListSave = parseTx(tx)
  let eventInfo = parsedContentListSave.event.args

  assertEqualValues(parsedContentListSave, undefined, { _userId: eventInfo._userId, _content listId: eventInfo._content listId })
}

export const deleteContentListSaveAndValidate = async (userLibraryFactory, userAddress, userId, content listId) => {
  const nonce = signatureSchemas.getNonce()

  // in testing use the network id as chain ID because chain ID is unavailable
  const chainId = getNetworkIdForContractInstance(userLibraryFactory)
  const signatureData = signatureSchemas.generators.getDeleteContentListSaveRequestData(chainId, userLibraryFactory.address, userId, content listId, nonce)

  const sig = await eth_signTypedData(userAddress, signatureData)
  let tx = await userLibraryFactory.deleteContentListSave(userId, content listId, nonce, sig)
  let parsedContentListSave = parseTx(tx)
  let eventInfo = parsedContentListSave.event.args

  assertEqualValues(parsedContentListSave, undefined, { _userId: eventInfo._userId, _content listId: eventInfo._content listId })
}
