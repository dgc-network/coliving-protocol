const assert = require('assert')
let helpers = require('./helpers')
let {Utils} = require('../src/utils')

let colivingInstance = helpers.colivingInstance
let content listOwnerId

// First created content list
let content listId = 1

// Initial agreements
let content listAgreements = []

// Initial content list configuration
let initialContentListName = 'Test content list name'
let initialIsPrivate = false

before(async function () {
  await colivingInstance.init()
  content listOwnerId = (await colivingInstance.contracts.UserFactoryClient.addUser('content listH')).userId

  const cid = helpers.constants.agreementMetadataCID // test metadata stored in DHT
  const agreementMultihashDecoded = Utils.decodeMultihash(cid)
  content listAgreements.push((await colivingInstance.contracts.AgreementFactoryClient.addAgreement(
    content listOwnerId,
    agreementMultihashDecoded.digest,
    agreementMultihashDecoded.hashFn,
    agreementMultihashDecoded.size
  )).agreementId)
  content listAgreements.push((await colivingInstance.contracts.AgreementFactoryClient.addAgreement(
    content listOwnerId,
    agreementMultihashDecoded.digest,
    agreementMultihashDecoded.hashFn,
    agreementMultihashDecoded.size
  )).agreementId)
})

// TODO: Add validation to the below test cases, currently they just perform chain operations.

it('should create content list', async function () {
  const content listId = await colivingInstance.contracts.ContentListFactoryClient.createContentList(
    content listOwnerId,
    initialContentListName,
    initialIsPrivate,
    false,
    content listAgreements)
})

it('should create album', async function () {
  const content listId = await colivingInstance.contracts.ContentListFactoryClient.createContentList(
    content listOwnerId,
    initialContentListName,
    initialIsPrivate,
    true,
    content listAgreements)
})

it('should create and delete content list', async function () {
  // create content list
  const { content listId } = await colivingInstance.contracts.ContentListFactoryClient.createContentList(
    content listOwnerId,
    initialContentListName,
    initialIsPrivate,
    false,
    content listAgreements)

  // delete content list + validate
  const { content listId: deletedContentListId } = await colivingInstance.contracts.ContentListFactoryClient.deleteContentList(content listId)
  assert.strictEqual(content listId, deletedContentListId)
})

it('should add agreements to an existing content list', async function () {
  const cid = helpers.constants.agreementMetadataCID // test metadata stored in DHT
  const agreementMultihashDecoded = Utils.decodeMultihash(cid)

  // Add a new agreement
  const { agreementId } = await colivingInstance.contracts.AgreementFactoryClient.addAgreement(
    content listOwnerId,
    agreementMultihashDecoded.digest,
    agreementMultihashDecoded.hashFn,
    agreementMultihashDecoded.size
  )
  const agreement = await colivingInstance.contracts.AgreementFactoryClient.getAgreement(agreementId)
  assert.strictEqual(agreement.multihashDigest, agreementMultihashDecoded.digest)

  const addContentListAgreementTx = await colivingInstance.contracts.ContentListFactoryClient.addContentListAgreement(
    content listId,
    agreementId)
})

it('should delete agreement from an existing content list', async function () {
  const cid = helpers.constants.agreementMetadataCID // test metadata stored in DHT
  const agreementMultihashDecoded = Utils.decodeMultihash(cid)

  // Add a new agreement
  const { agreementId } = await colivingInstance.contracts.AgreementFactoryClient.addAgreement(
    content listOwnerId,
    agreementMultihashDecoded.digest,
    agreementMultihashDecoded.hashFn,
    agreementMultihashDecoded.size
  )
  const agreement = await colivingInstance.contracts.AgreementFactoryClient.getAgreement(agreementId)
  assert.strictEqual(agreement.multihashDigest, agreementMultihashDecoded.digest)

  const addContentListAgreementTx = await colivingInstance.contracts.ContentListFactoryClient.addContentListAgreement(
    content listId,
    agreementId)

  const deletedTimestamp = 1552008725
  // Delete the newly added agreement from the content list
  const deletedContentListAgreementTx = await colivingInstance.contracts.ContentListFactoryClient.deleteContentListAgreement(
    content listId,
    agreementId,
    deletedTimestamp)
})

it('should reorder agreements in an existing content list', async function () {
  content listAgreements.push(content listAgreements.shift()) // put first element at end
  const orderAgreementsTx = await colivingInstance.contracts.ContentListFactoryClient.orderContentListAgreements(
    content listId,
    content listAgreements)
})

it('should update content list privacy', async function () {
  const updatedPrivacy = false
  const updateContentListPrivacyTx = await colivingInstance.contracts.ContentListFactoryClient.updateContentListPrivacy(
    content listId,
    updatedPrivacy)
})

it('should update content list name', async function () {
  const updatedContentListName = 'Here is my updated content list name'
  const updateContentListNameTx = await colivingInstance.contracts.ContentListFactoryClient.updateContentListName(
    content listId,
    updatedContentListName)
})

it('should update content list cover photo', async function () {
  const cid = helpers.constants.agreementMetadataCID // test metadata stored in DHT
  const agreementMultihashDecoded = Utils.decodeMultihash(cid)
  const testPhotoDigest = agreementMultihashDecoded.digest
  const updateContentListCoverPhotoTx = await colivingInstance.contracts.ContentListFactoryClient.updateContentListCoverPhoto(
    content listId,
    testPhotoDigest)
})

it('should update content list description', async function () {
  const description = 'Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis'
  const updateContentListDescriptionTx = await colivingInstance.contracts.ContentListFactoryClient.updateContentListDescription(
    content listId,
    description)
})

it('should update content list UPC', async function () {
  const newUPC = '928152343234'
  const updateContentListUPC = await colivingInstance.contracts.ContentListFactoryClient.updateContentListUPC(content listId, newUPC)
})
