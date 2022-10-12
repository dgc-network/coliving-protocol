// Common operation types for tests.

const OPERATION_TYPE = Object.freeze({
  AGREEMENT_UPLOAD: 'AGREEMENT_UPLOAD',
  AGREEMENT_REPOST: 'AGREEMENT_REPOST',
  ADD_CONTENT_LIST_AGREEMENT: 'ADD_CONTENT_LIST_AGREEMENT',
  CREATE_CONTENT_LIST: 'CREATE_CONTENT_LIST'
})

function DigitalContentUploadRequest (walletIndex, userId) {
  return {
    type: OPERATION_TYPE.AGREEMENT_UPLOAD,
    walletIndex,
    userId
  }
}

function DigitalContentUploadResponse (
  walletIndex,
  digitalContentId,
  metadata,
  success = true,
  error = null
) {
  return {
    type: OPERATION_TYPE.AGREEMENT_UPLOAD,
    walletIndex,
    digitalContentId,
    metadata,
    success,
    error
  }
}

function DigitalContentRepostRequest (walletIndex, userId) {
  return {
    type: OPERATION_TYPE.AGREEMENT_REPOST,
    walletIndex,
    userId
  }
}

function DigitalContentRepostResponse (
  walletIndex,
  digitalContentId,
  userId,
  success = true,
  error = null
) {
  return {
    type: OPERATION_TYPE.AGREEMENT_REPOST,
    walletIndex,
    digitalContentId,
    userId,
    success,
    error
  }
}

function AddContentListDigitalContentRequest (walletIndex, userId) {
  return {
    type: OPERATION_TYPE.ADD_CONTENT_LIST_AGREEMENT,
    walletIndex,
    userId
  }
}

function AddContentListDigitalContentResponse (
  walletIndex,
  digitalContentId,
  success = true,
  error = null
) {
  return {
    type: OPERATION_TYPE.ADD_CONTENT_LIST_AGREEMENT,
    walletIndex,
    digitalContentId,
    success,
    error
  }
}

function CreateContentListRequest (walletIndex, userId) {
  return {
    type: OPERATION_TYPE.CREATE_CONTENT_LIST,
    walletIndex,
    userId
  }
}

function CreateContentListResponse (
  walletIndex,
  contentList,
  userId,
  success = true,
  error = null
) {
  return {
    type: OPERATION_TYPE.CREATE_CONTENT_LIST,
    walletIndex,
    contentList,
    userId,
    success,
    error
  }
}

module.exports = {
  OPERATION_TYPE,
  DigitalContentUploadRequest,
  DigitalContentUploadResponse,
  DigitalContentRepostRequest,
  DigitalContentRepostResponse,
  AddContentListDigitalContentRequest,
  AddContentListDigitalContentResponse,
  CreateContentListRequest,
  CreateContentListResponse
}
