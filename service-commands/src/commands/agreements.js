const fs = require('fs')
const assert = require('assert')

const DigitalContent = {}

DigitalContent.uploadAgreement = async (libs, agreementMetadata, agreementPath) => {
  const agreementFile = fs.createReadStream(agreementPath)

  const agreementId = await libs.uploadAgreement({
    agreementFile,
    agreementMetadata
  })

  // Wait for discovery node to index user
  await libs.waitForLatestBlock()

  // Check that uploaded digital_content is what we expect
  const uploadedAgreementMetadata = await libs.getAgreement(agreementId)

  const errors = []
  for (const [key, value] of Object.entries(agreementMetadata)) {
    try {
      assert.deepStrictEqual(uploadedAgreementMetadata[key], value)
    } catch (e) {
      errors.push({ key, expected: value, actual: uploadedAgreementMetadata[key] })
    }
  }

  if (errors.length > 0) {
    console.log(
      '[uploadAgreement] There are discreptancies from what is uploaded and what is returned.'
    )
    console.log(errors)
  }
  console.log(`Uploaded agreementId=${agreementId} successfully, `)

  return agreementId
}

DigitalContent.repostAgreement = async (libs, agreementId) => {
  return libs.repostAgreement(agreementId)
}

DigitalContent.getRepostersForAgreement = async (libs, agreementId) => {
  return libs.getRepostersForAgreement(agreementId)
}

DigitalContent.getAgreementMetadata = async (libs, agreementId) => {
  return libs.getAgreement(agreementId)
}

DigitalContent.addAgreementToChain = async (libs, userId, { digest, hashFn, size }) => {
  const agreementTxReceipt = await libs.addAgreementToChain(userId, {
    digest,
    hashFn,
    size
  })
  return agreementTxReceipt
}

DigitalContent.updateAgreementOnChainAndCnode = async (libs, metadata) => {
  const { blockHash, blockNumber, agreementId } = await libs.updateAgreementOnChainAndCnode(metadata)
  return { blockHash, blockNumber, agreementId }
}

DigitalContent.uploadAgreementCoverArt = async (libs, imageFilePath) => {
  return libs.uploadAgreementCoverArt(imageFilePath)
}

DigitalContent.updateAgreementOnChain = async (
  libs,
  agreementId,
  userId,
  { digest, hashFn, size }
) => {
  const agreementTxReceipt = await libs.updateAgreementOnChain(agreementId, userId, {
    digest,
    hashFn,
    size
  })

  return agreementTxReceipt
}

module.exports = DigitalContent
