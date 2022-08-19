import * as _lib from './_lib/lib.js'
import * as _constants from './utils/constants'
import {
  Registry,
  UserStorage,
  UserFactory,
  AgreementStorage,
  AgreementFactory,
  PlaylistStorage,
  PlaylistFactory
} from './_lib/artifacts.js'

contract('PlaylistFactory', async (accounts) => {
  const testUserId1 = 1
  const testUserId2 = 2
  const testAgreementId1 = 1
  const testAgreementId2 = 2
  const testAgreementId3 = 3

  let playlistName = 'PlaylistFactory Test Playlist'
  let playlistAgreements = [1, 2]
  let expectedPlaylistId = 1
  let playlistOwnerId = testUserId1

  let registry
  let userStorage
  let userFactory
  let agreementStorage
  let agreementFactory
  let playlistStorage
  let playlistFactory

  beforeEach(async () => {
    registry = await Registry.new()
    const networkId = Registry.network_id
    userStorage = await UserStorage.new(registry.address)
    await registry.addContract(_constants.userStorageKey, userStorage.address)
    agreementStorage = await AgreementStorage.new(registry.address)
    await registry.addContract(_constants.agreementStorageKey, agreementStorage.address)
    userFactory = await UserFactory.new(registry.address, _constants.userStorageKey, networkId, accounts[5])
    await registry.addContract(_constants.userFactoryKey, userFactory.address)
    agreementFactory = await AgreementFactory.new(registry.address, _constants.agreementStorageKey, _constants.userFactoryKey, networkId)
    await registry.addContract(_constants.agreementFactoryKey, agreementFactory.address)

    // Deploy playlist related contracts
    playlistStorage = await PlaylistStorage.new(registry.address)
    await registry.addContract(_constants.playlistStorageKey, playlistStorage.address)
    playlistFactory = await PlaylistFactory.new(
      registry.address,
      _constants.playlistStorageKey,
      _constants.userFactoryKey,
      _constants.agreementFactoryKey,
      networkId)

    await registry.addContract(_constants.playlistFactoryKey, playlistFactory.address)

    // add two users
    await _lib.addUserAndValidate(
      userFactory,
      testUserId1,
      accounts[0],
      _constants.testMultihash.digest1,
      _constants.userHandle1,
      true)

    await _lib.addUserAndValidate(
      userFactory,
      testUserId2,
      accounts[0],
      _constants.testMultihash.digest1,
      _constants.userHandle2,
      true)

    // add two agreements
    await _lib.addAgreementAndValidate(
      agreementFactory,
      testAgreementId1,
      accounts[0],
      testUserId1,
      _constants.testMultihash.digest2,
      _constants.testMultihash.hashFn,
      _constants.testMultihash.size)
    await _lib.addAgreementAndValidate(
      agreementFactory,
      testAgreementId2,
      accounts[0],
      testUserId2,
      _constants.testMultihash.digest2,
      _constants.testMultihash.hashFn,
      _constants.testMultihash.size)
  })

  it('Should create a playlist', async () => {
    await _lib.addPlaylistAndValidate(
      playlistFactory,
      expectedPlaylistId,
      accounts[0],
      playlistOwnerId,
      playlistName,
      false,
      false,
      playlistAgreements)
  })

  it('Should create a playlist and add a separate agreement', async () => {
    // Add a 3rd agreement that is not in the initial playlist agreements list
    await _lib.addAgreementAndValidate(
      agreementFactory,
      testAgreementId3,
      accounts[0],
      testUserId2,
      _constants.testMultihash.digest2,
      _constants.testMultihash.hashFn,
      _constants.testMultihash.size)

    // Create playlist
    await _lib.addPlaylistAndValidate(
      playlistFactory,
      expectedPlaylistId,
      accounts[0],
      playlistOwnerId,
      playlistName,
      false,
      false,
      playlistAgreements)

    await _lib.addPlaylistAgreement(
      playlistFactory,
      accounts[0],
      expectedPlaylistId,
      testAgreementId3)
  })

  it('Should create a playlist and delete a agreement', async () => {
    // Create playlist
    await _lib.addPlaylistAndValidate(
      playlistFactory,
      expectedPlaylistId,
      accounts[0],
      playlistOwnerId,
      playlistName,
      false,
      false,
      playlistAgreements)

    await _lib.deletePlaylistAgreement(
      playlistFactory,
      accounts[0],
      expectedPlaylistId,
      testAgreementId2,
      1551912253)
  })

  it('Should create a playlist and perform update operations', async () => {
    // Test following update operations:
    // 1 - Reorder agreements
    // 2 - Update playlist name
    // 3 - Update playlist privacy
    // 4 - Update playlist cover photo
    // 5 - Update playlist UPC
    // Create playlist
    await _lib.addPlaylistAndValidate(
      playlistFactory,
      expectedPlaylistId,
      accounts[0],
      playlistOwnerId,
      playlistName,
      false,
      false,
      playlistAgreements)

    let playlistAgreementsNewOrder = [2, 1]

    // 1 - Update playlist order
    await _lib.orderPlaylistAgreementsAndValidate(
      playlistFactory,
      accounts[0],
      expectedPlaylistId,
      playlistAgreementsNewOrder)

    // 2 - Update playlist name
    await _lib.updatePlaylistNameAndValidate(
      playlistFactory,
      accounts[0],
      expectedPlaylistId,
      'Updated test playlist name')

    // 3 - Update playlist privacy
    await _lib.updatePlaylistPrivacyAndValidate(
      playlistFactory,
      accounts[0],
      expectedPlaylistId,
      true)

    // Attempt updating a playlist order with an invalid agreement
    let invalidPlaylistAgreementsOrder = [2, 3, 1]
    let updatedAgreementOrder = null
    try {
      await _lib.orderPlaylistAgreementsAndValidate(
        playlistFactory,
        accounts[0],
        expectedPlaylistId,
        invalidPlaylistAgreementsOrder)

      updatedAgreementOrder = true
    } catch (err) {
      // Update flag to indicate that invalid update cannot be performed
      if (err.message.indexOf('Expected valid playlist agreement id') >= 0) {
        updatedAgreementOrder = false
      }
    }

    assert.isFalse(
      updatedAgreementOrder,
      'Expect failure with invalid agreement ID in reorder operation')

    // 4 - Update playlist cover photo
    await _lib.updatePlaylistCoverPhotoAndValidate(
      playlistFactory,
      accounts[0],
      expectedPlaylistId,
      _constants.userMetadata.coverPhotoDigest)

    // 5 - Update playlist description
    await _lib.updatePlaylistDescriptionAndValidate(
      playlistFactory,
      accounts[0],
      expectedPlaylistId,
      'Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis')

    // 6 - Update playlist UPC
    // TODO: Fix these numbas yo
    await _lib.updatePlaylistUPCAndValidate(
      playlistFactory,
      accounts[0],
      expectedPlaylistId,
      web3.utils.utf8ToHex('123456789abc'))

    // 7 - Update operations with invalid fields
    let invalidPlaylistId = 50
    let caughtError = false
    try {
      await _lib.updatePlaylistPrivacyAndValidate(
        playlistFactory,
        accounts[0],
        invalidPlaylistId,
        true)
    } catch (e) {
      if (e.message.indexOf('Must provide valid playlist ID')) {
        caughtError = true
      }
    }
    assert.isTrue(caughtError, 'Call succeeded unexpectedly')

    caughtError = false
    try {
      await _lib.updatePlaylistPrivacyAndValidate(
        playlistFactory,
        accounts[1], // Incorrect account
        expectedPlaylistId,
        true)
    } catch (e) {
      if (e.message.indexOf('Invalid signature')) {
        caughtError = true
      }
    }
    assert.isTrue(caughtError, 'Call succeeded unexpectedly')
  })

  it('Should create then delete a playlist', async () => {
    await _lib.addPlaylistAndValidate(
      playlistFactory,
      expectedPlaylistId,
      accounts[0],
      playlistOwnerId,
      playlistName,
      false,
      false,
      playlistAgreements
    )
    await _lib.deletePlaylistAndValidate(
      playlistFactory,
      accounts[0],
      expectedPlaylistId
    )
  })

  it('Should fail to create playlist with non-existent user', async () => {
    let caughtError = false
    try {
      await _lib.addPlaylistAndValidate(
        playlistFactory,
        expectedPlaylistId,
        accounts[0],
        10,
        playlistName,
        false,
        false,
        playlistAgreements
      )
    } catch (e) {
      // expected error
      if (e.message.indexOf('Caller does not own userId') >= 0) {
        caughtError = true
      } else {
        // other unexpected error - throw it normally
        throw e
      }
    }
    assert.isTrue(
      caughtError,
      'Failed to handle case where caller tries to create playlist with non-existent user'
    )
  })

  it('Should fail to create playlist with user that caller does not own', async () => {
    let caughtError = false
    try {
      await _lib.addPlaylistAndValidate(
        playlistFactory,
        expectedPlaylistId,
        accounts[1],
        playlistOwnerId,
        playlistName,
        false,
        false,
        playlistAgreements
      )
    } catch (e) {
      // expected error
      if (e.message.indexOf('Caller does not own userId') >= 0) {
        caughtError = true
      } else {
        // other unexpected error - throw it normally
        throw e
      }
    }
    assert.isTrue(
      caughtError,
      'Failed to handle case where caller tries to create playlist user that it does not own'
    )
  })

  it('Should fail to update non-existent playlist', async () => {
    let caughtError = false
    try {
      await _lib.updatePlaylistNameAndValidate(
        playlistFactory,
        accounts[0],
        expectedPlaylistId,
        'Updated test playlist name'
      )
    } catch (e) {
      // expected error
      if (e.message.indexOf('Caller does not own userId') >= 0) {
        caughtError = true
      } else {
        // other unexpected error - throw it normally
        throw e
      }
    }
    assert.isTrue(
      caughtError,
      'Failed to handle case where caller tries to update non-existent playlist'
    )
  })

  it('Should fail to update playlist that caller does not own', async () => {
    await _lib.addPlaylistAndValidate(
      playlistFactory,
      expectedPlaylistId,
      accounts[0],
      playlistOwnerId,
      playlistName,
      false,
      false,
      playlistAgreements
    )

    let caughtError = false
    try {
      await _lib.updatePlaylistNameAndValidate(
        playlistFactory,
        accounts[1],
        expectedPlaylistId,
        'Updated test playlist name'
      )
    } catch (e) {
      // expected error
      if (e.message.indexOf('Caller does not own userId') >= 0) {
        caughtError = true
      } else {
        // other unexpected error - throw it normally
        throw e
      }
    }
    assert.isTrue(
      caughtError,
      'Failed to handle case where caller tries to update playlist that caller does not own'
    )
  })

  it('Should fail to delete non-existent playlist', async () => {
    let caughtError = false
    try {
      await _lib.deletePlaylistAndValidate(
        playlistFactory,
        accounts[0],
        expectedPlaylistId
      )
    } catch (e) {
      // expected error
      if (e.message.indexOf('Caller does not own userId') >= 0) {
        caughtError = true
      } else {
        // other unexpected error - throw it normally
        throw e
      }
    }
    assert.isTrue(
      caughtError,
      'Failed to handle case where caller tries to delete non-existent playlist'
    )
  })

  it('Should fail to delete playlist that caller does not own', async () => {
    await _lib.addPlaylistAndValidate(
      playlistFactory,
      expectedPlaylistId,
      accounts[0],
      playlistOwnerId,
      playlistName,
      false,
      false,
      playlistAgreements
    )

    let caughtError = false
    try {
      await _lib.deletePlaylistAndValidate(
        playlistFactory,
        accounts[1],
        expectedPlaylistId
      )
    } catch (e) {
      // expected error
      if (e.message.indexOf('Caller does not own userId') >= 0) {
        caughtError = true
      } else {
        // other unexpected error - throw it normally
        throw e
      }
    }
    assert.isTrue(
      caughtError,
      'Failed to handle case where caller tries to delete playlist that caller does not own'
    )
  })
})
