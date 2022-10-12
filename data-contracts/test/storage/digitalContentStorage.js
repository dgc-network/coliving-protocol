import * as _lib from '../_lib/lib.js'
import {
  Registry,
  UserStorage,
  UserFactory,
  DigitalContentStorage,
  DigitalContentFactory
} from '../_lib/artifacts.js'
import * as _constants from '../utils/constants'
import { getDigitalContentFromFactory } from '../utils/getters'
import { validateObj } from '../utils/validator'

contract('DigitalContentStorage', async (accounts) => {
  const testUserId = 1
  const testDigitalContentId = 1

  let registry
  let userStorage
  let userFactory
  let digitalContentStorage
  let digitalContentFactory
  let networkId

  beforeEach(async () => {
    registry = await Registry.new()
    networkId = Registry.network_id
    userStorage = await UserStorage.new(registry.address)
    await registry.addContract(_constants.userStorageKey, userStorage.address)
    digitalContentStorage = await DigitalContentStorage.new(registry.address)
    await registry.addContract(_constants.digitalContentStorageKey, digitalContentStorage.address)
    userFactory = await UserFactory.new(registry.address, _constants.userStorageKey, networkId, accounts[5])
    await registry.addContract(_constants.userFactoryKey, userFactory.address)
    digitalContentFactory = await DigitalContentFactory.new(registry.address, _constants.digitalContentStorageKey, _constants.userFactoryKey, networkId)
    await registry.addContract(_constants.digitalContentFactoryKey, digitalContentFactory.address)
  })

  it('Should ensure DigitalContentStorage contents decoupled from DigitalContentFactory instances', async () => {
    // add user to associate digital_content with
    await _lib.addUserAndValidate(
      userFactory,
      testUserId,
      accounts[0],
      _constants.testMultihash.digest1,
      _constants.userHandle1,
      _constants.isCreatorTrue)

    // add digital_content
    await _lib.addDigitalContentAndValidate(
      digitalContentFactory,
      testDigitalContentId,
      accounts[0],
      testUserId,
      _constants.testMultihash.digest2,
      _constants.testMultihash.hashFn,
      _constants.testMultihash.size)

    // kill digitalContentFactory inst
    await _lib.unregisterContractAndValidate(registry, _constants.digitalContentFactoryKey, digitalContentFactory.address)

    // deploy new digitalContentFactory instance
    let newDigitalContentFactory = await DigitalContentFactory.new(registry.address, _constants.digitalContentStorageKey, _constants.userFactoryKey, networkId)
    await registry.addContract(_constants.digitalContentFactoryKey, newDigitalContentFactory.address)
    assert.notEqual(newDigitalContentFactory.address, digitalContentFactory.address, 'Expected different contract instance addresses')

    // retrieve original digital_content through new digitalContentFactory instance
    let digital_content = await getDigitalContentFromFactory(testDigitalContentId, newDigitalContentFactory)

    // validate retrieved digital_content fields match transaction inputs
    validateObj(
      digital_content,
      {
        digitalContentOwnerId: testUserId,
        multihashDigest: _constants.testMultihash.digest2,
        multihashHashFn: _constants.testMultihash.hashFn,
        multihashSize: _constants.testMultihash.size
      }
    )
  })
})
