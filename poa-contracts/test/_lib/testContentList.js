/* global assert */

import {
  assertEqualValues, parseTx, parseTxWithResp } from '../utils/parser'
import { getNetworkIdForContractInstance } from '../utils/getters'
import { eth_signTypedData } from '../utils/util'
import { validateObj } from '../utils/validator'
import { web3New } from '../utils/web3New'

const signatureSchemas = require('../../signature_schemas/signatureSchemas')
export const addContentListAndValidate = async (contentListFactory, expectedContentListId, walletAddress, contentListOwnerId, contentListName, isPrivate, isAlbum, agreementIds) => {
  const nonce = signatureSchemas.getNonce()
  const chainId = getNetworkIdForContractInstance(contentListFactory)

  // agreementIdsHash calculated by hashing encoded agreementIds[]

  // required to generate signed/typed signature below
  let agreementIdsHash = web3New.utils.soliditySha3(web3New.eth.abi.encodeParameter('uint[]', agreementIds))
  const signatureData = signatureSchemas.generators.getCreateContentListRequestData(chainId, contentListFactory.address, contentListOwnerId, contentListName, isPrivate, isAlbum, agreementIdsHash, nonce)

  const signature = await eth_signTypedData(walletAddress, signatureData)
  let tx = await contentListFactory.createContentList(contentListOwnerId, contentListName, isPrivate, isAlbum, agreementIds, nonce, signature)

  let parsedCreateContentList = parseTx(tx)
  let parsedCreateContentListName = tx.logs[1].args._updatedContentListName
  let eventInfo = parsedCreateContentList.event.args
  let returnedContentListId = eventInfo._content_listId
  assert.equal(returnedContentListId, expectedContentListId, 'Expected contentList id does not match')
  let emittedContentListId = eventInfo._content_listId.toNumber()

  assert.equal(emittedContentListId, expectedContentListId, 'Expected update event contentListId array to match expected')
  let emittedEventPrivacy = eventInfo._isPrivate
  assert.equal(emittedEventPrivacy, isPrivate, 'Expected emitted contentList privacy to equal input')
  let emittedEventContentListName = parsedCreateContentListName
  assert.equal(contentListName, emittedEventContentListName, 'Expected emitted contentList name to equal input')
  let emittedEventIsAlbum = eventInfo._isAlbum
  assert.equal(isAlbum, emittedEventIsAlbum, 'Expected emitted album status to equal input')

  // Assert on agreement id array
  let emittedAgreementIds = eventInfo._agreementIds
  for (let i = 0; i < emittedAgreementIds.length; i++) {
    let emittedAgreementId = emittedAgreementIds[i].toNumber()

    assert.equal(emittedAgreementId, agreementIds[i], 'Expected ordered event agreementId to match input')
  }

  // Validate storage contentList contents
  for (let i = 0; i < agreementIds; i++) {
    let isAgreementInContentList = await contentListFactory.isAgreementInContentList.call(expectedContentListId, agreementIds[i])
    assert.equal(isAgreementInContentList, true, 'Expected all agreements to be added to contentList')
  }
}

export const deleteContentListAndValidate = async (contentListFactory, walletAddress, contentListId) => {
  const nonce = signatureSchemas.getNonce()
  const chainId = getNetworkIdForContractInstance(contentListFactory)
  const signatureData = signatureSchemas.generators.getDeleteContentListRequestData(chainId, contentListFactory.address, contentListId, nonce)

  const sig = await eth_signTypedData(walletAddress, signatureData)

  // call delete contentList from chain
  let tx = await contentListFactory.deleteContentList(contentListId, nonce, sig)

  // validate event output = transaction input
  let event = parseTxWithResp(tx, { _content_listId: true })
  validateObj(event, { eventName: 'ContentListDeleted', contentListId })

  // TODO - after storage implemented - attempt to retrieve contentList from chain

  // TODO - after storage implemented - validate contentList does not exist

  return {
    event: event
  }
}

