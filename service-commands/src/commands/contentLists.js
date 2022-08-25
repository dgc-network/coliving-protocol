const fs = require('fs')

const ContentList = {}

ContentList.createContentList = async (
  libs,
  userId,
  contentListName,
  isPrivate,
  isAlbum,
  agreementIds
) => {
  const createContentListTxReceipt = await libs.createContentList(
    userId,
    contentListName,
    isPrivate,
    isAlbum,
    agreementIds
  )
  return createContentListTxReceipt
}

ContentList.uploadContentListCoverPhoto = async (
  libs,
  coverPhotoFilePath
) => {
  const coverPhotoFile = fs.createReadStream(coverPhotoFilePath)
  const dirCid = await libs.uploadContentListCoverPhoto(coverPhotoFile)
  return dirCid
}

ContentList.updateContentListCoverPhoto = async (
  libs,
  contentListId,
  updatedContentListImageMultihashDigest
) => {
  const updateContentListCoverPhotoTxReceipt = await libs.updateContentListCoverPhoto(
    contentListId,
    updatedContentListImageMultihashDigest
  )
  return updateContentListCoverPhotoTxReceipt
}

ContentList.getContentLists = async (
  libs,
  limit = 100,
  offset = 0,
  idsArray = null,
  targetUserId = null,
  withUsers = false
) => {
  return await libs.getContentLists(limit, offset, idsArray, targetUserId, withUsers)
}

ContentList.addContentListAgreement = async (
  libs,
  contentListId,
  agreementId
) => {
  return await libs.addContentListAgreement(contentListId, agreementId)
}

module.exports = ContentList
