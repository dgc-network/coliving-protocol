const assert = require('assert')
let helpers = require('./helpers')
let { Utils } = require('../src/utils')

let colivingInstance = helpers.colivingInstance

before(async function () {
  await colivingInstance.init()
})

it('Should add + delete digital_content repost', async function () {
  // add creator
  const handle = 'sid' + Math.floor(Math.random() * 10000000)
  const creatorId = (await colivingInstance.contracts.UserFactoryClient.addUser(handle)).userId
  assert.ok(creatorId && Number.isInteger(creatorId), 'invalid creatorId')

  // add digital_content
  const cid = helpers.constants.digitalContentMetadataCID
  const digitalContentMultihashDecoded = Utils.decodeMultihash(cid)
  const { digitalContentId } = await colivingInstance.contracts.DigitalContentFactoryClient.addDigitalContent(
    creatorId,
    digitalContentMultihashDecoded.digest,
    digitalContentMultihashDecoded.hashFn,
    digitalContentMultihashDecoded.size
  )
  assert.ok(digitalContentId && Number.isInteger(digitalContentId), 'invalid digitalContentId')
  const digital_content = await colivingInstance.contracts.DigitalContentFactoryClient.getDigitalContent(digitalContentId)
  assert.strictEqual(digital_content.multihashDigest, digitalContentMultihashDecoded.digest, 'Unexpected digital_content multihash digest')

  // add digital_content repost
  const addDigitalContentRepostTx = await colivingInstance.contracts.SocialFeatureFactoryClient.addDigitalContentRepost(creatorId, digitalContentId)
  assert.ok('DigitalContentRepostAdded' in addDigitalContentRepostTx.events, 'Did not find DigitalContentRepostAdded event in transaction')

  // delete digital_content repost
  const deleteDigitalContentRepostTx = await colivingInstance.contracts.SocialFeatureFactoryClient.deleteDigitalContentRepost(creatorId, digitalContentId)
  assert.ok('DigitalContentRepostDeleted' in deleteDigitalContentRepostTx.events, 'Did not find DigitalContentRepostDeleted event in transaction')
})

it('Should add + delete contentList repost', async function () {
  // add creator
  const handle = 'sid' + Math.floor(Math.random() * 10000000)
  const creatorId = (await colivingInstance.contracts.UserFactoryClient.addUser(handle)).userId
  assert.ok(creatorId && Number.isInteger(creatorId), 'invalid creatorId')

  // add contentList
  const { contentListId } = await colivingInstance.contracts.ContentListFactoryClient.createContentList(
    creatorId,
    'initialContentListName',
    false,
    false,
    [])
  assert.ok(contentListId && Number.isInteger(contentListId), 'invalid contentListId')

  // add contentList repost
  const addContentListRepostTx = await colivingInstance.contracts.SocialFeatureFactoryClient.addContentListRepost(creatorId, contentListId)
  assert.ok('ContentListRepostAdded' in addContentListRepostTx.events, 'Did not find ContentListRepostAdded event in transaction')

  // delete contentList repost
  const deleteContentListRepostTx = await colivingInstance.contracts.SocialFeatureFactoryClient.deleteContentListRepost(creatorId, contentListId)
  assert.ok('ContentListRepostDeleted' in deleteContentListRepostTx.events, 'Did not find ContentListRepostDeleted event in transaction')
})

it('Should add + delete user follow', async function () {
  // add 2 users
  const handle1 = '2sid_' + Math.floor(Math.random() + 10000000)
  const handle2 = '3sid_' + Math.floor(Math.random() + 10000000)
  const userId1 = (await colivingInstance.contracts.UserFactoryClient.addUser(handle1)).userId
  const userId2 = (await colivingInstance.contracts.UserFactoryClient.addUser(handle2)).userId
  assert.ok(userId1 && Number.isInteger(userId1), 'invalid userId')
  assert.ok(userId2 && Number.isInteger(userId2), 'invalid userId')

  // add user follow
  const addUserFollowTx = await colivingInstance.contracts.SocialFeatureFactoryClient.addUserFollow(userId1, userId2)
  assert.ok('UserFollowAdded' in addUserFollowTx.events, 'Did not find UserFollowAdded event in transaction')

  // delete user follow
  const deleteUserFollowTx = await colivingInstance.contracts.SocialFeatureFactoryClient.deleteUserFollow(userId1, userId2)
  assert.ok('UserFollowDeleted' in deleteUserFollowTx.events, 'Did not find UserFollowDeleted event in transaction')
})