export const orderContentListAgreementsAndValidate = async (contentListFactory, walletAddress, contentListId, agreementIds) => {
  const nonce = signatureSchemas.getNonce()
  const chainId = getNetworkIdForContractInstance(contentListFactory)

  // agreementIdsHash calculated by hashing encoded agreementIds[]

  // required to generate signed/typed signature below
  let agreementIdsHash = web3New.utils.soliditySha3(web3New.eth.abi.encodeParameter('uint[]', agreementIds))
  const signatureData = signatureSchemas.generators.getOrderContentListAgreementsRequestData(chainId, contentListFactory.address, contentListId, agreementIdsHash, nonce)

  const signature = await eth_signTypedData(walletAddress, signatureData)
  let tx = await contentListFactory.orderContentListAgreements(contentListId, agreementIds, nonce, signature)

  let parsedOrderContentListAgreements = parseTx(tx)
  let eventInfo = parsedOrderContentListAgreements.event.args
  let emittedContentListId = eventInfo._content_listId.toNumber()

  assert.equal(emittedContentListId, contentListId, 'Expected update event contentListId array to match input')
  let emittedAgreementIds = eventInfo._orderedAgreementIds
  assert.equal(emittedAgreementIds.length, agreementIds.length, 'Expected ordered event agreementId array to match input')
  for (let i = 0; i < emittedAgreementIds.length; i++) {
    let emittedAgreementId = emittedAgreementIds[i].toNumber()

    assert.equal(emittedAgreementId, agreementIds[i], 'Expected ordered event agreementId to match input')
  }

  return parsedOrderContentListAgreements
}

export const updateContentListPrivacyAndValidate = async (contentListFactory, walletAddress, contentListId, updatedContentListPrivacy) => {
  const nonce = signatureSchemas.getNonce()
  const chainId = getNetworkIdForContractInstance(contentListFactory)
  const signatureData = signatureSchemas.generators.getUpdateContentListPrivacyRequestData(chainId, contentListFactory.address, contentListId, updatedContentListPrivacy, nonce)

  const signature = await eth_signTypedData(walletAddress, signatureData)
  let tx = await contentListFactory.updateContentListPrivacy(contentListId, updatedContentListPrivacy, nonce, signature)

  let parsedUpdateContentListPrivacy = parseTx(tx)
  let eventInfo = parsedUpdateContentListPrivacy.event.args
  let emittedContentListId = eventInfo._content_listId.toNumber()

  assert.equal(emittedContentListId, contentListId, 'Expected update event contentListId array to match input')
  let emittedEventPrivacy = eventInfo._updatedIsPrivate
  assert.equal(emittedEventPrivacy, updatedContentListPrivacy, 'Expected emitted contentList privacy to equal input')

  return parsedUpdateContentListPrivacy
}

export const updateContentListNameAndValidate = async (contentListFactory, walletAddress, contentListId, updatedContentListName) => {
  const nonce = signatureSchemas.getNonce()
  const chainId = getNetworkIdForContractInstance(contentListFactory)
  const signatureData = signatureSchemas.generators.getUpdateContentListNameRequestData(chainId, contentListFactory.address, contentListId, updatedContentListName, nonce)

  const signature = await eth_signTypedData(walletAddress, signatureData)
  let tx = await contentListFactory.updateContentListName(contentListId, updatedContentListName, nonce, signature)

  let parsedUpdateContentListName = parseTx(tx)
  let eventInfo = parsedUpdateContentListName.event.args
  let emittedContentListId = eventInfo._content_listId.toNumber()

  assert.equal(emittedContentListId, contentListId, 'Expected update event contentListId array to match input')
  let emittedEventContentListName = eventInfo._updatedContentListName
  assert.equal(updatedContentListName, emittedEventContentListName, 'Expected emitted contentList name to equal input')
}

export const updateContentListCoverPhotoAndValidate = async (contentListFactory, walletAddress, contentListId, updatedContentListImageMultihashDigest) => {
  const nonce = signatureSchemas.getNonce()
  const chainId = getNetworkIdForContractInstance(contentListFactory)
  const signatureData = signatureSchemas.generators.getUpdateContentListCoverPhotoRequestData(chainId, contentListFactory.address, contentListId, updatedContentListImageMultihashDigest, nonce)

  const signature = await eth_signTypedData(walletAddress, signatureData)
  let tx = await contentListFactory.updateContentListCoverPhoto(contentListId, updatedContentListImageMultihashDigest, nonce, signature)

  let parsedUpdateContentListCoverPhoto = parseTx(tx)
  let eventInfo = parsedUpdateContentListCoverPhoto.event.args
  let emittedImageMultihash = eventInfo._content_listImageMultihashDigest
  assert.equal(emittedImageMultihash, updatedContentListImageMultihashDigest, 'Expect emitted image multihash to equal input')
}

