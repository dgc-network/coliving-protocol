const assert = require('assert')
let helpers = require('./helpers')

let colivingInstance = helpers.colivingInstance

before(async function () {
  await colivingInstance.init()
})

it('should call getContract for creatorStorage key', async function () {
  let address = await colivingInstance.contracts.RegistryClient.getContract('creatorStorage')
  assert.notStrictEqual(address, helpers.constants['0x0'])
})

it('should call getContract for nonexistent key', async function () {
  let address = await colivingInstance.contracts.RegistryClient.getContract('nonexistent')
  // not helpers 0x0 because it's not a bytes32 zero value, different number of 0's
  assert.strictEqual(address, '0x0000000000000000000000000000000000000000')
})
