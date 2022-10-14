/* global assert */

import {
  assertEqualValues, parseTx, parseTxWithResp } from '../utils/parser'
import { getNetworkIdForContractInstance } from '../utils/getters'
import { eth_signTypedData } from '../utils/util'
import { validateObj } from '../utils/validator'
import { web3New } from '../utils/web3New'

const signatureSchemas = require('../../signatureSchemas/signatureSchemas')
export const addContentListAndValidate = async (contentListFactory, expectedContentListId, walletAddress, contentListOwnerId, contentListName, isPrivate, isAlbum, digitalContentIds) => {
  const nonce = signatureSchemas.getNonce()
  const chainId = getNetworkIdForContractInstance(contentListFactory)

  // digitalContentIdsHash calculated by hashing encoded digitalContentIds[]

  // required to generate signed/typed signature below
  let digitalContentIdsHash = web3New.utils.soliditySha3(web3New.eth.abi.encodeParameter('uint[]', digitalContentIds))
  const signatureData = signatureSchemas.generators.getCreateContentListRequestData(chainId, contentListFactory.address, contentListOwnerId, contentListName, isPrivate, isAlbum, digitalContentIdsHash, nonce)

  const signature = await eth_signTypedData(walletAddress, signatureData)
  let tx = await contentListFactory.createContentList(contentListOwnerId, contentListName, isPrivate, isAlbum, digitalContentIds, nonce, signature)

  let parsedCreateContentList = parseTx(tx)
  let parsedCreateContentListName = tx.logs[1].args._updatedContentListName
  let eventInfo = parsedCreateContentList.event.args
  let returnedContentListId = eventInfo._contentListId
  assert.equal(returnedContentListId, expectedContentListId, 'Expected contentList id does not match')
  let emittedContentListId = eventInfo._contentListId.toNumber()

  assert.equal(emittedContentListId, expectedContentListId, 'Expected update event contentListId array to match expected')
  let emittedEventPrivacy = eventInfo._isPrivate
  assert.equal(emittedEventPrivacy, isPrivate, 'Expected emitted contentList privacy to equal input')
  let emittedEventContentListName = parsedCreateContentListName
  assert.equal(contentListName, emittedEventContentListName, 'Expected emitted contentList name to equal input')
  let emittedEventIsAlbum = eventInfo._isAlbum
  assert.equal(isAlbum, emittedEventIsAlbum, 'Expected emitted album status to equal input')

  // Assert on digital_content id array
  let emittedDigitalContentIds = eventInfo._digitalContentIds
  for (let i = 0; i < emittedDigitalContentIds.length; i++) {
    let emittedDigitalContentId = emittedDigitalContentIds[i].toNumber()

    assert.equal(emittedDigitalContentId, digitalContentIds[i], 'Expected ordered event digitalContentId to match input')
  }

  // Validate storage contentList contents
  for (let i = 0; i < digitalContentIds; i++) {
    let isDigitalContentInContentList = await contentListFactory.isDigitalContentInContentList.call(expectedContentListId, digitalContentIds[i])
    assert.equal(isDigitalContentInContentList, true, 'Expected all digitalContents to be added to contentList')
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
  let event = parseTxWithResp(tx, { _contentListId: true })
  validateObj(event, { eventName: 'ContentListDeleted', contentListId })

  // TODO - after storage implemented - attempt to retrieve contentList from chain

  // TODO - after storage implemented - validate contentList does not exist

  return {
    event: event
  }
}

export const orderContentListDigitalContentsAndValidate = async (contentListFactory, walletAddress, contentListId, digitalContentIds) => {
  const nonce = signatureSchemas.getNonce()
  const chainId = getNetworkIdForContractInstance(contentListFactory)

  // digitalContentIdsHash calculated by hashing encoded digitalContentIds[]

  // required to generate signed/typed signature below
  let digitalContentIdsHash = web3New.utils.soliditySha3(web3New.eth.abi.encodeParameter('uint[]', digitalContentIds))
  const signatureData = signatureSchemas.generators.getOrderContentListDigitalContentsRequestData(chainId, contentListFactory.address, contentListId, digitalContentIdsHash, nonce)

  const signature = await eth_signTypedData(walletAddress, signatureData)
  let tx = await contentListFactory.orderContentListDigitalContents(contentListId, digitalContentIds, nonce, signature)

  let parsedOrderContentListDigitalContents = parseTx(tx)
  let eventInfo = parsedOrderContentListDigitalContents.event.args
  let emittedContentListId = eventInfo._contentListId.toNumber()

  assert.equal(emittedContentListId, contentListId, 'Expected update event contentListId array to match input')
  let emittedDigitalContentIds = eventInfo._orderedDigitalContentIds
  assert.equal(emittedDigitalContentIds.length, digitalContentIds.length, 'Expected ordered event digitalContentId array to match input')
  for (let i = 0; i < emittedDigitalContentIds.length; i++) {
    let emittedDigitalContentId = emittedDigitalContentIds[i].toNumber()

    assert.equal(emittedDigitalContentId, digitalContentIds[i], 'Expected ordered event digitalContentId to match input')
  }

  return parsedOrderContentListDigitalContents
}

export const updateContentListPrivacyAndValidate = async (contentListFactory, walletAddress, contentListId, updatedContentListPrivacy) => {
  const nonce = signatureSchemas.getNonce()
  const chainId = getNetworkIdForContractInstance(contentListFactory)
  const signatureData = signatureSchemas.generators.getUpdateContentListPrivacyRequestData(chainId, contentListFactory.address, contentListId, updatedContentListPrivacy, nonce)

  const signature = await eth_signTypedData(walletAddress, signatureData)
  let tx = await contentListFactory.updateContentListPrivacy(contentListId, updatedContentListPrivacy, nonce, signature)

  let parsedUpdateContentListPrivacy = parseTx(tx)
  let eventInfo = parsedUpdateContentListPrivacy.event.args
  let emittedContentListId = eventInfo._contentListId.toNumber()

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
  let emittedContentListId = eventInfo._contentListId.toNumber()

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
  let emittedImageMultihash = eventInfo._contentListImageMultihashDigest
  assert.equal(emittedImageMultihash, updatedContentListImageMultihashDigest, 'Expect emitted image multihash to equal input')
}

export const updateContentListUPCAndValidate = async (contentListFactory, walletAddress, contentListId, updatedContentListUPC) => {
  const nonce = signatureSchemas.getNonce()
  const chainId = getNetworkIdForContractInstance(contentListFactory)
  const signatureData = signatureSchemas.generators.getUpdateContentListUPCRequestData(chainId, contentListFactory.address, contentListId, updatedContentListUPC, nonce)

  const signature = await eth_signTypedData(walletAddress, signatureData)
  let tx = await contentListFactory.updateContentListUPC(contentListId, updatedContentListUPC, nonce, signature)

  let parseUpdateContentListUPC = parseTx(tx)
  let emittedContentListUPC = (parseUpdateContentListUPC.event.args._contentListUPC)
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
  let emittedContentListDescription = eventInfo._contentListDescription

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
  let event = parseTxWithResp(tx, { _userId: true, _contentListId: true })
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
  let event = parseTxWithResp(tx, { _userId: true, _contentListId: true })
  validateObj(event, { eventName: 'ContentListRepostDeleted', userId, contentListId })

  // validate storage
  let isContentListReposted = await socialFeatureFactory.userRepostedContentList.call(userId, contentListId)
  assert.isFalse(isContentListReposted, 'Expect storage to confirm deleted contentList repost')

  return {
    event: event
  }
}

export const addContentListDigitalContent = async (contentListFactory, walletAddress, contentListId, addedDigitalContentId) => {
  const nonce = signatureSchemas.getNonce()
  const chainId = getNetworkIdForContractInstance(contentListFactory)
  const signatureData = signatureSchemas.generators.getAddContentListDigitalContentRequestData(chainId, contentListFactory.address, contentListId, addedDigitalContentId, nonce)

  const signature = await eth_signTypedData(walletAddress, signatureData)
  let tx = await contentListFactory.addContentListDigitalContent(contentListId, addedDigitalContentId, nonce, signature)

  // TODO:  asserts
  let parsedAddContentListDigitalContent = parseTx(tx)
  let eventInfo = parsedAddContentListDigitalContent.event.args
  let emittedContentListId = eventInfo._contentListId.toNumber()

  assert.equal(emittedContentListId, contentListId, 'Expected update event contentListId to match input')
  let emittedAddedDigitalContentId = eventInfo._addedDigitalContentId.toNumber()

  assert.equal(emittedAddedDigitalContentId, addedDigitalContentId, 'Expected update event added digital_content id to match input')

  // Validate storage contentList value
  let isDigitalContentInContentList = await contentListFactory.isDigitalContentInContentList.call(contentListId, addedDigitalContentId)
  assert.isTrue(isDigitalContentInContentList, 'Expected newly added digitalContents to be in contentList')
  return parsedAddContentListDigitalContent
}

export const deleteContentListDigitalContent = async (contentListFactory, walletAddress, contentListId, deletedDigitalContentId, deletedTimestamp) => {
  const nonce = signatureSchemas.getNonce()
  const chainId = getNetworkIdForContractInstance(contentListFactory)
  const signatureData = signatureSchemas.generators.getDeleteContentListDigitalContentRequestData(chainId, contentListFactory.address, contentListId, deletedDigitalContentId, deletedTimestamp, nonce)

  const signature = await eth_signTypedData(walletAddress, signatureData)
  let tx = await contentListFactory.deleteContentListDigitalContent(contentListId, deletedDigitalContentId, deletedTimestamp, nonce, signature)

  let parsedDeleteContentListDigitalContent = parseTx(tx)
  let eventInfo = parsedDeleteContentListDigitalContent.event.args
  let emittedContentListId = eventInfo._contentListId.toNumber()

  assert.equal(emittedContentListId, contentListId, 'Expected update event contentListId to match input')
  let emittedDeletedDigitalContentId = eventInfo._deletedDigitalContentId.toNumber()

  assert.equal(emittedDeletedDigitalContentId, deletedDigitalContentId, 'Expected update event added digital_content id to match input')

  // Validate storage contentList digital_content value
  let isDigitalContentInContentList = await contentListFactory.isDigitalContentInContentList.call(contentListId, deletedDigitalContentId)
  assert.isFalse(isDigitalContentInContentList, 'Expected newly deleted digitalContents to not be in contentList')

  return parsedDeleteContentListDigitalContent
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

  assertEqualValues(parsedContentListSave, undefined, { _userId: eventInfo._userId, _contentListId: eventInfo._contentListId })
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

  assertEqualValues(parsedContentListSave, undefined, { _userId: eventInfo._userId, _contentListId: eventInfo._contentListId })
}
