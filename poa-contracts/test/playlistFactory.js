import * as _lib from './_lib/lib.js'
import * as _constants from './utils/constants'
import {
  Registry,
  UserStorage,
  UserFactory,
  AgreementStorage,
  AgreementFactory,
  ContentListStorage,
  ContentListFactory
} from './_lib/artifacts.js'

contract('ContentListFactory', async (accounts) => {
  const testUserId1 = 1
  const testUserId2 = 2
  const testAgreementId1 = 1
  const testAgreementId2 = 2
  const testAgreementId3 = 3

  let content listName = 'ContentListFactory Test ContentList'
  let content listAgreements = [1, 2]
  let expectedContentListId = 1
  let content listOwnerId = testUserId1

  let registry
  let userStorage
  let userFactory
  let agreementStorage
  let agreementFactory
  let content listStorage
  let content listFactory

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

    // Deploy content list related contracts
    content listStorage = await ContentListStorage.new(registry.address)
    await registry.addContract(_constants.content listStorageKey, content listStorage.address)
    content listFactory = await ContentListFactory.new(
      registry.address,
      _constants.content listStorageKey,
      _constants.userFactoryKey,
      _constants.agreementFactoryKey,
      networkId)

    await registry.addContract(_constants.content listFactoryKey, content listFactory.address)

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

  it('Should create a content list', async () => {
    await _lib.addContentListAndValidate(
      content listFactory,
      expectedContentListId,
      accounts[0],
      content listOwnerId,
      content listName,
      false,
      false,
      content listAgreements)
  })

  it('Should create a content list and add a separate agreement', async () => {
    // Add a 3rd agreement that is not in the initial content list agreements list
    await _lib.addAgreementAndValidate(
      agreementFactory,
      testAgreementId3,
      accounts[0],
      testUserId2,
      _constants.testMultihash.digest2,
      _constants.testMultihash.hashFn,
      _constants.testMultihash.size)

    // Create content list
    await _lib.addContentListAndValidate(
      content listFactory,
      expectedContentListId,
      accounts[0],
      content listOwnerId,
      content listName,
      false,
      false,
      content listAgreements)

    await _lib.addContentListAgreement(
      content listFactory,
      accounts[0],
      expectedContentListId,
      testAgreementId3)
  })

  it('Should create a content list and delete a agreement', async () => {
    // Create content list
    await _lib.addContentListAndValidate(
      content listFactory,
      expectedContentListId,
      accounts[0],
      content listOwnerId,
      content listName,
      false,
      false,
      content listAgreements)

    await _lib.deleteContentListAgreement(
      content listFactory,
      accounts[0],
      expectedContentListId,
      testAgreementId2,
      1551912253)
  })

  it('Should create a content list and perform update operations', async () => {
    // Test following update operations:
    // 1 - Reorder agreements
    // 2 - Update content list name
    // 3 - Update content list privacy
    // 4 - Update content list cover photo
    // 5 - Update content list UPC
    // Create content list
    await _lib.addContentListAndValidate(
      content listFactory,
      expectedContentListId,
      accounts[0],
      content listOwnerId,
      content listName,
      false,
      false,
      content listAgreements)

    let content listAgreementsNewOrder = [2, 1]

    // 1 - Update content list order
    await _lib.orderContentListAgreementsAndValidate(
      content listFactory,
      accounts[0],
      expectedContentListId,
      content listAgreementsNewOrder)

    // 2 - Update content list name
    await _lib.updateContentListNameAndValidate(
      content listFactory,
      accounts[0],
      expectedContentListId,
      'Updated test content list name')

    // 3 - Update content list privacy
    await _lib.updateContentListPrivacyAndValidate(
      content listFactory,
      accounts[0],
      expectedContentListId,
      true)

    // Attempt updating a content list order with an invalid agreement
    let invalidContentListAgreementsOrder = [2, 3, 1]
    let updatedAgreementOrder = null
    try {
      await _lib.orderContentListAgreementsAndValidate(
        content listFactory,
        accounts[0],
        expectedContentListId,
        invalidContentListAgreementsOrder)

      updatedAgreementOrder = true
    } catch (err) {
      // Update flag to indicate that invalid update cannot be performed
      if (err.message.indexOf('Expected valid content list agreement id') >= 0) {
        updatedAgreementOrder = false
      }
    }

    assert.isFalse(
      updatedAgreementOrder,
      'Expect failure with invalid agreement ID in reorder operation')

    // 4 - Update content list cover photo
    await _lib.updateContentListCoverPhotoAndValidate(
      content listFactory,
      accounts[0],
      expectedContentListId,
      _constants.userMetadata.coverPhotoDigest)

    // 5 - Update content list description
    await _lib.updateContentListDescriptionAndValidate(
      content listFactory,
      accounts[0],
      expectedContentListId,
      'Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis')

    // 6 - Update content list UPC
    // TODO: Fix these numbas yo
    await _lib.updateContentListUPCAndValidate(
      content listFactory,
      accounts[0],
      expectedContentListId,
      web3.utils.utf8ToHex('123456789abc'))

    // 7 - Update operations with invalid fields
    let invalidContentListId = 50
    let caughtError = false
    try {
      await _lib.updateContentListPrivacyAndValidate(
        content listFactory,
        accounts[0],
        invalidContentListId,
        true)
    } catch (e) {
      if (e.message.indexOf('Must provide valid content list ID')) {
        caughtError = true
      }
    }
    assert.isTrue(caughtError, 'Call succeeded unexpectedly')

    caughtError = false
    try {
      await _lib.updateContentListPrivacyAndValidate(
        content listFactory,
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

  it('Should create then delete a content list', async () => {
    await _lib.addContentListAndValidate(
      content listFactory,
      expectedContentListId,
      accounts[0],
      content listOwnerId,
      content listName,
      false,
      false,
      content listAgreements
    )
    await _lib.deleteContentListAndValidate(
      content listFactory,
      accounts[0],
      expectedContentListId
    )
  })

  it('Should fail to create content list with non-existent user', async () => {
    let caughtError = false
    try {
      await _lib.addContentListAndValidate(
        content listFactory,
        expectedContentListId,
        accounts[0],
        10,
        content listName,
        false,
        false,
        content listAgreements
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
      'Failed to handle case where caller tries to create content list with non-existent user'
    )
  })

  it('Should fail to create content list with user that caller does not own', async () => {
    let caughtError = false
    try {
      await _lib.addContentListAndValidate(
        content listFactory,
        expectedContentListId,
        accounts[1],
        content listOwnerId,
        content listName,
        false,
        false,
        content listAgreements
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
      'Failed to handle case where caller tries to create content list user that it does not own'
    )
  })

  it('Should fail to update non-existent content list', async () => {
    let caughtError = false
    try {
      await _lib.updateContentListNameAndValidate(
        content listFactory,
        accounts[0],
        expectedContentListId,
        'Updated test content list name'
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
      'Failed to handle case where caller tries to update non-existent content list'
    )
  })

  it('Should fail to update content list that caller does not own', async () => {
    await _lib.addContentListAndValidate(
      content listFactory,
      expectedContentListId,
      accounts[0],
      content listOwnerId,
      content listName,
      false,
      false,
      content listAgreements
    )

    let caughtError = false
    try {
      await _lib.updateContentListNameAndValidate(
        content listFactory,
        accounts[1],
        expectedContentListId,
        'Updated test content list name'
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
      'Failed to handle case where caller tries to update content list that caller does not own'
    )
  })

  it('Should fail to delete non-existent content list', async () => {
    let caughtError = false
    try {
      await _lib.deleteContentListAndValidate(
        content listFactory,
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
      'Failed to handle case where caller tries to delete non-existent content list'
    )
  })

  it('Should fail to delete content list that caller does not own', async () => {
    await _lib.addContentListAndValidate(
      content listFactory,
      expectedContentListId,
      accounts[0],
      content listOwnerId,
      content listName,
      false,
      false,
      content listAgreements
    )

    let caughtError = false
    try {
      await _lib.deleteContentListAndValidate(
        content listFactory,
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
      'Failed to handle case where caller tries to delete content list that caller does not own'
    )
  })
})
