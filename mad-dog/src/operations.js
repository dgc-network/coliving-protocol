// Common operation types for tests.

const OPERATION_TYPE = Object.freeze({
  DIGITAL_CONTENT_UPLOAD: 'DIGITAL_CONTENT_UPLOAD',
  DIGITAL_CONTENT_REPOST: 'DIGITAL_CONTENT_REPOST',
  ADD_CONTENT_LIST_DIGITAL_CONTENT: 'ADD_CONTENT_LIST_DIGITAL_CONTENT',
  CREATE_CONTENT_LIST: 'CREATE_CONTENT_LIST'
})

function DigitalContentUploadRequest (walletIndex, userId) {
  return {
    type: OPERATION_TYPE.DIGITAL_CONTENT_UPLOAD,
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
    type: OPERATION_TYPE.DIGITAL_CONTENT_UPLOAD,
    walletIndex,
    digitalContentId,
    metadata,
    success,
    error
  }
}

function DigitalContentRepostRequest (walletIndex, userId) {
  return {
    type: OPERATION_TYPE.DIGITAL_CONTENT_REPOST,
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
    type: OPERATION_TYPE.DIGITAL_CONTENT_REPOST,
    walletIndex,
    digitalContentId,
    userId,
    success,
    error
  }
}

function AddContentListDigitalContentRequest (walletIndex, userId) {
  return {
    type: OPERATION_TYPE.ADD_CONTENT_LIST_DIGITAL_CONTENT,
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
    type: OPERATION_TYPE.ADD_CONTENT_LIST_DIGITAL_CONTENT,
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
