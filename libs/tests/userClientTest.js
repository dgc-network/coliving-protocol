const assert = require('assert')
let helpers = require('./helpers')
let { Utils } = require('../src/utils')

let colivingInstance = helpers.colivingInstance
let handle = 'handle' + Math.floor(Math.random() * 1000000)

before(async function () {
  await colivingInstance.init()
})

it('should call getUser on invalid value and verify blockchain is empty', async function () {
  let creator = await colivingInstance.contracts.UserFactoryClient.getUser(0)
  assert.strictEqual(creator.wallet, '0x0000000000000000000000000000000000000000')
})

it('should verify handle is valid', async function () {
  let handleIsValid = await colivingInstance.contracts.UserFactoryClient.handleIsValid(handle)
  assert.strictEqual(handleIsValid, true, 'Handle is valid')
})

it('should call addUser and verify new creator', async function () {
  let metadata = {
    'wallet': helpers.constants.wallet,
    'name': 'Creator Name' + Math.floor(Math.random() * 1000000),
    'handle': handle,
    'profile_picture': helpers.constants.agreementMetadataCID,
    'cover_photo': helpers.constants.agreementMetadataCID,
    'bio': 'Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat. Duis aute irure dolor in reprehenderit in voluptate velit esse cillum dolore eu fugiat nulla pariatur. Excepteur sint occaecat cupidatat non proident, sunt in culpa qui officia deserunt mollit anim id est laborum.',
    'location': 'San Francisco',
    'content_node_endpoint': helpers.constants.contentNodeURL1,
    'is_verified': false
  }

  const addUserResp = await colivingInstance.contracts.UserFactoryClient.addUser(metadata.handle)
  const userId = addUserResp.userId
  const creator = await colivingInstance.contracts.UserFactoryClient.getUser(userId)
  const creatorMetadataMultihashDecoded = Utils.decodeMultihash(helpers.constants.creatorMetadataCID)
  const profilePictureMultihashDecoded = Utils.decodeMultihash(metadata.profile_picture)
  const coverPhotoMultihashDecoded = Utils.decodeMultihash(metadata.cover_photo)

  assert.strictEqual(metadata.handle, Utils.hexToUtf8(creator.handle))

  const updateMultihashResp = await colivingInstance.contracts.UserFactoryClient.updateMultihash(
    userId, creatorMetadataMultihashDecoded.digest
  )
  assert.strictEqual(
    updateMultihashResp.multihashDigest,
    creatorMetadataMultihashDecoded.digest,
    `Transaction failed - ${creatorMetadataMultihashDecoded.digest}`
  )

  const updateNameResp = await colivingInstance.contracts.UserFactoryClient.updateName(
    userId, metadata.name
  )
  assert.deepStrictEqual(
    updateNameResp.name,
    metadata.name,
    `Transaction failed - ${metadata.name}`
  )

  const updateLocationResp = await colivingInstance.contracts.UserFactoryClient.updateLocation(
    userId, metadata.location
  )
  assert.deepStrictEqual(
    updateLocationResp.location,
    metadata.location,
    `Transaction failed - ${metadata.location}`
  )

  const updateBioResp = await colivingInstance.contracts.UserFactoryClient.updateBio(
    userId, metadata.bio
  )
  assert.deepStrictEqual(
    updateBioResp.bio,
    metadata.bio,
    `Transaction failed - ${metadata.bio}`
  )

  const updateProfilePhotoResp = await colivingInstance.contracts.UserFactoryClient.updateProfilePhoto(
    userId, profilePictureMultihashDecoded.digest
  )
  assert.deepStrictEqual(
    updateProfilePhotoResp.profilePhotoMultihashDigest,
    profilePictureMultihashDecoded.digest,
    `Transaction failed - ${profilePictureMultihashDecoded.digest}`
  )

  const updateCoverPhotoResp = await colivingInstance.contracts.UserFactoryClient.updateCoverPhoto(
    userId, coverPhotoMultihashDecoded.digest
  )
  assert.deepStrictEqual(
    updateCoverPhotoResp.coverPhotoMultihashDigest,
    coverPhotoMultihashDecoded.digest,
    `Transaction failed - ${coverPhotoMultihashDecoded.digest}`
  )

  const updateContentNodeEndpointResp = await colivingInstance.contracts.UserFactoryClient.updateContentNodeEndpoint(
    userId, metadata.content_node_endpoint
  )
  assert.deepStrictEqual(
    updateContentNodeEndpointResp.contentNodeEndpoint,
    metadata.content_node_endpoint,
    `Transaction failed - ${metadata.content_node_endpoint}`
  )
})

it('should verify handle is not valid', async function () {
  let handleIsValid = await colivingInstance.contracts.UserFactoryClient.handleIsValid(handle)
  assert.strictEqual(handleIsValid, false, 'Handle is not valid')
})
