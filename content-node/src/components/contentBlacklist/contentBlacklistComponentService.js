const BlacklistManager = require('../../blacklistManager')
const models = require('../../models')

const types = models.ContentBlacklist.Types

const getAllAgreementIds = async () => {
  const resp = await BlacklistManager.getAllAgreementIds()
  return resp.map((agreementId) => parseInt(agreementId))
}

const getAllContentBlacklist = async () => {
  // Segments stored in the ContentBlacklist may not be associated with a digital_content
  const segmentsFromCBL = await models.ContentBlacklist.findAll({
    attributes: ['value'],
    where: {
      type: types.cid
    },
    raw: true
  })
  const individuallyBlacklistedSegments = segmentsFromCBL.map(
    (entry) => entry.value
  )
  const allSegments = await BlacklistManager.getAllCIDs()
  const blacklistedContent = {
    agreementIds: await BlacklistManager.getAllAgreementIds(),
    userIds: await BlacklistManager.getAllUserIds(),
    individualSegments: individuallyBlacklistedSegments,
    numberOfSegments: allSegments.length,
    allSegments
  }

  return blacklistedContent
}

const addToContentBlacklist = async ({ type, values }) => {
  await BlacklistManager.add({ type, values })
}

const removeFromContentBlacklist = async ({ type, values }) => {
  await BlacklistManager.remove({ type, values })
}

module.exports = {
  getAllContentBlacklist,
  addToContentBlacklist,
  removeFromContentBlacklist,
  getAllAgreementIds
}
