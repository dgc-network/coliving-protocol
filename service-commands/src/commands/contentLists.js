const fs = require('fs')

const ContentList = {}

ContentList.createContentList = async (
  libs,
  userId,
  contentListName,
  isPrivate,
  isAlbum,
  digitalContentIds
) => {
  const createContentListTxReceipt = await libs.createContentList(
    userId,
    contentListName,
    isPrivate,
    isAlbum,
    digitalContentIds
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

ContentList.addContentListDigitalContent = async (
  libs,
  contentListId,
  digitalContentId
) => {
  return await libs.addContentListDigitalContent(contentListId, digitalContentId)
}

module.exports = ContentList
