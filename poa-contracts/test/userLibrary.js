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

  let content listName = 'UserLibrary Test ContentList'
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

    userLibraryFactory = await UserLibraryFactory.new(
      registry.address,
      _constants.userFactoryKey,
      _constants.agreementFactoryKey,
      _constants.content listFactoryKey,
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

    // Add a content list
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

  it('Should add one content list save', async () => {
    // add content list save and validate
    await _lib.addContentListSaveAndValidate(
      userLibraryFactory,
      accounts[0],
      testUserId1,
      expectedContentListId)
  })

  it('Should delete one content list save', async () => {
    // add content list save and validate
    await _lib.addContentListSaveAndValidate(
      userLibraryFactory,
      accounts[0],
      testUserId1,
      expectedContentListId
    )

    // delete content list save and validate
    await _lib.deleteContentListSaveAndValidate(
      userLibraryFactory,
      accounts[0],
      testUserId1,
      expectedContentListId
    )
  })

  it('Should fail to add content list save with non-existent user and non-existent content list', async () => {
    let caughtError = false
    try {
      // add content list save with invalid user
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
      // add content list save with invalid content list
      await _lib.addContentListSaveAndValidate(
        userLibraryFactory,
        accounts[0],
        testUserId1,
        invalidContentListId)
    } catch (e) {
      // handle expected error
      if (e.message.indexOf('valid content list ID') >= 0) {
        caughtError = true
      } else {
        // unexpected error - throw normally
        console.log('throwing unexpected err')
        throw e
      }
    }
    assert.isTrue(caughtError, 'Call succeeded unexpectedly')
  })

  it('Should fail to delete content list save with non-existent user and non-existent content list', async () => {
    let caughtError = false
    try {
      // add content list save with invalid user
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
      // add content list save with invalid content list
      await _lib.deleteContentListSaveAndValidate(
        userLibraryFactory,
        accounts[0],
        testUserId1,
        invalidContentListId)
    } catch (e) {
      // handle expected error
      if (e.message.indexOf('valid content list ID') >= 0) {
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

  it('Should fail to add content list save due to lack of ownership of user', async () => {
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

  it('Should fail to delete content list save due to lack of ownership of user', async () => {
    // add content list save and validate
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
