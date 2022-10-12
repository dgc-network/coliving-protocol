const fs = require('fs')
const assert = require('assert')

const DigitalContent = {}

DigitalContent.uploadDigitalContent = async (libs, digitalContentMetadata, digitalContentPath) => {
  const digitalContentFile = fs.createReadStream(digitalContentPath)

  const digitalContentId = await libs.uploadDigitalContent({
    digitalContentFile,
    digitalContentMetadata
  })

  // Wait for discovery node to index user
  await libs.waitForLatestBlock()

  // Check that uploaded digital_content is what we expect
  const uploadedDigitalContentMetadata = await libs.getDigitalContent(digitalContentId)

  const errors = []
  for (const [key, value] of Object.entries(digitalContentMetadata)) {
    try {
      assert.deepStrictEqual(uploadedDigitalContentMetadata[key], value)
    } catch (e) {
      errors.push({ key, expected: value, actual: uploadedDigitalContentMetadata[key] })
    }
  }

  if (errors.length > 0) {
    console.log(
      '[uploadDigitalContent] There are discreptancies from what is uploaded and what is returned.'
    )
    console.log(errors)
  }
  console.log(`Uploaded digitalContentId=${digitalContentId} successfully, `)

  return digitalContentId
}

DigitalContent.repostDigitalContent = async (libs, digitalContentId) => {
  return libs.repostDigitalContent(digitalContentId)
}

DigitalContent.getRepostersForDigitalContent = async (libs, digitalContentId) => {
  return libs.getRepostersForDigitalContent(digitalContentId)
}

DigitalContent.getDigitalContentMetadata = async (libs, digitalContentId) => {
  return libs.getDigitalContent(digitalContentId)
}

DigitalContent.addDigitalContentToChain = async (libs, userId, { digest, hashFn, size }) => {
  const digitalContentTxReceipt = await libs.addDigitalContentToChain(userId, {
    digest,
    hashFn,
    size
  })
  return digitalContentTxReceipt
}

DigitalContent.updateDigitalContentOnChainAndCnode = async (libs, metadata) => {
  const { blockHash, blockNumber, digitalContentId } = await libs.updateDigitalContentOnChainAndCnode(metadata)
  return { blockHash, blockNumber, digitalContentId }
}

DigitalContent.uploadDigitalContentCoverArt = async (libs, imageFilePath) => {
  return libs.uploadDigitalContentCoverArt(imageFilePath)
}

DigitalContent.updateDigitalContentOnChain = async (
  libs,
  digitalContentId,
  userId,
  { digest, hashFn, size }
) => {
  const digitalContentTxReceipt = await libs.updateDigitalContentOnChain(digitalContentId, userId, {
    digest,
    hashFn,
    size
  })

  return digitalContentTxReceipt
}

module.exports = DigitalContent
