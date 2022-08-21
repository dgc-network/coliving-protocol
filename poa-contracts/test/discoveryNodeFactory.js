import * as _constants from './utils/constants'
import * as _validator from './utils/validator'
import { getDiscprovFromFactory } from './utils/getters'
import {
  Registry,
  DiscoveryNodeStorage,
  DiscoveryNodeFactory
} from './_lib/artifacts.js'

contract('DiscoveryNodeFactory', async (accounts) => {
  let endpoints = [
    'lil',
    'dicky',
    'http://discprov.s..co/',
    'http://-discprov-alpha-v2-lb-1680639124.us-west-1.elb.amazonaws.com'
  ]
  let discprovId = 1
  let registry, discoveryNodeStorage, discoveryNodeFactory

  beforeEach(async () => {
    registry = await Registry.new()
    discoveryNodeStorage = await DiscoveryNodeStorage.new(registry.address)
    await registry.addContract(_constants.discoveryNodeStorageKey, discoveryNodeStorage.address)
    discoveryNodeFactory = await DiscoveryNodeFactory.new(registry.address, _constants.discoveryNodeStorageKey)
    await registry.addContract(_constants.discoveryNodeFactoryKey, discoveryNodeFactory.address)
  })

  it('Should register one discovery node', async () => {
    // add discprov
    let tx = await discoveryNodeFactory.register(endpoints[3])

    // validate event output matches transaction input
    let event = _validator.validateDiscprovRegisterEvent(tx, discprovId, accounts[0], endpoints[3])

    // retrieve discprov from contract
    let discprov = await getDiscprovFromFactory(event.discprovId, discoveryNodeFactory)

    // validate retrieved discprov fields match transaction inputs
    _validator.validateRegisteredDiscprov(discprov, accounts[0], endpoints[3])
  })

  it('Should retrieve all registered discovery nodes', async () => {
    // add a bunch of endpoints
    let transactions = []
    let i = 0
    for (i = 0; i < endpoints.length; i++) {
      transactions[i] = await discoveryNodeFactory.register(endpoints[i])
    }

    // validate event outputs match transaction inputs
    for (i = 0; i < endpoints.length; i++) {
      _validator.validateDiscprovRegisterEvent(
        transactions[i],
        i + 1,
        accounts[0],
        endpoints[i]
      )
    }

    // validate total number of discprovs match input number of endpoints
    let totalProviders = await discoveryNodeFactory.getTotalNumberOfProviders.call()
    assert.equal(totalProviders, endpoints.length)

    // retrieve all discprovs from file
    let discProvList = []
    for (i = 0; i < totalProviders; i++) {
      discProvList[i] = await discoveryNodeFactory.getDiscoveryNode(i + 1)
    }

    // validate retrieved discprov list match input list
    for (i = 0; i < endpoints.length; i++) {
      assert.equal(
        discProvList[i][0],
        accounts[0],
        'Expected same discprov wallet address'
      )
      assert.equal(
        discProvList[i][1],
        endpoints[i],
        'Expected same discprov endpoints'
      )
    }
  })
})