export const updateContentListUPCAndValidate = async (contentListFactory, walletAddress, contentListId, updatedContentListUPC) => {
  const nonce = signatureSchemas.getNonce()
  const chainId = getNetworkIdForContractInstance(contentListFactory)
  const signatureData = signatureSchemas.generators.getUpdateContentListUPCRequestData(chainId, contentListFactory.address, contentListId, updatedContentListUPC, nonce)

  const signature = await eth_signTypedData(walletAddress, signatureData)
  let tx = await contentListFactory.updateContentListUPC(contentListId, updatedContentListUPC, nonce, signature)

  let parseUpdateContentListUPC = parseTx(tx)
  let emittedContentListUPC = (parseUpdateContentListUPC.event.args._content_listUPC)
  let paddedInputUPC = web3New.utils.padRight(updatedContentListUPC, 64)
  assert.equal(emittedContentListUPC, paddedInputUPC, 'Expect emitted UPC to equal input')
}

export const updateContentListDescriptionAndValidate = async (contentListFactory, walletAddress, contentListId, updatedContentListDescription) => {
  const nonce = signatureSchemas.getNonce()
  const chainId = getNetworkIdForContractInstance(contentListFactory)
  const signatureData = signatureSchemas.generators.getUpdateContentListDescriptionRequestData(chainId, contentListFactory.address, contentListId, updatedContentListDescription, nonce)

  const signature = await eth_signTypedData(walletAddress, signatureData)
  let tx = await contentListFactory.updateContentListDescription(contentListId, updatedContentListDescription, nonce, signature)

  let parsedUpdateContentListDescription = parseTx(tx)
  let eventInfo = parsedUpdateContentListDescription.event.args
  let emittedContentListDescription = eventInfo._content_listDescription

  assert.equal(emittedContentListDescription, updatedContentListDescription, 'Expect emitted contentList description to equal input')
}

/** Adds contentListRepost to blockchain using function input fields, validates emitted event
  * @returns {object} with event data
  */
export const addContentListRepostAndValidate = async (socialFeatureFactory, userAddress, userId, contentListId) => {
  // generate new add contentList repost request
  const nonce = signatureSchemas.getNonce()
  const chainId = getNetworkIdForContractInstance(socialFeatureFactory)
  // in testing use the network id as chain ID because chain ID is unavailable
  const signatureData = signatureSchemas.generators.getAddContentListRepostRequestData(chainId, socialFeatureFactory.address, userId, contentListId, nonce)

  const sig = await eth_signTypedData(userAddress, signatureData)

  // add new contentListRepost to chain
  let tx = await socialFeatureFactory.addContentListRepost(userId, contentListId, nonce, sig)

  // validate event output = transaction input
  let event = parseTxWithResp(tx, { _userId: true, _content_listId: true })
  validateObj(event, { eventName: 'ContentListRepostAdded', userId, contentListId })

  // validate storage
  let isContentListReposted = await socialFeatureFactory.userRepostedContentList.call(userId, contentListId)
  assert.isTrue(isContentListReposted, 'Expect storage to confirm added contentList repost')

  return {
    event: event
  }
}

/** deletes contentListRepost from blockchain using function input fields, validates emitted event
  * @returns {object} with event data
  */
export const deleteContentListRepostAndValidate = async (socialFeatureFactory, userAddress, userId, contentListId) => {
  // generate delete contentList repost request
  const nonce = signatureSchemas.getNonce()
  const chainId = getNetworkIdForContractInstance(socialFeatureFactory) // in testing use the network id as chain ID because chain ID is unavailable
  const signatureData = signatureSchemas.generators.getDeleteContentListRepostRequestData(chainId, socialFeatureFactory.address, userId, contentListId, nonce)

  const sig = await eth_signTypedData(userAddress, signatureData)

  // delete contentListRepost from chain
  let tx = await socialFeatureFactory.deleteContentListRepost(userId, contentListId, nonce, sig)

  // validate event output = transaction input
  let event = parseTxWithResp(tx, { _userId: true, _content_listId: true })
  validateObj(event, { eventName: 'ContentListRepostDeleted', userId, contentListId })

  // validate storage
  let isContentListReposted = await socialFeatureFactory.userRepostedContentList.call(userId, contentListId)
  assert.isFalse(isContentListReposted, 'Expect storage to confirm deleted contentList repost')

  return {
    event: event
  }
}

