import * as _lib from './_lib/lib.js'
import {
  Registry,
  UserStorage,
  UserFactory,
  DigitalContentStorage,
  DigitalContentFactory,
  ContentListStorage,
  ContentListFactory,
  UserLibraryFactory
} from './_lib/artifacts.js'
import * as _constants from './utils/constants'

contract('UserLibrary', async (accounts) => {
  const testUserId1 = 1
  const testUserId2 = 2
  const testDigitalContentId1 = 1
  const testDigitalContentId2 = 2
  const invalidUserId = 3
  const invalidDigitalContentId = 3
  const invalidContentListId = 2

  let contentListName = 'UserLibrary Test ContentList'
  let contentListDigitalContents = [1, 2]
  let expectedContentListId = 1
  let contentListOwnerId = testUserId1

  let registry
  let userStorage
  let userFactory
  let digitalContentStorage
  let digitalContentFactory
  let contentListStorage
  let contentListFactory
  let userLibraryFactory

  beforeEach(async () => {
    // init contract state
    registry = await Registry.new()
    const networkId = Registry.network_id
    userStorage = await UserStorage.new(registry.address)
    await registry.addContract(_constants.userStorageKey, userStorage.address)
    digitalContentStorage = await DigitalContentStorage.new(registry.address)
    await registry.addContract(_constants.digitalContentStorageKey, digitalContentStorage.address)
    userFactory = await UserFactory.new(registry.address, _constants.userStorageKey, networkId, accounts[5])
    await registry.addContract(_constants.userFactoryKey, userFactory.address)
    digitalContentFactory = await DigitalContentFactory.new(registry.address, _constants.digitalContentStorageKey, _constants.userFactoryKey, networkId)
    await registry.addContract(_constants.digitalContentFactoryKey, digitalContentFactory.address)

    // Deploy contentList related contracts
    contentListStorage = await ContentListStorage.new(registry.address)
    await registry.addContract(_constants.contentListStorageKey, contentListStorage.address)
    contentListFactory = await ContentListFactory.new(
      registry.address,
      _constants.contentListStorageKey,
      _constants.userFactoryKey,
      _constants.digitalContentFactoryKey,
      networkId)

    await registry.addContract(_constants.contentListFactoryKey, contentListFactory.address)

    userLibraryFactory = await UserLibraryFactory.new(
      registry.address,
      _constants.userFactoryKey,
      _constants.digitalContentFactoryKey,
      _constants.contentListFactoryKey,
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

    // Add 2 digitalContents
    await _lib.addDigitalContentAndValidate(
      digitalContentFactory,
      testDigitalContentId1,
      accounts[0],
      testUserId1,
      _constants.testMultihash.digest2,
      _constants.testMultihash.hashFn,
      _constants.testMultihash.size)
    await _lib.addDigitalContentAndValidate(
      digitalContentFactory,
      testDigitalContentId2,
      accounts[0],
      testUserId2,
      _constants.testMultihash.digest2,
      _constants.testMultihash.hashFn,
      _constants.testMultihash.size)

    // Add a contentList
    await _lib.addContentListAndValidate(
      contentListFactory,
      expectedContentListId,
      accounts[0],
      contentListOwnerId,
      contentListName,
      false,
      false,
      contentListDigitalContents)
  })

  it('Should add one digital_content save', async () => {
    // add digital_content save and validate
    await _lib.addDigitalContentSaveAndValidate(
      userLibraryFactory,
      accounts[0],
      testUserId1,
      testDigitalContentId1)
  })

  it('Should delete one digital_content save', async () => {
    // add digital_content save and validate
    await _lib.addDigitalContentSaveAndValidate(
      userLibraryFactory,
      accounts[0],
      testUserId1,
      testDigitalContentId1)

    // delete digital content save and validate
    await _lib.deleteDigitalContentSaveAndValidate(
      userLibraryFactory,
      accounts[0],
      testUserId1,
      testDigitalContentId1)
  })

  it('Should add one contentList save', async () => {
    // add contentList save and validate
    await _lib.addContentListSaveAndValidate(
      userLibraryFactory,
      accounts[0],
      testUserId1,
      expectedContentListId)
  })

  it('Should delete one contentList save', async () => {
    // add contentList save and validate
    await _lib.addContentListSaveAndValidate(
      userLibraryFactory,
      accounts[0],
      testUserId1,
      expectedContentListId
    )

    // delete contentList save and validate
    await _lib.deleteContentListSaveAndValidate(
      userLibraryFactory,
      accounts[0],
      testUserId1,
      expectedContentListId
    )
  })

  it('Should fail to add contentList save with non-existent user and non-existent contentList', async () => {
    let caughtError = false
    try {
      // add contentList save with invalid user
      await _lib.addContentListSaveAndValidate(
        userLibraryFactory,
        accounts[0],
        invalidUserId,
        expectedContentListId)
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
      // add contentList save with invalid contentList
      await _lib.addContentListSaveAndValidate(
        userLibraryFactory,
        accounts[0],
        testUserId1,
        invalidContentListId)
    } catch (e) {
      // handle expected error
      if (e.message.indexOf('valid contentList ID') >= 0) {
        caughtError = true
      } else {
        // unexpected error - throw normally
        console.log('throwing unexpected err')
        throw e
      }
    }
    assert.isTrue(caughtError, 'Call succeeded unexpectedly')
  })

  it('Should fail to delete contentList save with non-existent user and non-existent contentList', async () => {
    let caughtError = false
    try {
      // add contentList save with invalid user
      await _lib.deleteContentListSaveAndValidate(
        userLibraryFactory,
        accounts[0],
        invalidUserId,
        expectedContentListId)
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
      // add contentList save with invalid contentList
      await _lib.deleteContentListSaveAndValidate(
        userLibraryFactory,
        accounts[0],
        testUserId1,
        invalidContentListId)
    } catch (e) {
      // handle expected error
      if (e.message.indexOf('valid contentList ID') >= 0) {
        caughtError = true
      } else {
        // unexpected error - throw normally
        console.log('throwing unexpected err')
        throw e
      }
    }
    assert.isTrue(caughtError, 'Call succeeded unexpectedly')
  })

  it('Should fail to add digital_content save with non-existent user and non-existent digital_content', async () => {
    let caughtError = false
    try {
      await _lib.addDigitalContentSaveAndValidate(
        userLibraryFactory,
        accounts[0],
        invalidUserId,
        testDigitalContentId1)
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
      await _lib.addDigitalContentSaveAndValidate(
        userLibraryFactory,
        accounts[0],
        testUserId1,
        invalidDigitalContentId)
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

  it('Should fail to delete digital content save with non-existent user and non-existent digital_content', async () => {
    let caughtError = false
    try {
      await _lib.deleteDigitalContentSaveAndValidate(
        userLibraryFactory,
        accounts[0],
        invalidUserId,
        testDigitalContentId1)
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
      await _lib.deleteDigitalContentSaveAndValidate(
        userLibraryFactory,
        accounts[0],
        testUserId1,
        invalidDigitalContentId)
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

  it('Should fail to add digital_content save due to lack of ownership of user', async () => {
    let caughtError = false
    try {
      await _lib.addDigitalContentSaveAndValidate(
        userLibraryFactory,
        accounts[8],
        testUserId1,
        testDigitalContentId1)
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

  it('Should fail to add contentList save due to lack of ownership of user', async () => {
    let caughtError = false
    try {
      await _lib.addContentListSaveAndValidate(
        userLibraryFactory,
        accounts[8],
        testUserId1,
        expectedContentListId
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

  it('Should fail to delete digital content save due to lack of ownership of user', async () => {
    // add digital_content save and validate
    await _lib.addDigitalContentSaveAndValidate(
      userLibraryFactory,
      accounts[0],
      testUserId1,
      testDigitalContentId1
    )
    let caughtError = false
    try {
      await _lib.deleteDigitalContentSaveAndValidate(
        userLibraryFactory,
        accounts[8],
        testUserId1,
        testDigitalContentId1
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

  it('Should fail to delete contentList save due to lack of ownership of user', async () => {
    // add contentList save and validate
    await _lib.addContentListSaveAndValidate(
      userLibraryFactory,
      accounts[0],
      testUserId1,
      expectedContentListId
    )

    let caughtError = false
    try {
      await _lib.deleteContentListSaveAndValidate(
        userLibraryFactory,
        accounts[8],
        testUserId1,
        expectedContentListId
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
