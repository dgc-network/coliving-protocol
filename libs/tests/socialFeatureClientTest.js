const assert = require('assert')
let helpers = require('./helpers')
let { Utils } = require('../src/utils')

let colivingInstance = helpers.colivingInstance

before(async function () {
  await colivingInstance.init()
})

it('Should add + delete agreement repost', async function () {
  // add creator
  const handle = 'sid' + Math.floor(Math.random() * 10000000)
  const creatorId = (await colivingInstance.contracts.UserFactoryClient.addUser(handle)).userId
  assert.ok(creatorId && Number.isInteger(creatorId), 'invalid creatorId')

  // add agreement
  const cid = helpers.constants.agreementMetadataCID
  const agreementMultihashDecoded = Utils.decodeMultihash(cid)
  const { agreementId } = await colivingInstance.contracts.AgreementFactoryClient.addAgreement(
    creatorId,
    agreementMultihashDecoded.digest,
    agreementMultihashDecoded.hashFn,
    agreementMultihashDecoded.size
  )
  assert.ok(agreementId && Number.isInteger(agreementId), 'invalid agreementId')
  const agreement = await colivingInstance.contracts.AgreementFactoryClient.getAgreement(agreementId)
  assert.strictEqual(agreement.multihashDigest, agreementMultihashDecoded.digest, 'Unexpected agreement multihash digest')

  // add agreement repost
  const addAgreementRepostTx = await colivingInstance.contracts.SocialFeatureFactoryClient.addAgreementRepost(creatorId, agreementId)
  assert.ok('AgreementRepostAdded' in addAgreementRepostTx.events, 'Did not find AgreementRepostAdded event in transaction')

  // delete agreement repost
  const deleteAgreementRepostTx = await colivingInstance.contracts.SocialFeatureFactoryClient.deleteAgreementRepost(creatorId, agreementId)
  assert.ok('AgreementRepostDeleted' in deleteAgreementRepostTx.events, 'Did not find AgreementRepostDeleted event in transaction')
})

it('Should add + delete playlist repost', async function () {
  // add creator
  const handle = 'sid' + Math.floor(Math.random() * 10000000)
  const creatorId = (await colivingInstance.contracts.UserFactoryClient.addUser(handle)).userId
  assert.ok(creatorId && Number.isInteger(creatorId), 'invalid creatorId')

  // add playlist
  const { playlistId } = await colivingInstance.contracts.PlaylistFactoryClient.createPlaylist(
    creatorId,
    'initialPlaylistName',
    false,
    false,
    [])
  assert.ok(playlistId && Number.isInteger(playlistId), 'invalid playlistId')

  // add playlist repost
  const addPlaylistRepostTx = await colivingInstance.contracts.SocialFeatureFactoryClient.addPlaylistRepost(creatorId, playlistId)
  assert.ok('PlaylistRepostAdded' in addPlaylistRepostTx.events, 'Did not find PlaylistRepostAdded event in transaction')

  // delete playlist repost
  const deletePlaylistRepostTx = await colivingInstance.contracts.SocialFeatureFactoryClient.deletePlaylistRepost(creatorId, playlistId)
  assert.ok('PlaylistRepostDeleted' in deletePlaylistRepostTx.events, 'Did not find PlaylistRepostDeleted event in transaction')
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
