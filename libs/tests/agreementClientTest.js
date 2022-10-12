const assert = require('assert')
let helpers = require('./helpers')
let { Utils } = require('../src/utils')

let colivingInstance = helpers.colivingInstance

let agreementMultihashDecoded = Utils.decodeMultihash(helpers.constants.agreementMetadataCID)
let agreementMultihashDecoded2 = Utils.decodeMultihash(helpers.constants.agreementMetadataCID2)

let creatorId1
let creatorId2
let agreementId1
let agreementId2

before(async function () {
  await colivingInstance.init()
})

it('should call getAgreement on invalid value and return empty', async function () {
  let digital_content = await colivingInstance.contracts.AgreementFactoryClient.getAgreement(0)
  assert.strictEqual(digital_content.multihashDigest, helpers.constants['0x0'])
})

it('should call addAgreement', async function () {
  // Add creator so we have creatorId
  let handle = 'dheeraj' + Math.floor(Math.random() * 10000000)

  creatorId1 = (await colivingInstance.contracts.UserFactoryClient.addUser(handle)).userId

  if (creatorId1 && Number.isInteger(creatorId1)) {
    agreementId1 = (await colivingInstance.contracts.AgreementFactoryClient.addAgreement(
      creatorId1,
      agreementMultihashDecoded.digest,
      agreementMultihashDecoded.hashFn,
      agreementMultihashDecoded.size
    )).agreementId
    let digital_content = await colivingInstance.contracts.AgreementFactoryClient.getAgreement(agreementId1)
    assert.strictEqual(digital_content.multihashDigest, agreementMultihashDecoded.digest)
  } else throw new Error('creatorId is not a valid integer')
})

it('should call updateAgreement', async function () {
  // Add creator so we have creatorId
  const handle = 'skippy' + Math.floor(Math.random() * 10000000)

  creatorId2 = (await colivingInstance.contracts.UserFactoryClient.addUser(handle)).userId

  if (creatorId2 && Number.isInteger(creatorId2)) {
    // add digital_content
    agreementId1 = (await colivingInstance.contracts.AgreementFactoryClient.addAgreement(
      creatorId2,
      agreementMultihashDecoded.digest,
      agreementMultihashDecoded.hashFn,
      agreementMultihashDecoded.size
    )).agreementId
    let digital_content = await colivingInstance.contracts.AgreementFactoryClient.getAgreement(agreementId1)
    assert.strictEqual(digital_content.multihashDigest, agreementMultihashDecoded.digest)

    // update digital_content
    await colivingInstance.contracts.AgreementFactoryClient.updateAgreement(
      agreementId1,
      creatorId2,
      agreementMultihashDecoded2.digest,
      agreementMultihashDecoded2.hashFn,
      agreementMultihashDecoded2.size
    )
    digital_content = await colivingInstance.contracts.AgreementFactoryClient.getAgreement(agreementId1)
    assert.strictEqual(digital_content.multihashDigest, agreementMultihashDecoded2.digest)
  } else throw new Error('creatorId is not a valid integer')
})

it('should call deleteAgreement', async function () {
  // add digital_content
  agreementId2 = (await colivingInstance.contracts.AgreementFactoryClient.addAgreement(
    creatorId2,
    agreementMultihashDecoded.digest,
    agreementMultihashDecoded.hashFn,
    agreementMultihashDecoded.size
  )).agreementId
  let digital_content = await colivingInstance.contracts.AgreementFactoryClient.getAgreement(agreementId2)
  assert.strictEqual(digital_content.multihashDigest, agreementMultihashDecoded.digest)

  // delete digital_content
  let { agreementId } = await colivingInstance.contracts.AgreementFactoryClient.deleteAgreement(agreementId2)
  assert.strictEqual(agreementId, agreementId2)
})
