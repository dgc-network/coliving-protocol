const assert = require('assert')
let helpers = require('./helpers')

let colivingInstance = helpers.colivingInstance

before(async function () {
  await colivingInstance.init()
})

it('should verify signature', async function () {
  const address = await colivingInstance.web3Manager.verifySignature(helpers.constants.signatureData, helpers.constants.signature)
  assert.strictEqual(address, helpers.constants.signatureAddress)
})

it('should detect malformed signature', async function () {
  const malformedData = helpers.constants.signatureData.replace('1', '2')
  const address = await colivingInstance.web3Manager.verifySignature(malformedData, helpers.constants.signature)
  assert.notStrictEqual(address, helpers.constants.signatureAddress)
})
