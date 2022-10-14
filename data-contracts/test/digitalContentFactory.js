import * as _lib from './_lib/lib.js'
import {
  Registry,
  UserStorage,
  DigitalContentStorage,
  UserFactory,
  DigitalContentFactory
} from './_lib/artifacts.js'
import * as _constants from './utils/constants'
import { parseTx } from './utils/parser'
import { getDigitalContentFromFactory } from './utils/getters'

contract('DigitalContentFactory', async (accounts) => {
  const testUserId = 1
  const testUserId2 = 2
  const testDigitalContentId1 = 1
  const testDigitalContentId2 = 2

  let registry
  let userStorage
  let userFactory
  let digitalContentStorage
  let digitalContentFactory

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
  })

  it('Should add single digital content', async () => {
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
    await _lib.addDigitalContentAndValidate(
      digitalContentFactory,
      testDigitalContentId1,
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
      await _lib.addDigitalContentAndValidate(
        digitalContentFactory,
        testDigitalContentId1,
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

  it('Should add multiple digitalContents', async () => {
    // add user to associate digitalContents with
    await _lib.addUserAndValidate(
      userFactory,
      testUserId,
      accounts[0],
      _constants.testMultihash.digest1,
      _constants.userHandle1,
      true)

    // add two digitalContents
    await _lib.addDigitalContentAndValidate(
      digitalContentFactory,
      testDigitalContentId1,
      accounts[0],
      testUserId,
      _constants.testMultihash.digest2,
      _constants.testMultihash.hashFn,
      _constants.testMultihash.size)
    await _lib.addDigitalContentAndValidate(
      digitalContentFactory,
      testDigitalContentId2,
      accounts[0],
      testUserId,
      _constants.testMultihash.digest3,
      _constants.testMultihash.hashFn,
      _constants.testMultihash.size)
  })

  it('Should upgrade DigitalContentStorage used by DigitalContentFactory', async () => {
    // add user to associate digital_content with
    await _lib.addUserAndValidate(
      userFactory,
      testUserId,
      accounts[0],
      _constants.testMultihash.digest1,
      _constants.userHandle1,
      true)

    // add digital_content and validate transaction
    await _lib.addDigitalContentAndValidate(
      digitalContentFactory,
      testDigitalContentId1,
      accounts[0],
      testUserId,
      _constants.testMultihash.digest2,
      _constants.testMultihash.hashFn,
      _constants.testMultihash.size)

    // deploy new DigitalContentStorage contract instance
    let digitalContentStorage2 = await DigitalContentStorage.new(registry.address)

    // upgrade registered DigitalContentStorage
    await registry.upgradeContract(_constants.digitalContentStorageKey, digitalContentStorage2.address)

    // confirm first DigitalContentStorage instance is dead
    _lib.assertNoContractExists(digitalContentStorage.address)

    // add another digital_content and validate transaction
    await _lib.addDigitalContentAndValidate(
      digitalContentFactory,
      testDigitalContentId1,
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
    await _lib.addDigitalContentAndValidate(
      digitalContentFactory,
      testDigitalContentId1,
      accounts[0],
      initialData.userId,
      _constants.testMultihash.digest1,
      _constants.testMultihash.hashFn,
      _constants.testMultihash.size)

    const tx = await _lib.updateDigitalContent(
      digitalContentFactory,
      accounts[0],
      testDigitalContentId1,
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
    assert.isTrue(eventArgs._digitalContentOwnerId.toNumber() === updateData.userId, 'Event argument - expect updated userId')

    // Verify updated contents on chain
    let digitalContentFromChain = await getDigitalContentFromFactory(
      testDigitalContentId1,
      digitalContentFactory)

    assert.isTrue(digitalContentFromChain.digitalContentOwnerId.toNumber() === updateData.userId, 'Expect updated userId on chain')
    assert.isTrue(digitalContentFromChain.multihashDigest === updateData.digest, 'Expect updated digest')
    assert.isTrue(digitalContentFromChain.multihashHashFn.toNumber() === updateData.hashFn, 'Expect updated hash')
    assert.isTrue(digitalContentFromChain.multihashSize.toNumber() === updateData.size, 'Expect updated size')
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
    await _lib.addDigitalContentAndValidate(
      digitalContentFactory,
      testDigitalContentId1,
      accounts[0],
      testUserId,
      _constants.testMultihash.digest2,
      _constants.testMultihash.hashFn,
      _constants.testMultihash.size
    )

    // attempt to update digital_content from different account
    let caughtError = false
    try {
      await _lib.updateDigitalContent(
        digitalContentFactory,
        accounts[1],
        testDigitalContentId1,
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
    await _lib.addDigitalContentAndValidate(
      digitalContentFactory,
      testDigitalContentId1,
      accounts[0],
      testUserId,
      _constants.testMultihash.digest2,
      _constants.testMultihash.hashFn,
      _constants.testMultihash.size)

    // delete digital content
    await _lib.deleteDigitalContentAndValidate(
      digitalContentFactory,
      accounts[0],
      testDigitalContentId1)
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
      await _lib.deleteDigitalContentAndValidate(
        digitalContentFactory,
        accounts[0],
        testDigitalContentId1
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

  it('Should fail to delete digital content due to lack of ownership of digital_content', async () => {
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
    await _lib.addDigitalContentAndValidate(
      digitalContentFactory,
      testDigitalContentId1,
      accounts[0],
      testUserId,
      _constants.testMultihash.digest2,
      _constants.testMultihash.hashFn,
      _constants.testMultihash.size
    )

    // attempt to delete digital content from different account
    let caughtError = false
    try {
      await _lib.deleteDigitalContentAndValidate(
        digitalContentFactory,
        accounts[1],
        testDigitalContentId1
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
      'Failed to handle case where calling address tries to delete digital content it does not own'
    )
  })
})
