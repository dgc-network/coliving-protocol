const assert = require('assert')
let helpers = require('./helpers')
let { Utils } = require('../src/utils')

let colivingInstance = helpers.colivingInstance

let digitalContentMultihashDecoded = Utils.decodeMultihash(helpers.constants.digitalContentMetadataCID)
let digitalContentMultihashDecoded2 = Utils.decodeMultihash(helpers.constants.digitalContentMetadataCID2)

let creatorId1
let creatorId2
let digitalContentId1
let digitalContentId2

before(async function () {
  await colivingInstance.init()
})

it('should call getDigitalContent on invalid value and return empty', async function () {
  let digital_content = await colivingInstance.contracts.DigitalContentFactoryClient.getDigitalContent(0)
  assert.strictEqual(digital_content.multihashDigest, helpers.constants['0x0'])
})

it('should call addDigitalContent', async function () {
  // Add creator so we have creatorId
  let handle = 'dheeraj' + Math.floor(Math.random() * 10000000)

  creatorId1 = (await colivingInstance.contracts.UserFactoryClient.addUser(handle)).userId

  if (creatorId1 && Number.isInteger(creatorId1)) {
    digitalContentId1 = (await colivingInstance.contracts.DigitalContentFactoryClient.addDigitalContent(
      creatorId1,
      digitalContentMultihashDecoded.digest,
      digitalContentMultihashDecoded.hashFn,
      digitalContentMultihashDecoded.size
    )).digitalContentId
    let digital_content = await colivingInstance.contracts.DigitalContentFactoryClient.getDigitalContent(digitalContentId1)
    assert.strictEqual(digital_content.multihashDigest, digitalContentMultihashDecoded.digest)
  } else throw new Error('creatorId is not a valid integer')
})

it('should call updateDigitalContent', async function () {
  // Add creator so we have creatorId
  const handle = 'skippy' + Math.floor(Math.random() * 10000000)

  creatorId2 = (await colivingInstance.contracts.UserFactoryClient.addUser(handle)).userId

  if (creatorId2 && Number.isInteger(creatorId2)) {
    // add digital_content
    digitalContentId1 = (await colivingInstance.contracts.DigitalContentFactoryClient.addDigitalContent(
      creatorId2,
      digitalContentMultihashDecoded.digest,
      digitalContentMultihashDecoded.hashFn,
      digitalContentMultihashDecoded.size
    )).digitalContentId
    let digital_content = await colivingInstance.contracts.DigitalContentFactoryClient.getDigitalContent(digitalContentId1)
    assert.strictEqual(digital_content.multihashDigest, digitalContentMultihashDecoded.digest)

    // update digital_content
    await colivingInstance.contracts.DigitalContentFactoryClient.updateDigitalContent(
      digitalContentId1,
      creatorId2,
      digitalContentMultihashDecoded2.digest,
      digitalContentMultihashDecoded2.hashFn,
      digitalContentMultihashDecoded2.size
    )
    digital_content = await colivingInstance.contracts.DigitalContentFactoryClient.getDigitalContent(digitalContentId1)
    assert.strictEqual(digital_content.multihashDigest, digitalContentMultihashDecoded2.digest)
  } else throw new Error('creatorId is not a valid integer')
})

it('should call deleteDigitalContent', async function () {
  // add digital_content
  digitalContentId2 = (await colivingInstance.contracts.DigitalContentFactoryClient.addDigitalContent(
    creatorId2,
    digitalContentMultihashDecoded.digest,
    digitalContentMultihashDecoded.hashFn,
    digitalContentMultihashDecoded.size
  )).digitalContentId
  let digital_content = await colivingInstance.contracts.DigitalContentFactoryClient.getDigitalContent(digitalContentId2)
  assert.strictEqual(digital_content.multihashDigest, digitalContentMultihashDecoded.digest)

  // delete digital content
  let { digitalContentId } = await colivingInstance.contracts.DigitalContentFactoryClient.deleteDigitalContent(digitalContentId2)
  assert.strictEqual(digitalContentId, digitalContentId2)
})
