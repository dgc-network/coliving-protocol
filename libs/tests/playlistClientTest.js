const assert = require('assert')
let helpers = require('./helpers')
let {Utils} = require('../src/utils')

let colivingInstance = helpers.colivingInstance
let playlistOwnerId

// First created playlist
let playlistId = 1

// Initial agreements
let playlistAgreements = []

// Initial playlist configuration
let initialPlaylistName = 'Test playlist name'
let initialIsPrivate = false

before(async function () {
  await colivingInstance.init()
  playlistOwnerId = (await colivingInstance.contracts.UserFactoryClient.addUser('playlistH')).userId

  const cid = helpers.constants.agreementMetadataCID // test metadata stored in DHT
  const agreementMultihashDecoded = Utils.decodeMultihash(cid)
  playlistAgreements.push((await colivingInstance.contracts.AgreementFactoryClient.addAgreement(
    playlistOwnerId,
    agreementMultihashDecoded.digest,
    agreementMultihashDecoded.hashFn,
    agreementMultihashDecoded.size
  )).agreementId)
  playlistAgreements.push((await colivingInstance.contracts.AgreementFactoryClient.addAgreement(
    playlistOwnerId,
    agreementMultihashDecoded.digest,
    agreementMultihashDecoded.hashFn,
    agreementMultihashDecoded.size
  )).agreementId)
})

// TODO: Add validation to the below test cases, currently they just perform chain operations.

it('should create playlist', async function () {
  const playlistId = await colivingInstance.contracts.PlaylistFactoryClient.createPlaylist(
    playlistOwnerId,
    initialPlaylistName,
    initialIsPrivate,
    false,
    playlistAgreements)
})

it('should create album', async function () {
  const playlistId = await colivingInstance.contracts.PlaylistFactoryClient.createPlaylist(
    playlistOwnerId,
    initialPlaylistName,
    initialIsPrivate,
    true,
    playlistAgreements)
})

it('should create and delete playlist', async function () {
  // create playlist
  const { playlistId } = await colivingInstance.contracts.PlaylistFactoryClient.createPlaylist(
    playlistOwnerId,
    initialPlaylistName,
    initialIsPrivate,
    false,
    playlistAgreements)

  // delete playlist + validate
  const { playlistId: deletedPlaylistId } = await colivingInstance.contracts.PlaylistFactoryClient.deletePlaylist(playlistId)
  assert.strictEqual(playlistId, deletedPlaylistId)
})

it('should add agreements to an existing playlist', async function () {
  const cid = helpers.constants.agreementMetadataCID // test metadata stored in DHT
  const agreementMultihashDecoded = Utils.decodeMultihash(cid)

  // Add a new agreement
  const { agreementId } = await colivingInstance.contracts.AgreementFactoryClient.addAgreement(
    playlistOwnerId,
    agreementMultihashDecoded.digest,
    agreementMultihashDecoded.hashFn,
    agreementMultihashDecoded.size
  )
  const agreement = await colivingInstance.contracts.AgreementFactoryClient.getAgreement(agreementId)
  assert.strictEqual(agreement.multihashDigest, agreementMultihashDecoded.digest)

  const addPlaylistAgreementTx = await colivingInstance.contracts.PlaylistFactoryClient.addPlaylistAgreement(
    playlistId,
    agreementId)
})

it('should delete agreement from an existing playlist', async function () {
  const cid = helpers.constants.agreementMetadataCID // test metadata stored in DHT
  const agreementMultihashDecoded = Utils.decodeMultihash(cid)

  // Add a new agreement
  const { agreementId } = await colivingInstance.contracts.AgreementFactoryClient.addAgreement(
    playlistOwnerId,
    agreementMultihashDecoded.digest,
    agreementMultihashDecoded.hashFn,
    agreementMultihashDecoded.size
  )
  const agreement = await colivingInstance.contracts.AgreementFactoryClient.getAgreement(agreementId)
  assert.strictEqual(agreement.multihashDigest, agreementMultihashDecoded.digest)

  const addPlaylistAgreementTx = await colivingInstance.contracts.PlaylistFactoryClient.addPlaylistAgreement(
    playlistId,
    agreementId)

  const deletedTimestamp = 1552008725
  // Delete the newly added agreement from the playlist
  const deletedPlaylistAgreementTx = await colivingInstance.contracts.PlaylistFactoryClient.deletePlaylistAgreement(
    playlistId,
    agreementId,
    deletedTimestamp)
})

it('should reorder agreements in an existing playlist', async function () {
  playlistAgreements.push(playlistAgreements.shift()) // put first element at end
  const orderAgreementsTx = await colivingInstance.contracts.PlaylistFactoryClient.orderPlaylistAgreements(
    playlistId,
    playlistAgreements)
})

it('should update playlist privacy', async function () {
  const updatedPrivacy = false
  const updatePlaylistPrivacyTx = await colivingInstance.contracts.PlaylistFactoryClient.updatePlaylistPrivacy(
    playlistId,
    updatedPrivacy)
})

it('should update playlist name', async function () {
  const updatedPlaylistName = 'Here is my updated playlist name'
  const updatePlaylistNameTx = await colivingInstance.contracts.PlaylistFactoryClient.updatePlaylistName(
    playlistId,
    updatedPlaylistName)
})

it('should update playlist cover photo', async function () {
  const cid = helpers.constants.agreementMetadataCID // test metadata stored in DHT
  const agreementMultihashDecoded = Utils.decodeMultihash(cid)
  const testPhotoDigest = agreementMultihashDecoded.digest
  const updatePlaylistCoverPhotoTx = await colivingInstance.contracts.PlaylistFactoryClient.updatePlaylistCoverPhoto(
    playlistId,
    testPhotoDigest)
})

it('should update playlist description', async function () {
  const description = 'Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis'
  const updatePlaylistDescriptionTx = await colivingInstance.contracts.PlaylistFactoryClient.updatePlaylistDescription(
    playlistId,
    description)
})

it('should update playlist UPC', async function () {
  const newUPC = '928152343234'
  const updatePlaylistUPC = await colivingInstance.contracts.PlaylistFactoryClient.updatePlaylistUPC(playlistId, newUPC)
})
