import * as _lib from './_lib/lib.js'
import {
  Registry,
  UserStorage,
  UserFactory,
  AgreementStorage,
  AgreementFactory,
  ContentListStorage,
  ContentListFactory,
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
  const invalidContentListId = 2

  let contentListName = 'UserLibrary Test ContentList'
  let contentListAgreements = [1, 2]
  let expectedContentListId = 1
  let contentListOwnerId = testUserId1

  let registry
  let userStorage
  let userFactory
  let agreementStorage
  let agreementFactory
  let contentListStorage
  let contentListFactory
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

    // Deploy contentList related contracts
    contentListStorage = await ContentListStorage.new(registry.address)
    await registry.addContract(_constants.contentListStorageKey, contentListStorage.address)
    contentListFactory = await ContentListFactory.new(
      registry.address,
      _constants.contentListStorageKey,
      _constants.userFactoryKey,
      _constants.agreementFactoryKey,
      networkId)

    await registry.addContract(_constants.contentListFactoryKey, contentListFactory.address)

    userLibraryFactory = await UserLibraryFactory.new(
      registry.address,
      _constants.userFactoryKey,
      _constants.agreementFactoryKey,
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

    // Add a contentList
    await _lib.addContentListAndValidate(
      contentListFactory,
      expectedContentListId,
      accounts[0],
      contentListOwnerId,
      contentListName,
      false,
      false,
      contentListAgreements)
  })

  it('Should add one digital_content save', async () => {
    // add digital_content save and validate
    await _lib.addAgreementSaveAndValidate(
      userLibraryFactory,
      accounts[0],
      testUserId1,
      testAgreementId1)
  })

  it('Should delete one digital_content save', async () => {
    // add digital_content save and validate
    await _lib.addAgreementSaveAndValidate(
      userLibraryFactory,
      accounts[0],
      testUserId1,
      testAgreementId1)

    // delete digital_content save and validate
    await _lib.deleteAgreementSaveAndValidate(
      userLibraryFactory,
      accounts[0],
      testUserId1,
      testAgreementId1)
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
      if (e.message.indexOf('must provide valid digital_content ID') >= 0) {
        caughtError = true
      } else {
        // unexpected error - throw normally
        throw e
      }
    }
    assert.isTrue(caughtError, 'Call succeeded unexpectedly')
  })

  it('Should fail to delete digital_content save with non-existent user and non-existent digital_content', async () => {
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

  it('Should fail to delete digital_content save due to lack of ownership of user', async () => {
    // add digital_content save and validate
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
