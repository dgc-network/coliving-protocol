const assert = require('assert')
let helpers = require('./helpers')
let {Utils} = require('../src/utils')

let colivingInstance = helpers.colivingInstance
let contentListOwnerId

// First created contentList
let contentListId = 1

// Initial agreements
let contentListAgreements = []

// Initial contentList configuration
let initialContentListName = 'Test contentList name'
let initialIsPrivate = false

before(async function () {
  await colivingInstance.init()
  contentListOwnerId = (await colivingInstance.contracts.UserFactoryClient.addUser('contentListH')).userId

  const cid = helpers.constants.agreementMetadataCID // test metadata stored in DHT
  const agreementMultihashDecoded = Utils.decodeMultihash(cid)
  contentListAgreements.push((await colivingInstance.contracts.AgreementFactoryClient.addAgreement(
    contentListOwnerId,
    agreementMultihashDecoded.digest,
    agreementMultihashDecoded.hashFn,
    agreementMultihashDecoded.size
  )).agreementId)
  contentListAgreements.push((await colivingInstance.contracts.AgreementFactoryClient.addAgreement(
    contentListOwnerId,
    agreementMultihashDecoded.digest,
    agreementMultihashDecoded.hashFn,
    agreementMultihashDecoded.size
  )).agreementId)
})

// TODO: Add validation to the below test cases, currently they just perform chain operations.

it('should create contentList', async function () {
  const contentListId = await colivingInstance.contracts.ContentListFactoryClient.createContentList(
    contentListOwnerId,
    initialContentListName,
    initialIsPrivate,
    false,
    contentListAgreements)
})

it('should create album', async function () {
  const contentListId = await colivingInstance.contracts.ContentListFactoryClient.createContentList(
    contentListOwnerId,
    initialContentListName,
    initialIsPrivate,
    true,
    contentListAgreements)
})

it('should create and delete contentList', async function () {
  // create contentList
  const { contentListId } = await colivingInstance.contracts.ContentListFactoryClient.createContentList(
    contentListOwnerId,
    initialContentListName,
    initialIsPrivate,
    false,
    contentListAgreements)

  // delete contentList + validate
  const { contentListId: deletedContentListId } = await colivingInstance.contracts.ContentListFactoryClient.deleteContentList(contentListId)
  assert.strictEqual(contentListId, deletedContentListId)
})

it('should add agreements to an existing contentList', async function () {
  const cid = helpers.constants.agreementMetadataCID // test metadata stored in DHT
  const agreementMultihashDecoded = Utils.decodeMultihash(cid)

  // Add a new digital_content
  const { agreementId } = await colivingInstance.contracts.AgreementFactoryClient.addAgreement(
    contentListOwnerId,
    agreementMultihashDecoded.digest,
    agreementMultihashDecoded.hashFn,
    agreementMultihashDecoded.size
  )
  const digital_content = await colivingInstance.contracts.AgreementFactoryClient.getAgreement(agreementId)
  assert.strictEqual(digital_content.multihashDigest, agreementMultihashDecoded.digest)

  const addContentListAgreementTx = await colivingInstance.contracts.ContentListFactoryClient.addContentListAgreement(
    contentListId,
    agreementId)
})

it('should delete digital_content from an existing contentList', async function () {
  const cid = helpers.constants.agreementMetadataCID // test metadata stored in DHT
  const agreementMultihashDecoded = Utils.decodeMultihash(cid)

  // Add a new digital_content
  const { agreementId } = await colivingInstance.contracts.AgreementFactoryClient.addAgreement(
    contentListOwnerId,
    agreementMultihashDecoded.digest,
    agreementMultihashDecoded.hashFn,
    agreementMultihashDecoded.size
  )
  const digital_content = await colivingInstance.contracts.AgreementFactoryClient.getAgreement(agreementId)
  assert.strictEqual(digital_content.multihashDigest, agreementMultihashDecoded.digest)

  const addContentListAgreementTx = await colivingInstance.contracts.ContentListFactoryClient.addContentListAgreement(
    contentListId,
    agreementId)

  const deletedTimestamp = 1552008725
  // Delete the newly added digital_content from the contentList
  const deletedContentListAgreementTx = await colivingInstance.contracts.ContentListFactoryClient.deleteContentListAgreement(
    contentListId,
    agreementId,
    deletedTimestamp)
})

it('should reorder agreements in an existing contentList', async function () {
  contentListAgreements.push(contentListAgreements.shift()) // put first element at end
  const orderAgreementsTx = await colivingInstance.contracts.ContentListFactoryClient.orderContentListAgreements(
    contentListId,
    contentListAgreements)
})

it('should update contentList privacy', async function () {
  const updatedPrivacy = false
  const updateContentListPrivacyTx = await colivingInstance.contracts.ContentListFactoryClient.updateContentListPrivacy(
    contentListId,
    updatedPrivacy)
})

it('should update contentList name', async function () {
  const updatedContentListName = 'Here is my updated contentList name'
  const updateContentListNameTx = await colivingInstance.contracts.ContentListFactoryClient.updateContentListName(
    contentListId,
    updatedContentListName)
})

it('should update contentList cover photo', async function () {
  const cid = helpers.constants.agreementMetadataCID // test metadata stored in DHT
  const agreementMultihashDecoded = Utils.decodeMultihash(cid)
  const testPhotoDigest = agreementMultihashDecoded.digest
  const updateContentListCoverPhotoTx = await colivingInstance.contracts.ContentListFactoryClient.updateContentListCoverPhoto(
    contentListId,
    testPhotoDigest)
})

it('should update contentList description', async function () {
  const description = 'Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis'
  const updateContentListDescriptionTx = await colivingInstance.contracts.ContentListFactoryClient.updateContentListDescription(
    contentListId,
    description)
})

it('should update contentList UPC', async function () {
  const newUPC = '928152343234'
  const updateContentListUPC = await colivingInstance.contracts.ContentListFactoryClient.updateContentListUPC(contentListId, newUPC)
})
