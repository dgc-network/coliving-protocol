import * as _lib from './_lib/lib.js'
import {
  Registry,
  UserStorage,
  UserFactory,
  AgreementStorage,
  AgreementFactory,
  PlaylistStorage,
  PlaylistFactory,
  UserLibraryFactory
} from './_lib/artifacts.js'
import * as _constants from './utils/constants'

contract('UserLibrary', async (accounts) => {
  const testUserId1 = 1
  const testUserId2 = 2
  const testAgreementId1 = 1
  const testAgreementId2 = 2
  const invalidUserId = 3
  const invalidAgreementId = 3
  const invalidPlaylistId = 2

  let playlistName = 'UserLibrary Test Playlist'
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
  let userLibraryFactory

  beforeEach(async () => {
    // init contract state
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

    userLibraryFactory = await UserLibraryFactory.new(
      registry.address,
      _constants.userFactoryKey,
      _constants.agreementFactoryKey,
      _constants.playlistFactoryKey,
      networkId)

    await registry.addContract(_constants.userLibraryFactoryKey, userLibraryFactory.address)

    // Add two users
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

    // Add 2 agreements
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

    // Add a playlist
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

  it('Should add one agreement save', async () => {
    // add agreement save and validate
    await _lib.addAgreementSaveAndValidate(
      userLibraryFactory,
      accounts[0],
      testUserId1,
      testAgreementId1)
  })

  it('Should delete one agreement save', async () => {
    // add agreement save and validate
    await _lib.addAgreementSaveAndValidate(
      userLibraryFactory,
      accounts[0],
      testUserId1,
      testAgreementId1)

    // delete agreement save and validate
    await _lib.deleteAgreementSaveAndValidate(
      userLibraryFactory,
      accounts[0],
      testUserId1,
      testAgreementId1)
  })

  it('Should add one playlist save', async () => {
    // add playlist save and validate
    await _lib.addPlaylistSaveAndValidate(
      userLibraryFactory,
      accounts[0],
      testUserId1,
      expectedPlaylistId)
  })

  it('Should delete one playlist save', async () => {
    // add playlist save and validate
    await _lib.addPlaylistSaveAndValidate(
      userLibraryFactory,
      accounts[0],
      testUserId1,
      expectedPlaylistId
    )

    // delete playlist save and validate
    await _lib.deletePlaylistSaveAndValidate(
      userLibraryFactory,
      accounts[0],
      testUserId1,
      expectedPlaylistId
    )
  })

  it('Should fail to add playlist save with non-existent user and non-existent playlist', async () => {
    let caughtError = false
    try {
      // add playlist save with invalid user
      await _lib.addPlaylistSaveAndValidate(
        userLibraryFactory,
        accounts[0],
        invalidUserId,
        expectedPlaylistId)
    } catch (e) {
      // handle expected error
      if (e.message.indexOf('Caller does not own userId') >= 0) {
        caughtError = true
      } else {
        // unexpected error - throw normally
        throw e
      }
    }
    assert.isTrue(caughtError, 'Call succeeded unexpectedly')

    caughtError = false
    try {
      // add playlist save with invalid playlist
      await _lib.addPlaylistSaveAndValidate(
        userLibraryFactory,
        accounts[0],
        testUserId1,
        invalidPlaylistId)
    } catch (e) {
      // handle expected error
      if (e.message.indexOf('valid playlist ID') >= 0) {
        caughtError = true
      } else {
        // unexpected error - throw normally
        console.log('throwing unexpected err')
        throw e
      }
    }
    assert.isTrue(caughtError, 'Call succeeded unexpectedly')
  })

  it('Should fail to delete playlist save with non-existent user and non-existent playlist', async () => {
    let caughtError = false
    try {
      // add playlist save with invalid user
      await _lib.deletePlaylistSaveAndValidate(
        userLibraryFactory,
        accounts[0],
        invalidUserId,
        expectedPlaylistId)
    } catch (e) {
      // handle expected error
      if (e.message.indexOf('Caller does not own userId') >= 0) {
        caughtError = true
      } else {
        // unexpected error - throw normally
        throw e
      }
    }
    assert.isTrue(caughtError, 'Call succeeded unexpectedly')
    caughtError = false
    try {
      // add playlist save with invalid playlist
      await _lib.deletePlaylistSaveAndValidate(
        userLibraryFactory,
        accounts[0],
        testUserId1,
        invalidPlaylistId)
    } catch (e) {
      // handle expected error
      if (e.message.indexOf('valid playlist ID') >= 0) {
        caughtError = true
      } else {
        // unexpected error - throw normally
        console.log('throwing unexpected err')
        throw e
      }
    }
    assert.isTrue(caughtError, 'Call succeeded unexpectedly')
  })

  it('Should fail to add agreement save with non-existent user and non-existent agreement', async () => {
    let caughtError = false
    try {
      await _lib.addAgreementSaveAndValidate(
        userLibraryFactory,
        accounts[0],
        invalidUserId,
        testAgreementId1)
    } catch (e) {
      // handle expected error
      if (e.message.indexOf('Caller does not own userId') >= 0) {
        caughtError = true
      } else {
        // unexpected error - throw normally
        throw e
      }
    }
    assert.isTrue(caughtError, 'Call succeeded unexpectedly')

    caughtError = false
    try {
      await _lib.addAgreementSaveAndValidate(
        userLibraryFactory,
        accounts[0],
        testUserId1,
        invalidAgreementId)
    } catch (e) {
      // handle expected error
      if (e.message.indexOf('must provide valid agreement ID') >= 0) {
        caughtError = true
      } else {
        // unexpected error - throw normally
        throw e
      }
    }
    assert.isTrue(caughtError, 'Call succeeded unexpectedly')
  })

  it('Should fail to delete agreement save with non-existent user and non-existent agreement', async () => {
    let caughtError = false
    try {
      await _lib.deleteAgreementSaveAndValidate(
        userLibraryFactory,
        accounts[0],
        invalidUserId,
        testAgreementId1)
    } catch (e) {
      // handle expected error
      if (e.message.indexOf('Caller does not own userId') >= 0) {
        caughtError = true
      } else {
        // unexpected error - throw normally
        throw e
      }
    }
    assert.isTrue(caughtError, 'Call succeeded unexpectedly')
    caughtError = false
    try {
      await _lib.deleteAgreementSaveAndValidate(
        userLibraryFactory,
        accounts[0],
        testUserId1,
        invalidAgreementId)
    } catch (e) {
      // handle expected error
      if (e.message.indexOf('must provide valid agreement ID') >= 0) {
        caughtError = true
      } else {
        // unexpected error - throw normally
        throw e
      }
    }
    assert.isTrue(caughtError, 'Call succeeded unexpectedly')
  })

  it('Should fail to add agreement save due to lack of ownership of user', async () => {
    let caughtError = false
    try {
      await _lib.addAgreementSaveAndValidate(
        userLibraryFactory,
        accounts[8],
        testUserId1,
        testAgreementId1)
    } catch (e) {
      // handle expected error
      if (e.message.indexOf('Caller does not own userId') >= 0) {
        caughtError = true
      } else {
        // unexpected error - throw normally
        throw e
      }
    }
    assert.isTrue(caughtError, 'Call succeeded unexpectedly')
  })

  it('Should fail to add playlist save due to lack of ownership of user', async () => {
    let caughtError = false
    try {
      await _lib.addPlaylistSaveAndValidate(
        userLibraryFactory,
        accounts[8],
        testUserId1,
        expectedPlaylistId
      )
    } catch (e) {
      // handle expected error
      if (e.message.indexOf('Caller does not own userId') >= 0) {
        caughtError = true
      } else {
        // unexpected error - throw normally
        throw e
      }
    }
    assert.isTrue(caughtError, 'Call succeeded unexpectedly')
  })

  it('Should fail to delete agreement save due to lack of ownership of user', async () => {
    // add agreement save and validate
    await _lib.addAgreementSaveAndValidate(
      userLibraryFactory,
      accounts[0],
      testUserId1,
      testAgreementId1
    )
    let caughtError = false
    try {
      await _lib.deleteAgreementSaveAndValidate(
        userLibraryFactory,
        accounts[8],
        testUserId1,
        testAgreementId1
      )
    } catch (e) {
      // handle expected error
      if (e.message.indexOf('Caller does not own userId') >= 0) {
        caughtError = true
      } else {
        // unexpected error - throw normally
        throw e
      }
    }
    assert.isTrue(caughtError, 'Call succeeded unexpectedly')
  })

  it('Should fail to delete playlist save due to lack of ownership of user', async () => {
    // add playlist save and validate
    await _lib.addPlaylistSaveAndValidate(
      userLibraryFactory,
      accounts[0],
      testUserId1,
      expectedPlaylistId
    )

    let caughtError = false
    try {
      await _lib.deletePlaylistSaveAndValidate(
        userLibraryFactory,
        accounts[8],
        testUserId1,
        expectedPlaylistId
      )
    } catch (e) {
      // handle expected error
      if (e.message.indexOf('Caller does not own userId') >= 0) {
        caughtError = true
      } else {
        // unexpected error - throw normally
        throw e
      }
    }
    assert.isTrue(caughtError, 'Call succeeded unexpectedly')
  })
})
