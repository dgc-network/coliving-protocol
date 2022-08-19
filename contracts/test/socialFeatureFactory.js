import * as _lib from './_lib/lib.js'
import {
  Registry,
  UserStorage,
  UserFactory,
  AgreementStorage,
  AgreementFactory,
  PlaylistStorage,
  PlaylistFactory,
  SocialFeatureStorage,
  SocialFeatureFactory
} from './_lib/artifacts.js'
import * as _constants from './utils/constants'

contract('SocialFeatureFactory', async (accounts) => {
  const testUserId1 = 1
  const testUserId2 = 2
  const testUserId3 = 3
  const testAgreementId1 = 1
  const testAgreementId2 = 2
  const testAgreementId3 = 3

  let playlistName1 = 'playlistName1'
  let playlistAgreements1 = [1, 2]
  let playlistId1 = 1
  let playlistId2 = 2
  let playlistIsAlbum1 = false

  let registry
  let userStorage
  let userFactory
  let agreementStorage
  let agreementFactory
  let playlistStorage
  let playlistFactory
  let socialFeatureStorage
  let socialFeatureFactory

  beforeEach(async () => {
    // init contract state
    registry = await Registry.new()
    const networkId = Registry.network_id

    userStorage = await UserStorage.new(registry.address)
    await registry.addContract(_constants.userStorageKey, userStorage.address)
    userFactory = await UserFactory.new(registry.address, _constants.userStorageKey, networkId, accounts[5])
    await registry.addContract(_constants.userFactoryKey, userFactory.address)
    agreementStorage = await AgreementStorage.new(registry.address)
    await registry.addContract(_constants.agreementStorageKey, agreementStorage.address)
    agreementFactory = await AgreementFactory.new(registry.address, _constants.agreementStorageKey, _constants.userFactoryKey, networkId)
    await registry.addContract(_constants.agreementFactoryKey, agreementFactory.address)
    playlistStorage = await PlaylistStorage.new(registry.address)
    await registry.addContract(_constants.playlistStorageKey, playlistStorage.address)
    playlistFactory = await PlaylistFactory.new(registry.address, _constants.playlistStorageKey, _constants.userFactoryKey, _constants.agreementFactoryKey, networkId)
    await registry.addContract(_constants.playlistFactoryKey, playlistFactory.address)
    socialFeatureStorage = await SocialFeatureStorage.new(registry.address)
    await registry.addContract(_constants.socialFeatureStorageKey, socialFeatureStorage.address)
    socialFeatureFactory = await SocialFeatureFactory.new(registry.address, _constants.socialFeatureStorageKey, _constants.userFactoryKey, _constants.agreementFactoryKey, _constants.playlistFactoryKey, networkId)
    await registry.addContract(_constants.socialFeatureFactoryKey, socialFeatureFactory.address)

    // add users and agreements
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
      testUserId1,
      _constants.testMultihash.digest2,
      _constants.testMultihash.hashFn,
      _constants.testMultihash.size)

    await _lib.addPlaylistAndValidate(
      playlistFactory,
      playlistId1,
      accounts[0],
      testUserId1,
      playlistName1,
      false,
      playlistIsAlbum1,
      playlistAgreements1
    )
  })

  /******************** AgreementRepost ********************/
  /*****************************************************/

  it('Should add one AgreementRepost', async () => {
    // add agreement repost and validate
    await _lib.addAgreementRepostAndValidate(socialFeatureFactory, accounts[0], testUserId1, testAgreementId1)
  })

  it('Should add and delete one AgreementRepost', async () => {
    // add agreement repost and validate
    await _lib.addAgreementRepostAndValidate(socialFeatureFactory, accounts[0], testUserId1, testAgreementId1)

    // delete agreement repost and validate
    await _lib.deleteAgreementRepostAndValidate(socialFeatureFactory, accounts[0], testUserId1, testAgreementId1)
  })

  it('Should confirm duplicate add/delete AgreementReposts throw', async () => {
    // add agreement repost and validate
    await _lib.addAgreementRepostAndValidate(socialFeatureFactory, accounts[0], testUserId1, testAgreementId1)

    // confirm duplicate agreement repost throws
    let caughtError = false
    try {
      await _lib.addAgreementRepostAndValidate(socialFeatureFactory, accounts[0], testUserId1, testAgreementId1)
    } catch (e) {
      if (e.message.indexOf('agreement repost already exists') >= 0) {
        caughtError = true
      } else {
        // unexpected error - throw normally
        throw e
      }
    }
    assert.isTrue(caughtError, 'Call succeeded unexpectedly')

    // delete agreement repost and validate
    await _lib.deleteAgreementRepostAndValidate(socialFeatureFactory, accounts[0], testUserId1, testAgreementId1)

    // confirm duplicate agreement repost delete throws
    caughtError = false
    try {
      await _lib.deleteAgreementRepostAndValidate(socialFeatureFactory, accounts[0], testUserId1, testAgreementId1)
    } catch (e) {
      if (e.message.indexOf('agreement repost does not exist') >= 0) {
        caughtError = true
      } else {
        // unexpected error - throw normally
        throw e
      }
    }
    assert.isTrue(caughtError, 'Call succeeded unexpectedly')
  })

  it('Should fail to add AgreementRepost with non-existent user', async () => {
    let caughtError = false
    try {
      await _lib.addAgreementRepostAndValidate(socialFeatureFactory, accounts[0], testUserId3, testAgreementId1)
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

  it('Should fail to delete AgreementRepost with non-existent agreement', async () => {
    let caughtError = false
    try {
      await _lib.deleteAgreementRepostAndValidate(socialFeatureFactory, accounts[0], testUserId1, testAgreementId3)
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

  it('Should fail to add AgreementRepost due to lack of ownership of reposter user', async () => {
    let caughtError = false
    try {
      await _lib.addAgreementRepostAndValidate(socialFeatureFactory, accounts[1], testUserId1, testAgreementId1)
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

  it('Should fail to delete AgreementRepost due to lack of ownership of reposter user', async () => {
    let caughtError = false
    try {
      await _lib.deleteAgreementRepostAndValidate(socialFeatureFactory, accounts[1], testUserId1, testAgreementId1)
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

  /******************** PlaylistRepost ********************/
  /********************************************************/

  it('Should add one PlaylistRepost', async () => {
    await _lib.addPlaylistRepostAndValidate(socialFeatureFactory, accounts[0], testUserId1, playlistId1)
  })

  it('Should add and delete one PlaylistRepost', async () => {
    await _lib.addPlaylistRepostAndValidate(socialFeatureFactory, accounts[0], testUserId1, playlistId1)
    await _lib.deletePlaylistRepostAndValidate(socialFeatureFactory, accounts[0], testUserId1, playlistId1)
  })

  it('Should confirm duplicate add/delete PlaylistRepost throws', async () => {
    // add playlist repost
    await _lib.addPlaylistRepostAndValidate(socialFeatureFactory, accounts[0], testUserId1, playlistId1)

    // confirm duplicate playlist repost throws
    let caughtError = false
    try {
      await _lib.addPlaylistRepostAndValidate(socialFeatureFactory, accounts[0], testUserId1, playlistId1)
    } catch (e) {
      if (e.message.indexOf('playlist repost already exists') >= 0) {
        caughtError = true
      } else {
        // unexpected error - throw normally
        throw e
      }
    }
    assert.isTrue(caughtError, 'Call succeeded unexpectedly')

    // delete playlist repost
    await _lib.deletePlaylistRepostAndValidate(socialFeatureFactory, accounts[0], testUserId1, playlistId1)

    // confirm duplicate playlist repost delete throws
    caughtError = false
    try {
      await _lib.deletePlaylistRepostAndValidate(socialFeatureFactory, accounts[0], testUserId1, playlistId1)
    } catch (e) {
      if (e.message.indexOf('playlist repost does not exist') >= 0) {
        caughtError = true
      } else {
        // unexpected error - throw normally
        throw e
      }
    }
    assert.isTrue(caughtError, 'Call succeeded unexpectedly')
  })

  it('Should fail to add PlaylistRepost with non-existent user', async () => {
    let caughtError = false
    try {
      await _lib.addPlaylistRepostAndValidate(socialFeatureFactory, accounts[0], testUserId3, playlistId1)
    } catch (e) {
      // handle expected error
      if (e.message.indexOf('Caller does not own userId ') >= 0) {
        caughtError = true
      } else {
        // unexpected error - throw normally
        throw e
      }
    }
    assert.isTrue(caughtError, 'Call succeeded unexpectedly')
  })

  it('Should fail to add PlaylistRepost with non-existent playlist', async () => {
    let caughtError = false
    try {
      await _lib.addPlaylistRepostAndValidate(socialFeatureFactory, accounts[0], testUserId1, playlistId2)
    } catch (e) {
      // handle expected error
      if (e.message.indexOf('must provide valid playlist ID') >= 0) {
        caughtError = true
      } else {
        // unexpected error - throw normally
        throw e
      }
    }
    assert.isTrue(caughtError, 'Call succeeded unexpectedly')
  })

  it('Should fail to add PlaylistRepost due to lack of ownership of reposter user', async () => {
    let caughtError = false
    try {
      await _lib.addPlaylistRepostAndValidate(socialFeatureFactory, accounts[1], testUserId1, playlistId1)
    } catch (e) {
      // handle expected error
      if (e.message.indexOf('Caller does not own userId ') >= 0) {
        caughtError = true
      } else {
        // unexpected error - throw normally
        throw e
      }
    }
    assert.isTrue(caughtError, 'Call succeeded unexpectedly')
  })

  it('Should fail to delete PlaylistRepost due to lack of ownership of reposter user', async () => {
    let caughtError = false
    try {
      await _lib.deletePlaylistRepostAndValidate(socialFeatureFactory, accounts[1], testUserId1, playlistId1)
    } catch (e) {
      // handle expected error
      if (e.message.indexOf('Caller does not own userId ') >= 0) {
        caughtError = true
      } else {
        // unexpected error - throw normally
        throw e
      }
    }
    assert.isTrue(caughtError, 'Call succeeded unexpectedly')
  })

  /******************** UserFollow ********************/
  /****************************************************/

  it('Should add one UserFollow', async () => {
    // add user follow and validate
    await _lib.addUserFollowAndValidate(socialFeatureFactory, accounts[0], testUserId1, testUserId2)
  })

  it('Should add and delete one UserFollow', async () => {
    // add UserFollow and validate
    await _lib.addUserFollowAndValidate(socialFeatureFactory, accounts[0], testUserId1, testUserId2)

    // delete UserFollow and validate
    await _lib.deleteUserFollowAndValidate(socialFeatureFactory, accounts[0], testUserId1, testUserId2)
  })

  it('Should fail to add UserFollow with non-existent user', async () => {
    let caughtError = false
    try {
      await _lib.addUserFollowAndValidate(socialFeatureFactory, accounts[0], testUserId1, testUserId3)
    } catch (e) {
      // handle expected error
      if (e.message.indexOf('must provide valid userID') >= 0) {
        caughtError = true
      } else {
        // unexpected error - throw normally
        throw e
      }
    }
    assert.isTrue(caughtError, 'Call succeeded unexpectedly')
  })

  it('Should fail to add UserFollow with duplicate IDs', async () => {
    let caughtError = false
    try {
      await _lib.addUserFollowAndValidate(socialFeatureFactory, accounts[0], testUserId1, testUserId1)
    } catch (e) {
      // handle expected error
      if (e.message.indexOf('userIDs cannot be the same') >= 0) {
        caughtError = true
      } else {
        // unexpected error - throw normally
        throw e
      }
    }
    assert.isTrue(caughtError, 'Call succeeded unexpectedly')
  })

  it('Should fail to delete UserFollow with non-existent user', async () => {
    let caughtError = false
    try {
      await _lib.deleteUserFollowAndValidate(socialFeatureFactory, accounts[0], testUserId1, testUserId3)
    } catch (e) {
      // handle expected error
      if (e.message.indexOf('must provide valid userID') >= 0) {
        caughtError = true
      } else {
        // unexpected error - throw normally
        throw e
      }
    }
    assert.isTrue(caughtError, 'Call succeeded unexpectedly')
  })

  it('Should fail to add UserFollow due to lack of ownership of follower user', async () => {
    let caughtError = false
    try {
      await _lib.addUserFollowAndValidate(socialFeatureFactory, accounts[1], testUserId1, testUserId2)
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

  it('Should fail to delete UserFollow due to lack of ownership of follower user', async () => {
    let caughtError = false
    try {
      await _lib.deleteUserFollowAndValidate(socialFeatureFactory, accounts[1], testUserId1, testUserId2)
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
