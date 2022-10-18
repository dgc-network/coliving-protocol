const assert = require('assert')
let helpers = require('./helpers')
let {Utils} = require('../src/utils')

let colivingInstance = helpers.colivingInstance
let contentListOwnerId

// First created contentList
let contentListId = 1

// Initial digitalContents
let contentListDigitalContents = []

// Initial contentList configuration
let initialContentListName = 'Test content list name'
let initialIsPrivate = false

before(async function () {
  await colivingInstance.init()
  contentListOwnerId = (await colivingInstance.contracts.UserFactoryClient.addUser('contentListH')).userId

  const cid = helpers.constants.digitalContentMetadataCID // test metadata stored in DHT
  const digitalContentMultihashDecoded = Utils.decodeMultihash(cid)
  contentListDigitalContents.push((await colivingInstance.contracts.DigitalContentFactoryClient.addDigitalContent(
    contentListOwnerId,
    digitalContentMultihashDecoded.digest,
    digitalContentMultihashDecoded.hashFn,
    digitalContentMultihashDecoded.size
  )).digitalContentId)
  contentListDigitalContents.push((await colivingInstance.contracts.DigitalContentFactoryClient.addDigitalContent(
    contentListOwnerId,
    digitalContentMultihashDecoded.digest,
    digitalContentMultihashDecoded.hashFn,
    digitalContentMultihashDecoded.size
  )).digitalContentId)
})

// TODO: Add validation to the below test cases, currently they just perform chain operations.

it('should create content list', async function () {
  const contentListId = await colivingInstance.contracts.ContentListFactoryClient.createContentList(
    contentListOwnerId,
    initialContentListName,
    initialIsPrivate,
    false,
    contentListDigitalContents)
})

it('should create album', async function () {
  const contentListId = await colivingInstance.contracts.ContentListFactoryClient.createContentList(
    contentListOwnerId,
    initialContentListName,
    initialIsPrivate,
    true,
    contentListDigitalContents)
})

it('should create and delete content list', async function () {
  // create contentList
  const { contentListId } = await colivingInstance.contracts.ContentListFactoryClient.createContentList(
    contentListOwnerId,
    initialContentListName,
    initialIsPrivate,
    false,
    contentListDigitalContents)

  // delete contentList + validate
  const { contentListId: deletedContentListId } = await colivingInstance.contracts.ContentListFactoryClient.deleteContentList(contentListId)
  assert.strictEqual(contentListId, deletedContentListId)
})

it('should add digitalContents to an existing content list', async function () {
  const cid = helpers.constants.digitalContentMetadataCID // test metadata stored in DHT
  const digitalContentMultihashDecoded = Utils.decodeMultihash(cid)

  // Add a new digital_content
  const { digitalContentId } = await colivingInstance.contracts.DigitalContentFactoryClient.addDigitalContent(
    contentListOwnerId,
    digitalContentMultihashDecoded.digest,
    digitalContentMultihashDecoded.hashFn,
    digitalContentMultihashDecoded.size
  )
  const digital_content = await colivingInstance.contracts.DigitalContentFactoryClient.getDigitalContent(digitalContentId)
  assert.strictEqual(digital_content.multihashDigest, digitalContentMultihashDecoded.digest)

  const addContentListDigitalContentTx = await colivingInstance.contracts.ContentListFactoryClient.addContentListDigitalContent(
    contentListId,
    digitalContentId)
})

it('should delete digital content from an existing content list', async function () {
  const cid = helpers.constants.digitalContentMetadataCID // test metadata stored in DHT
  const digitalContentMultihashDecoded = Utils.decodeMultihash(cid)

  // Add a new digital_content
  const { digitalContentId } = await colivingInstance.contracts.DigitalContentFactoryClient.addDigitalContent(
    contentListOwnerId,
    digitalContentMultihashDecoded.digest,
    digitalContentMultihashDecoded.hashFn,
    digitalContentMultihashDecoded.size
  )
  const digital_content = await colivingInstance.contracts.DigitalContentFactoryClient.getDigitalContent(digitalContentId)
  assert.strictEqual(digital_content.multihashDigest, digitalContentMultihashDecoded.digest)

  const addContentListDigitalContentTx = await colivingInstance.contracts.ContentListFactoryClient.addContentListDigitalContent(
    contentListId,
    digitalContentId)

  const deletedTimestamp = 1552008725
  // Delete the newly added digital_content from the contentList
  const deletedContentListDigitalContentTx = await colivingInstance.contracts.ContentListFactoryClient.deleteContentListDigitalContent(
    contentListId,
    digitalContentId,
    deletedTimestamp)
})

it('should reorder digitalContents in an existing content list', async function () {
  contentListDigitalContents.push(contentListDigitalContents.shift()) // put first element at end
  const orderDigitalContentsTx = await colivingInstance.contracts.ContentListFactoryClient.orderContentListDigitalContents(
    contentListId,
    contentListDigitalContents)
})

it('should update contentList privacy', async function () {
  const updatedPrivacy = false
  const updateContentListPrivacyTx = await colivingInstance.contracts.ContentListFactoryClient.updateContentListPrivacy(
    contentListId,
    updatedPrivacy)
})

it('should update contentList name', async function () {
  const updatedContentListName = 'Here is my updated content list name'
  const updateContentListNameTx = await colivingInstance.contracts.ContentListFactoryClient.updateContentListName(
    contentListId,
    updatedContentListName)
})

it('should update contentList cover photo', async function () {
  const cid = helpers.constants.digitalContentMetadataCID // test metadata stored in DHT
  const digitalContentMultihashDecoded = Utils.decodeMultihash(cid)
  const testPhotoDigest = digitalContentMultihashDecoded.digest
  const updateContentListCoverPhotoTx = await colivingInstance.contracts.ContentListFactoryClient.updateContentListCoverPhoto(
    contentListId,
    testPhotoDigest)
})

it('should update content list description', async function () {
  const description = 'Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis'
  const updateContentListDescriptionTx = await colivingInstance.contracts.ContentListFactoryClient.updateContentListDescription(
    contentListId,
    description)
})

it('should update content list UPC', async function () {
  const newUPC = '928152343234'
  const updateContentListUPC = await colivingInstance.contracts.ContentListFactoryClient.updateContentListUPC(contentListId, newUPC)
})
