import * as _lib from '../_lib/lib.js'
import {
  Registry,
  UserStorage,
  UserFactory,
  AgreementStorage,
  AgreementFactory
} from '../_lib/artifacts.js'
import * as _constants from '../utils/constants'
import { getAgreementFromFactory } from '../utils/getters'
import { validateObj } from '../utils/validator'

contract('AgreementStorage', async (accounts) => {
  const testUserId = 1
  const testAgreementId = 1

  let registry
  let userStorage
  let userFactory
  let agreementStorage
  let agreementFactory
  let networkId

  beforeEach(async () => {
    registry = await Registry.new()
    networkId = Registry.network_id
    userStorage = await UserStorage.new(registry.address)
    await registry.addContract(_constants.userStorageKey, userStorage.address)
    agreementStorage = await AgreementStorage.new(registry.address)
    await registry.addContract(_constants.agreementStorageKey, agreementStorage.address)
    userFactory = await UserFactory.new(registry.address, _constants.userStorageKey, networkId, accounts[5])
    await registry.addContract(_constants.userFactoryKey, userFactory.address)
    agreementFactory = await AgreementFactory.new(registry.address, _constants.agreementStorageKey, _constants.userFactoryKey, networkId)
    await registry.addContract(_constants.agreementFactoryKey, agreementFactory.address)
  })

  it('Should ensure AgreementStorage contents decoupled from AgreementFactory instances', async () => {
    // add user to associate agreement with
    await _lib.addUserAndValidate(
      userFactory,
      testUserId,
      accounts[0],
      _constants.testMultihash.digest1,
      _constants.userHandle1,
      _constants.isCreatorTrue)

    // add agreement
    await _lib.addAgreementAndValidate(
      agreementFactory,
      testAgreementId,
      accounts[0],
      testUserId,
      _constants.testMultihash.digest2,
      _constants.testMultihash.hashFn,
      _constants.testMultihash.size)

    // kill agreementFactory inst
    await _lib.unregisterContractAndValidate(registry, _constants.agreementFactoryKey, agreementFactory.address)

    // deploy new agreementFactory instance
    let newAgreementFactory = await AgreementFactory.new(registry.address, _constants.agreementStorageKey, _constants.userFactoryKey, networkId)
    await registry.addContract(_constants.agreementFactoryKey, newAgreementFactory.address)
    assert.notEqual(newAgreementFactory.address, agreementFactory.address, 'Expected different contract instance addresses')

    // retrieve original agreement through new agreementFactory instance
    let agreement = await getAgreementFromFactory(testAgreementId, newAgreementFactory)

    // validate retrieved agreement fields match transaction inputs
    validateObj(
      agreement,
      {
        agreementOwnerId: testUserId,
        multihashDigest: _constants.testMultihash.digest2,
        multihashHashFn: _constants.testMultihash.hashFn,
        multihashSize: _constants.testMultihash.size
      }
    )
  })
})
