import * as _lib from './_lib/lib.js'
import * as _constants from './utils/constants'
import {
  Registry,
  UserStorage,
  UserFactory,
  DigitalContentStorage,
  DigitalContentFactory,
  ContentListStorage,
  ContentListFactory
} from './_lib/artifacts.js'

contract('ContentListFactory', async (accounts) => {
  const testUserId1 = 1
  const testUserId2 = 2
  const testDigitalContentId1 = 1
  const testDigitalContentId2 = 2
  const testDigitalContentId3 = 3

  let contentListName = 'ContentListFactory Test ContentList'
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

  beforeEach(async () => {
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

    // add two digitalContents
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
  })

  it('Should create a contentList', async () => {
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

  it('Should create a contentList and add a separate digital_content', async () => {
    // Add a 3rd digital_content that is not in the initial contentList digitalContents list
    await _lib.addDigitalContentAndValidate(
      digitalContentFactory,
      testDigitalContentId3,
      accounts[0],
      testUserId2,
      _constants.testMultihash.digest2,
      _constants.testMultihash.hashFn,
      _constants.testMultihash.size)

    // Create contentList
    await _lib.addContentListAndValidate(
      contentListFactory,
      expectedContentListId,
      accounts[0],
      contentListOwnerId,
      contentListName,
      false,
      false,
      contentListDigitalContents)

    await _lib.addContentListDigitalContent(
      contentListFactory,
      accounts[0],
      expectedContentListId,
      testDigitalContentId3)
  })

  it('Should create a contentList and delete a digital_content', async () => {
    // Create contentList
    await _lib.addContentListAndValidate(
      contentListFactory,
      expectedContentListId,
      accounts[0],
      contentListOwnerId,
      contentListName,
      false,
      false,
      contentListDigitalContents)

    await _lib.deleteContentListDigitalContent(
      contentListFactory,
      accounts[0],
      expectedContentListId,
      testDigitalContentId2,
      1551912253)
  })

  it('Should create a contentList and perform update operations', async () => {
    // Test following update operations:
    // 1 - Reorder digitalContents
    // 2 - Update contentList name
    // 3 - Update contentList privacy
    // 4 - Update contentList cover photo
    // 5 - Update contentList UPC
    // Create contentList
    await _lib.addContentListAndValidate(
      contentListFactory,
      expectedContentListId,
      accounts[0],
      contentListOwnerId,
      contentListName,
      false,
      false,
      contentListDigitalContents)

    let contentListDigitalContentsNewOrder = [2, 1]

    // 1 - Update contentList order
    await _lib.orderContentListDigitalContentsAndValidate(
      contentListFactory,
      accounts[0],
      expectedContentListId,
      contentListDigitalContentsNewOrder)

    // 2 - Update contentList name
    await _lib.updateContentListNameAndValidate(
      contentListFactory,
      accounts[0],
      expectedContentListId,
      'Updated test contentList name')

    // 3 - Update contentList privacy
    await _lib.updateContentListPrivacyAndValidate(
      contentListFactory,
      accounts[0],
      expectedContentListId,
      true)

    // Attempt updating a contentList order with an invalid digital_content
    let invalidContentListDigitalContentsOrder = [2, 3, 1]
    let updatedDigitalContentOrder = null
    try {
      await _lib.orderContentListDigitalContentsAndValidate(
        contentListFactory,
        accounts[0],
        expectedContentListId,
        invalidContentListDigitalContentsOrder)

      updatedDigitalContentOrder = true
    } catch (err) {
      // Update flag to indicate that invalid update cannot be performed
      if (err.message.indexOf('Expected valid contentList digital_content id') >= 0) {
        updatedDigitalContentOrder = false
      }
    }

    assert.isFalse(
      updatedDigitalContentOrder,
      'Expect failure with invalid digital_content ID in reorder operation')

    // 4 - Update contentList cover photo
    await _lib.updateContentListCoverPhotoAndValidate(
      contentListFactory,
      accounts[0],
      expectedContentListId,
      _constants.userMetadata.coverPhotoDigest)

    // 5 - Update contentList description
    await _lib.updateContentListDescriptionAndValidate(
      contentListFactory,
      accounts[0],
      expectedContentListId,
      'Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis')

    // 6 - Update contentList UPC
    // TODO: Fix these numbas yo
    await _lib.updateContentListUPCAndValidate(
      contentListFactory,
      accounts[0],
      expectedContentListId,
      web3.utils.utf8ToHex('123456789abc'))

    // 7 - Update operations with invalid fields
    let invalidContentListId = 50
    let caughtError = false
    try {
      await _lib.updateContentListPrivacyAndValidate(
        contentListFactory,
        accounts[0],
        invalidContentListId,
        true)
    } catch (e) {
      if (e.message.indexOf('Must provide valid contentList ID')) {
        caughtError = true
      }
    }
    assert.isTrue(caughtError, 'Call succeeded unexpectedly')

    caughtError = false
    try {
      await _lib.updateContentListPrivacyAndValidate(
        contentListFactory,
        accounts[1], // Incorrect account
        expectedContentListId,
        true)
    } catch (e) {
      if (e.message.indexOf('Invalid signature')) {
        caughtError = true
      }
    }
    assert.isTrue(caughtError, 'Call succeeded unexpectedly')
  })

  it('Should create then delete a contentList', async () => {
    await _lib.addContentListAndValidate(
      contentListFactory,
      expectedContentListId,
      accounts[0],
      contentListOwnerId,
      contentListName,
      false,
      false,
      contentListDigitalContents
    )
    await _lib.deleteContentListAndValidate(
      contentListFactory,
      accounts[0],
      expectedContentListId
    )
  })

  it('Should fail to create contentList with non-existent user', async () => {
    let caughtError = false
    try {
      await _lib.addContentListAndValidate(
        contentListFactory,
        expectedContentListId,
        accounts[0],
        10,
        contentListName,
        false,
        false,
        contentListDigitalContents
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
      'Failed to handle case where caller tries to create contentList with non-existent user'
    )
  })

  it('Should fail to create contentList with user that caller does not own', async () => {
    let caughtError = false
    try {
      await _lib.addContentListAndValidate(
        contentListFactory,
        expectedContentListId,
        accounts[1],
        contentListOwnerId,
        contentListName,
        false,
        false,
        contentListDigitalContents
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
      'Failed to handle case where caller tries to create contentList user that it does not own'
    )
  })

  it('Should fail to update non-existent contentList', async () => {
    let caughtError = false
    try {
      await _lib.updateContentListNameAndValidate(
        contentListFactory,
        accounts[0],
        expectedContentListId,
        'Updated test contentList name'
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
      'Failed to handle case where caller tries to update non-existent contentList'
    )
  })

  it('Should fail to update contentList that caller does not own', async () => {
    await _lib.addContentListAndValidate(
      contentListFactory,
      expectedContentListId,
      accounts[0],
      contentListOwnerId,
      contentListName,
      false,
      false,
      contentListDigitalContents
    )

    let caughtError = false
    try {
      await _lib.updateContentListNameAndValidate(
        contentListFactory,
        accounts[1],
        expectedContentListId,
        'Updated test contentList name'
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
      'Failed to handle case where caller tries to update contentList that caller does not own'
    )
  })

  it('Should fail to delete non-existent contentList', async () => {
    let caughtError = false
    try {
      await _lib.deleteContentListAndValidate(
        contentListFactory,
        accounts[0],
        expectedContentListId
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
      'Failed to handle case where caller tries to delete non-existent contentList'
    )
  })

  it('Should fail to delete contentList that caller does not own', async () => {
    await _lib.addContentListAndValidate(
      contentListFactory,
      expectedContentListId,
      accounts[0],
      contentListOwnerId,
      contentListName,
      false,
      false,
      contentListDigitalContents
    )

    let caughtError = false
    try {
      await _lib.deleteContentListAndValidate(
        contentListFactory,
        accounts[1],
        expectedContentListId
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
      'Failed to handle case where caller tries to delete contentList that caller does not own'
    )
  })
})
