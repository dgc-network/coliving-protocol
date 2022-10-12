import * as _lib from './_lib/lib.js'
import {
  Registry,
  UserStorage,
  UserFactory,
  AgreementStorage,
  AgreementFactory,
  ContentListStorage,
  ContentListFactory,
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

  let contentListName1 = 'contentListName1'
  let contentListAgreements1 = [1, 2]
  let contentListId1 = 1
  let contentListId2 = 2
  let contentListIsAlbum1 = false

  let registry
  let userStorage
  let userFactory
  let agreementStorage
  let agreementFactory
  let contentListStorage
  let contentListFactory
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
    contentListStorage = await ContentListStorage.new(registry.address)
    await registry.addContract(_constants.contentListStorageKey, contentListStorage.address)
    contentListFactory = await ContentListFactory.new(registry.address, _constants.contentListStorageKey, _constants.userFactoryKey, _constants.agreementFactoryKey, networkId)
    await registry.addContract(_constants.contentListFactoryKey, contentListFactory.address)
    socialFeatureStorage = await SocialFeatureStorage.new(registry.address)
    await registry.addContract(_constants.socialFeatureStorageKey, socialFeatureStorage.address)
    socialFeatureFactory = await SocialFeatureFactory.new(registry.address, _constants.socialFeatureStorageKey, _constants.userFactoryKey, _constants.agreementFactoryKey, _constants.contentListFactoryKey, networkId)
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

    await _lib.addContentListAndValidate(
      contentListFactory,
      contentListId1,
      accounts[0],
      testUserId1,
      contentListName1,
      false,
      contentListIsAlbum1,
      contentListAgreements1
    )
  })

  /******************** AgreementRepost ********************/
  /*****************************************************/

  it('Should add one AgreementRepost', async () => {
    // add digital_content repost and validate
    await _lib.addAgreementRepostAndValidate(socialFeatureFactory, accounts[0], testUserId1, testAgreementId1)
  })

  it('Should add and delete one AgreementRepost', async () => {
    // add digital_content repost and validate
    await _lib.addAgreementRepostAndValidate(socialFeatureFactory, accounts[0], testUserId1, testAgreementId1)

    // delete digital_content repost and validate
    await _lib.deleteAgreementRepostAndValidate(socialFeatureFactory, accounts[0], testUserId1, testAgreementId1)
  })

  it('Should confirm duplicate add/delete AgreementReposts throw', async () => {
    // add digital_content repost and validate
    await _lib.addAgreementRepostAndValidate(socialFeatureFactory, accounts[0], testUserId1, testAgreementId1)

    // confirm duplicate digital_content repost throws
    let caughtError = false
    try {
      await _lib.addAgreementRepostAndValidate(socialFeatureFactory, accounts[0], testUserId1, testAgreementId1)
    } catch (e) {
      if (e.message.indexOf('digital_content repost already exists') >= 0) {
        caughtError = true
      } else {
        // unexpected error - throw normally
        throw e
      }
    }
    assert.isTrue(caughtError, 'Call succeeded unexpectedly')

    // delete digital_content repost and validate
    await _lib.deleteAgreementRepostAndValidate(socialFeatureFactory, accounts[0], testUserId1, testAgreementId1)

    // confirm duplicate digital_content repost delete throws
    caughtError = false
    try {
      await _lib.deleteAgreementRepostAndValidate(socialFeatureFactory, accounts[0], testUserId1, testAgreementId1)
    } catch (e) {
      if (e.message.indexOf('digital_content repost does not exist') >= 0) {
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

  it('Should fail to delete AgreementRepost with non-existent digital_content', async () => {
    let caughtError = false
    try {
      await _lib.deleteAgreementRepostAndValidate(socialFeatureFactory, accounts[0], testUserId1, testAgreementId3)
    } catch (e) {
      // handle expected error
      if (e.message.indexOf('must provide valid digital_content ID') >= 0) {
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

  /******************** ContentListRepost ********************/
  /********************************************************/

  it('Should add one ContentListRepost', async () => {
    await _lib.addContentListRepostAndValidate(socialFeatureFactory, accounts[0], testUserId1, contentListId1)
  })

  it('Should add and delete one ContentListRepost', async () => {
    await _lib.addContentListRepostAndValidate(socialFeatureFactory, accounts[0], testUserId1, contentListId1)
    await _lib.deleteContentListRepostAndValidate(socialFeatureFactory, accounts[0], testUserId1, contentListId1)
  })

  it('Should confirm duplicate add/delete ContentListRepost throws', async () => {
    // add contentList repost
    await _lib.addContentListRepostAndValidate(socialFeatureFactory, accounts[0], testUserId1, contentListId1)

    // confirm duplicate contentList repost throws
    let caughtError = false
    try {
      await _lib.addContentListRepostAndValidate(socialFeatureFactory, accounts[0], testUserId1, contentListId1)
    } catch (e) {
      if (e.message.indexOf('contentList repost already exists') >= 0) {
        caughtError = true
      } else {
        // unexpected error - throw normally
        throw e
      }
    }
    assert.isTrue(caughtError, 'Call succeeded unexpectedly')

    // delete contentList repost
    await _lib.deleteContentListRepostAndValidate(socialFeatureFactory, accounts[0], testUserId1, contentListId1)

    // confirm duplicate contentList repost delete throws
    caughtError = false
    try {
      await _lib.deleteContentListRepostAndValidate(socialFeatureFactory, accounts[0], testUserId1, contentListId1)
    } catch (e) {
      if (e.message.indexOf('contentList repost does not exist') >= 0) {
        caughtError = true
      } else {
        // unexpected error - throw normally
        throw e
      }
    }
    assert.isTrue(caughtError, 'Call succeeded unexpectedly')
  })

  it('Should fail to add ContentListRepost with non-existent user', async () => {
    let caughtError = false
    try {
      await _lib.addContentListRepostAndValidate(socialFeatureFactory, accounts[0], testUserId3, contentListId1)
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

  it('Should fail to add ContentListRepost with non-existent contentList', async () => {
    let caughtError = false
    try {
      await _lib.addContentListRepostAndValidate(socialFeatureFactory, accounts[0], testUserId1, contentListId2)
    } catch (e) {
      // handle expected error
      if (e.message.indexOf('must provide valid contentList ID') >= 0) {
        caughtError = true
      } else {
        // unexpected error - throw normally
        throw e
      }
    }
    assert.isTrue(caughtError, 'Call succeeded unexpectedly')
  })

  it('Should fail to add ContentListRepost due to lack of ownership of reposter user', async () => {
    let caughtError = false
    try {
      await _lib.addContentListRepostAndValidate(socialFeatureFactory, accounts[1], testUserId1, contentListId1)
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

  it('Should fail to delete ContentListRepost due to lack of ownership of reposter user', async () => {
    let caughtError = false
    try {
      await _lib.deleteContentListRepostAndValidate(socialFeatureFactory, accounts[1], testUserId1, contentListId1)
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
