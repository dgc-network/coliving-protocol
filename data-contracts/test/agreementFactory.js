import * as _lib from './_lib/lib.js'
import {
  Registry,
  UserStorage,
  AgreementStorage,
  UserFactory,
  AgreementFactory
} from './_lib/artifacts.js'
import * as _constants from './utils/constants'
import { parseTx } from './utils/parser'
import { getAgreementFromFactory } from './utils/getters'

contract('AgreementFactory', async (accounts) => {
  const testUserId = 1
  const testUserId2 = 2
  const testAgreementId1 = 1
  const testAgreementId2 = 2

  let registry
  let userStorage
  let userFactory
  let agreementStorage
  let agreementFactory

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
  })

  it('Should add single digital_content', async () => {
    // add user to associate digital_content with
    await _lib.addUserAndValidate(
      userFactory,
      testUserId,
      accounts[0],
      _constants.testMultihash.digest1,
      _constants.userHandle1,
      true
    )

    // Add digital_content
    await _lib.addAgreementAndValidate(
      agreementFactory,
      testAgreementId1,
      accounts[0],
      testUserId,
      _constants.testMultihash.digest2,
      _constants.testMultihash.hashFn,
      _constants.testMultihash.size
    )
  })

  it('Should fail to add digital_content due to lack of ownership of digital_content owner', async () => {
    // add user to associate digital_content with
    await _lib.addUserAndValidate(
      userFactory,
      testUserId,
      accounts[0],
      _constants.testMultihash.digest1,
      _constants.userHandle1,
      true
    )

    // attempt to add digital_content from different account
    let caughtError = false
    try {
      // Add digital_content
      await _lib.addAgreementAndValidate(
        agreementFactory,
        testAgreementId1,
        accounts[1],
        testUserId,
        _constants.testMultihash.digest2,
        _constants.testMultihash.hashFn,
        _constants.testMultihash.size
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
      "Failed to handle case where calling address tries to add digital_content for user it doesn't own"
    )
  })

  it('Should add multiple agreements', async () => {
    // add user to associate agreements with
    await _lib.addUserAndValidate(
      userFactory,
      testUserId,
      accounts[0],
      _constants.testMultihash.digest1,
      _constants.userHandle1,
      true)

    // add two agreements
    await _lib.addAgreementAndValidate(
      agreementFactory,
      testAgreementId1,
      accounts[0],
      testUserId,
      _constants.testMultihash.digest2,
      _constants.testMultihash.hashFn,
      _constants.testMultihash.size)
    await _lib.addAgreementAndValidate(
      agreementFactory,
      testAgreementId2,
      accounts[0],
      testUserId,
      _constants.testMultihash.digest3,
      _constants.testMultihash.hashFn,
      _constants.testMultihash.size)
  })

  it('Should upgrade AgreementStorage used by AgreementFactory', async () => {
    // add user to associate digital_content with
    await _lib.addUserAndValidate(
      userFactory,
      testUserId,
      accounts[0],
      _constants.testMultihash.digest1,
      _constants.userHandle1,
      true)

    // add digital_content and validate transaction
    await _lib.addAgreementAndValidate(
      agreementFactory,
      testAgreementId1,
      accounts[0],
      testUserId,
      _constants.testMultihash.digest2,
      _constants.testMultihash.hashFn,
      _constants.testMultihash.size)

    // deploy new AgreementStorage contract instance
    let agreementStorage2 = await AgreementStorage.new(registry.address)

    // upgrade registered AgreementStorage
    await registry.upgradeContract(_constants.agreementStorageKey, agreementStorage2.address)

    // confirm first AgreementStorage instance is dead
    _lib.assertNoContractExists(agreementStorage.address)

    // add another digital_content and validate transaction
    await _lib.addAgreementAndValidate(
      agreementFactory,
      testAgreementId1,
      accounts[0],
      testUserId,
      _constants.testMultihash.digest2,
      _constants.testMultihash.hashFn,
      _constants.testMultihash.size)
  })

  it('Should update single digital_content', async () => {
    // Define initial and update data
    let initialData = {
      userId: testUserId,
      digest: _constants.testMultihash.digest1,
      hashFn: _constants.testMultihash.hashFn,
      size: _constants.testMultihash.size
    }

    let updateData = {
      userId: testUserId2,
      digest: _constants.testMultihash.digest3,
      hashFn: 32,
      size: 16
    }

    // add user to associate digital_content with
    await _lib.addUserAndValidate(
      userFactory,
      initialData.userId,
      accounts[0],
      initialData.digest,
      _constants.userHandle1,
      _constants.isCreatorTrue)

    // add 2nd user
    await _lib.addUserAndValidate(
      userFactory,
      updateData.userId,
      accounts[0],
      initialData.digest,
      _constants.userHandle2,
      _constants.isCreatorTrue)

    // Add digital_content
    await _lib.addAgreementAndValidate(
      agreementFactory,
      testAgreementId1,
      accounts[0],
      initialData.userId,
      _constants.testMultihash.digest1,
      _constants.testMultihash.hashFn,
      _constants.testMultihash.size)

    const tx = await _lib.updateAgreement(
      agreementFactory,
      accounts[0],
      testAgreementId1,
      updateData.userId,
      updateData.digest,
      updateData.hashFn,
      updateData.size
    )

    // Verify event contents as expected
    let eventArgs = parseTx(tx).event.args
    assert.isTrue(eventArgs._multihashDigest === updateData.digest, 'Event argument - expect updated digest')
    assert.isTrue(eventArgs._multihashHashFn.toNumber() === updateData.hashFn, 'Event argument - expect updated hash')
    assert.isTrue(eventArgs._multihashSize.toNumber() === updateData.size, 'Event argument - expect updated size')
    assert.isTrue(eventArgs._digital_contentOwnerId.toNumber() === updateData.userId, 'Event argument - expect updated userId')

    // Verify updated contents on chain
    let agreementFromChain = await getAgreementFromFactory(
      testAgreementId1,
      agreementFactory)

    assert.isTrue(agreementFromChain.agreementOwnerId.toNumber() === updateData.userId, 'Expect updated userId on chain')
    assert.isTrue(agreementFromChain.multihashDigest === updateData.digest, 'Expect updated digest')
    assert.isTrue(agreementFromChain.multihashHashFn.toNumber() === updateData.hashFn, 'Expect updated hash')
    assert.isTrue(agreementFromChain.multihashSize.toNumber() === updateData.size, 'Expect updated size')
  })

  it('Should fail to update digital_content due to lack of ownership of digital_content', async () => {
    // add user to associate digital_content with
    await _lib.addUserAndValidate(
      userFactory,
      testUserId,
      accounts[0],
      _constants.testMultihash.digest1,
      _constants.userHandle1,
      true
    )

    // Add digital_content
    await _lib.addAgreementAndValidate(
      agreementFactory,
      testAgreementId1,
      accounts[0],
      testUserId,
      _constants.testMultihash.digest2,
      _constants.testMultihash.hashFn,
      _constants.testMultihash.size
    )

    // attempt to update digital_content from different account
    let caughtError = false
    try {
      await _lib.updateAgreement(
        agreementFactory,
        accounts[1],
        testAgreementId1,
        testUserId,
        _constants.testMultihash.digest2,
        _constants.testMultihash.hashFn,
        _constants.testMultihash.size
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
      'Failed to handle case where calling address tries to update digital_content it does not own'
    )
  })

  it('Should delete single digital_content', async () => {
    // add user
    await _lib.addUserAndValidate(
      userFactory,
      testUserId,
      accounts[0],
      _constants.testMultihash.digest1,
      _constants.userHandle1,
      true)

    // Add digital_content
    await _lib.addAgreementAndValidate(
      agreementFactory,
      testAgreementId1,
      accounts[0],
      testUserId,
      _constants.testMultihash.digest2,
      _constants.testMultihash.hashFn,
      _constants.testMultihash.size)

    // delete digital_content
    await _lib.deleteAgreementAndValidate(
      agreementFactory,
      accounts[0],
      testAgreementId1)
  })

  it('Should fail to delete non-existent digital_content', async () => {
    // add user
    await _lib.addUserAndValidate(
      userFactory,
      testUserId,
      accounts[0],
      _constants.testMultihash.digest1,
      _constants.userHandle1,
      true
    )

    // attempt to delete non-existent digital_content
    let caughtError = false
    try {
      await _lib.deleteAgreementAndValidate(
        agreementFactory,
        accounts[0],
        testAgreementId1
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
      'Failed to handle case where calling address tries to delete non-existent digital_content'
    )
  })

  it('Should fail to delete digital_content due to lack of ownership of digital_content', async () => {
    // add user to associate digital_content with
    await _lib.addUserAndValidate(
      userFactory,
      testUserId,
      accounts[0],
      _constants.testMultihash.digest1,
      _constants.userHandle1,
      true
    )

    // Add digital_content
    await _lib.addAgreementAndValidate(
      agreementFactory,
      testAgreementId1,
      accounts[0],
      testUserId,
      _constants.testMultihash.digest2,
      _constants.testMultihash.hashFn,
      _constants.testMultihash.size
    )

    // attempt to delete digital_content from different account
    let caughtError = false
    try {
      await _lib.deleteAgreementAndValidate(
        agreementFactory,
        accounts[1],
        testAgreementId1
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
      'Failed to handle case where calling address tries to delete digital_content it does not own'
    )
  })
})