export const addContentListAgreement = async (contentListFactory, walletAddress, contentListId, addedAgreementId) => {
  const nonce = signatureSchemas.getNonce()
  const chainId = getNetworkIdForContractInstance(contentListFactory)
  const signatureData = signatureSchemas.generators.getAddContentListAgreementRequestData(chainId, contentListFactory.address, contentListId, addedAgreementId, nonce)

  const signature = await eth_signTypedData(walletAddress, signatureData)
  let tx = await contentListFactory.addContentListAgreement(contentListId, addedAgreementId, nonce, signature)

  // TODO:  asserts
  let parsedAddContentListAgreement = parseTx(tx)
  let eventInfo = parsedAddContentListAgreement.event.args
  let emittedContentListId = eventInfo._content_listId.toNumber()

  assert.equal(emittedContentListId, contentListId, 'Expected update event contentListId to match input')
  let emittedAddedAgreementId = eventInfo._addedAgreementId.toNumber()

  assert.equal(emittedAddedAgreementId, addedAgreementId, 'Expected update event added agreement id to match input')

  // Validate storage contentList value
  let isAgreementInContentList = await contentListFactory.isAgreementInContentList.call(contentListId, addedAgreementId)
  assert.isTrue(isAgreementInContentList, 'Expected newly added agreements to be in contentList')
  return parsedAddContentListAgreement
}

export const deleteContentListAgreement = async (contentListFactory, walletAddress, contentListId, deletedAgreementId, deletedTimestamp) => {
  const nonce = signatureSchemas.getNonce()
  const chainId = getNetworkIdForContractInstance(contentListFactory)
  const signatureData = signatureSchemas.generators.getDeleteContentListAgreementRequestData(chainId, contentListFactory.address, contentListId, deletedAgreementId, deletedTimestamp, nonce)

  const signature = await eth_signTypedData(walletAddress, signatureData)
  let tx = await contentListFactory.deleteContentListAgreement(contentListId, deletedAgreementId, deletedTimestamp, nonce, signature)

  let parsedDeleteContentListAgreement = parseTx(tx)
  let eventInfo = parsedDeleteContentListAgreement.event.args
  let emittedContentListId = eventInfo._content_listId.toNumber()

  assert.equal(emittedContentListId, contentListId, 'Expected update event contentListId to match input')
  let emittedDeletedAgreementId = eventInfo._deletedAgreementId.toNumber()

  assert.equal(emittedDeletedAgreementId, deletedAgreementId, 'Expected update event added agreement id to match input')

  // Validate storage contentList agreement value
  let isAgreementInContentList = await contentListFactory.isAgreementInContentList.call(contentListId, deletedAgreementId)
  assert.isFalse(isAgreementInContentList, 'Expected newly deleted agreements to not be in contentList')

  return parsedDeleteContentListAgreement
}

export const addContentListSaveAndValidate = async (userLibraryFactory, userAddress, userId, contentListId) => {
  const nonce = signatureSchemas.getNonce()

  // in testing use the network id as chain ID because chain ID is unavailable
  const chainId = getNetworkIdForContractInstance(userLibraryFactory)
  const signatureData = signatureSchemas.generators.getContentListSaveRequestData(chainId, userLibraryFactory.address, userId, contentListId, nonce)

  const sig = await eth_signTypedData(userAddress, signatureData)
  let tx = await userLibraryFactory.addContentListSave(userId, contentListId, nonce, sig)
  let parsedContentListSave = parseTx(tx)
  let eventInfo = parsedContentListSave.event.args

  assertEqualValues(parsedContentListSave, undefined, { _userId: eventInfo._userId, _content_listId: eventInfo._content_listId })
}

export const deleteContentListSaveAndValidate = async (userLibraryFactory, userAddress, userId, contentListId) => {
  const nonce = signatureSchemas.getNonce()

  // in testing use the network id as chain ID because chain ID is unavailable
  const chainId = getNetworkIdForContractInstance(userLibraryFactory)
  const signatureData = signatureSchemas.generators.getDeleteContentListSaveRequestData(chainId, userLibraryFactory.address, userId, contentListId, nonce)

  const sig = await eth_signTypedData(userAddress, signatureData)
  let tx = await userLibraryFactory.deleteContentListSave(userId, contentListId, nonce, sig)
  let parsedContentListSave = parseTx(tx)
  let eventInfo = parsedContentListSave.event.args

  assertEqualValues(parsedContentListSave, undefined, { _userId: eventInfo._userId, _content_listId: eventInfo._content_listId })
}
